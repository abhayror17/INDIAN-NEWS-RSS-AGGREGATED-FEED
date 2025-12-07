
import { Article, Feed } from '../types';
import { PLACEHOLDER_IMAGE } from '../constants';

// List of proxies to try in order
const PROXIES = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` 
];

// Helper to fetch with timeout
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

// Fallback to rss2json if XML parsing fails or proxies are blocked
const fetchWithRss2Json = async (feed: Feed): Promise<Article[]> => {
    try {
        const response = await fetchWithTimeout(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
        const data = await response.json();
        
        if (data.status !== 'ok') throw new Error('rss2json failed');

        return data.items.map((item: any) => ({
            id: item.guid || item.link || Math.random().toString(36).substr(2, 9),
            feedId: feed.id,
            feedTitle: feed.title,
            feedColor: feed.color,
            title: item.title,
            link: item.link || '',
            content: item.content || item.description,
            contentSnippet: stripHtml(item.description || item.content).slice(0, 150) + '...',
            pubDate: item.pubDate,
            isoDate: new Date(item.pubDate).toISOString(),
            thumbnail: item.thumbnail || extractImageFromContent(item.content || item.description),
            author: item.author
        }));
    } catch (error) {
        // console.warn(`rss2json attempt failed for ${feed.title}`, error);
        return [];
    }
};

const stripHtml = (html: string) => {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

const extractImageFromContent = (content: string): string => {
    if (!content) return "";
    
    // Find all image sources
    const imgRex = /<img[^>]+src="([^">]+)"/g;
    const images: string[] = [];
    let match;
    while ((match = imgRex.exec(content)) !== null) {
        images.push(match[1]);
    }

    // Filter out known bad images (trackers, ads)
    const validImages = images.filter(url => {
        const lower = url.toLowerCase();
        // Skip common tracking pixels and ad servers
        if (
            lower.includes('feedburner') || 
            lower.includes('doubleclick') || 
            lower.includes('/ad/') || 
            lower.includes('ads.') ||
            lower.includes('pixel') || 
            lower.includes('emoji') ||
            lower.includes('smilies')
        ) {
            return false;
        }
        return true;
    });

    if (validImages.length === 0) return "";

    // Priority 1: Prefer GIFs if user requested
    const gif = validImages.find(img => img.toLowerCase().endsWith('.gif'));
    if (gif) return gif;

    // Priority 2: Return first valid image
    return validImages[0];
}

export const fetchFeed = async (feed: Feed): Promise<Article[]> => {
  let lastError;
  
  // 1. Try Standard XML Proxies
  for (const proxyGen of PROXIES) {
      try {
        const response = await fetchWithTimeout(proxyGen(feed.url));
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        
        const text = await response.text();
        
        // Basic check to ensure we didn't get an HTML error page from the proxy
        if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html')) {
             throw new Error("Received HTML instead of XML");
        }

        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        
        const errorNode = xml.querySelector('parsererror');
        if (errorNode) throw new Error('XML Parsing Error');

        // Determine if RSS or Atom
        let items = Array.from(xml.querySelectorAll('item'));
        const isAtom = items.length === 0 && (xml.querySelector('entry') !== null);
        
        if (isAtom) {
          items = Array.from(xml.querySelectorAll('entry'));
        }
        
        if (items.length === 0) throw new Error("No items found");
        
        return items.map((item) => {
          let title = '', link = '', pubDate = '', description = '', content = '', author = '';

          if (isAtom) {
            title = item.querySelector('title')?.textContent || 'No Title';
            link = item.querySelector('link[rel="alternate"]')?.getAttribute('href') || item.querySelector('link')?.getAttribute('href') || '';
            pubDate = item.querySelector('published')?.textContent || item.querySelector('updated')?.textContent || '';
            description = item.querySelector('summary')?.textContent || '';
            content = item.querySelector('content')?.textContent || description;
            author = item.querySelector('author > name')?.textContent || '';
          } else {
            // RSS 2.0
            title = item.querySelector('title')?.textContent || 'No Title';
            link = item.querySelector('link')?.textContent || '';
            pubDate = item.querySelector('pubDate')?.textContent || '';
            description = item.querySelector('description')?.textContent || '';
            const contentEncoded = item.getElementsByTagNameNS('*', 'encoded')[0]?.textContent || '';
            content = contentEncoded.length > description.length ? contentEncoded : description;
            author = item.querySelector('creator')?.textContent || item.querySelector('author')?.textContent || '';
          }

          // Image Extraction Logic
          let thumbnail = '';
          
          // 1. Check Media Content (RSS/Atom Media extension)
          const mediaContent = item.getElementsByTagNameNS('*', 'content');
          if (mediaContent.length > 0) {
              for(let i=0; i<mediaContent.length; i++) {
                 const type = mediaContent[i].getAttribute('type');
                 const url = mediaContent[i].getAttribute('url');
                 if (url && (!type || type.startsWith('image'))) {
                     thumbnail = url;
                     // Prefer GIFs immediately if found here
                     if (url.toLowerCase().endsWith('.gif')) break;
                 }
              }
          }

          // 2. Check Enclosure
          if (!thumbnail || !thumbnail.toLowerCase().endsWith('.gif')) {
              const enclosure = item.querySelector('enclosure');
              if (enclosure) {
                  const type = enclosure.getAttribute('type');
                  if (type && type.startsWith('image')) {
                      const encUrl = enclosure.getAttribute('url') || '';
                      // If we already have a thumbnail, only overwrite if this is a GIF (preference)
                      if (!thumbnail || encUrl.toLowerCase().endsWith('.gif')) {
                          thumbnail = encUrl;
                      }
                  }
              }
          }
          
          // 3. Check Media Thumbnail
          if (!thumbnail || !thumbnail.toLowerCase().endsWith('.gif')) {
              const mediaThumbnail = item.getElementsByTagNameNS('*', 'thumbnail')[0];
              if (mediaThumbnail) {
                  const thumbUrl = mediaThumbnail.getAttribute('url') || '';
                  if (!thumbnail || thumbUrl.toLowerCase().endsWith('.gif')) {
                      thumbnail = thumbUrl;
                  }
              }
          }

          // 4. Fallback: Parse HTML for first image (Prioritize GIF if inside content)
          if (!thumbnail || !thumbnail.toLowerCase().endsWith('.gif')) {
              const contentImage = extractImageFromContent(content || description);
              if (contentImage) {
                   // If we already have a static image but content has a GIF, take the GIF
                   if (!thumbnail || contentImage.toLowerCase().endsWith('.gif')) {
                       thumbnail = contentImage;
                   }
              }
          }

          const cleanSnippet = stripHtml(description || content);

          return {
            id: link || Math.random().toString(36).substr(2, 9),
            feedId: feed.id,
            feedTitle: feed.title,
            feedColor: feed.color,
            title,
            link: link || '',
            content: content || description,
            contentSnippet: cleanSnippet.slice(0, 150) + (cleanSnippet.length > 150 ? '...' : ''),
            pubDate,
            isoDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            thumbnail: thumbnail,
            author: author
          };
        });
      } catch (error) {
        lastError = error;
        // Continue to next proxy
      }
  }

  // 2. Final Fallback: rss2json
  // If all XML proxies fail, try rss2json which handles parsing server-side
  const rss2jsonResult = await fetchWithRss2Json(feed);
  if (rss2jsonResult.length > 0) {
      return rss2jsonResult;
  }

  // console.error(`Error fetching feed ${feed.title} after all attempts:`, lastError);
  return [];
};
