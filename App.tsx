
import React, { useState, useEffect, useMemo, useRef } from 'react';
import FeedSidebar from './components/FeedSidebar';
import ArticleCard from './components/ArticleCard';
import ArticleReader from './components/ArticleReader';
import AddFeedDialog from './components/AddFeedDialog';
import TrendsDashboard from './components/TrendsDashboard';
import { Feed, Article } from './types';
import { INITIAL_FEEDS } from './constants';
import { fetchFeed } from './services/rssService';

type ViewType = 'feed' | 'trends';

function App() {
  const [feeds, setFeeds] = useState<Feed[]>(() => {
      const saved = localStorage.getItem('pulse_feeds_v7');
      return saved ? JSON.parse(saved) : INITIAL_FEEDS;
  });
  
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState<ViewType>('feed');

  // Prevent double firing in React 18 strict mode
  const loadedRef = useRef(false);

  // Persist feeds
  useEffect(() => {
    localStorage.setItem('pulse_feeds_v7', JSON.stringify(feeds));
  }, [feeds]);

  // Fetch feeds with batching and incremental updates
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const loadFeeds = async () => {
      setLoading(true);
      setLoadingProgress(0);
      
      const BATCH_SIZE = 6;
      let allLoadedArticles: Article[] = [];
      const seenUrls = new Set<string>();

      // Helper to process and deduplicate a batch
      const processArticles = (newArticles: Article[]) => {
          const uniqueNewArticles: Article[] = [];
          
          for (const article of newArticles) {
            let normalizedUrl = article.link;
            try {
                if (!article.link) throw new Error("No link");
                const urlObj = new URL(article.link);
                const paramsToCheck = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'rss'];
                const searchParams = new URLSearchParams(urlObj.search);
                paramsToCheck.forEach(p => searchParams.delete(p));
                urlObj.search = searchParams.toString();
                let cleanLink = urlObj.toString();
                if (cleanLink.endsWith('/')) cleanLink = cleanLink.slice(0, -1);
                normalizedUrl = cleanLink;
            } catch (e) {
                normalizedUrl = (article.title || '').trim().toLowerCase();
            }

            if (normalizedUrl && !seenUrls.has(normalizedUrl)) {
                seenUrls.add(normalizedUrl);
                uniqueNewArticles.push(article);
            }
          }
          return uniqueNewArticles;
      };

      // Batch Processing
      for (let i = 0; i < feeds.length; i += BATCH_SIZE) {
        const batch = feeds.slice(i, i + BATCH_SIZE);
        
        try {
            const results = await Promise.all(batch.map(feed => fetchFeed(feed)));
            const batchArticles = results.flat();
            
            const uniqueBatch = processArticles(batchArticles);
            allLoadedArticles = [...allLoadedArticles, ...uniqueBatch];
            
            // Sort by date
            allLoadedArticles.sort((a, b) => 
                new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
            );

            // Update state incrementally
            setArticles([...allLoadedArticles]);
            setLoadingProgress(Math.round(((i + BATCH_SIZE) / feeds.length) * 100));

            // If we have some articles, turn off the main spinner so user can start reading
            if (allLoadedArticles.length > 0 && i === 0) {
                setLoading(false);
            }
        } catch (err) {
            console.error("Error fetching batch", err);
        }
      }

      setLoading(false);
      setLoadingProgress(100);
    };

    loadFeeds();
  }, [feeds]);

  // Filter articles
  const filteredArticles = useMemo(() => {
    let filtered = articles;
    if (selectedFeedId) {
      filtered = filtered.filter(a => a.feedId === selectedFeedId);
    }
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(lower) || 
        a.contentSnippet.toLowerCase().includes(lower)
      );
    }
    return filtered;
  }, [articles, selectedFeedId, searchTerm]);

  const handleAddFeed = (url: string, name: string) => {
    const newFeed: Feed = {
      id: Math.random().toString(36).substr(2, 9),
      url,
      title: name,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}` 
    };
    setFeeds(prev => [...prev, newFeed]);
    loadedRef.current = false; // Trigger reload for new feed
  };

  const handleRemoveFeed = (id: string) => {
    if (confirm('Are you sure you want to remove this feed?')) {
      setFeeds(prev => prev.filter(f => f.id !== id));
      if (selectedFeedId === id) setSelectedFeedId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-slate-800">
      <FeedSidebar 
        feeds={feeds}
        selectedFeedId={selectedFeedId}
        currentView={currentView}
        onSelectFeed={setSelectedFeedId}
        onSelectView={setCurrentView}
        onAddFeed={() => setIsAddModalOpen(true)}
        onRemoveFeed={handleRemoveFeed}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden mr-4 p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="flex flex-col">
                <h2 className="text-xl font-semibold text-gray-800">
                {currentView === 'trends' ? 'Trends & Insights' : (
                    selectedFeedId 
                        ? feeds.find(f => f.id === selectedFeedId)?.title || 'Feed' 
                        : 'Latest News'
                )}
                </h2>
                {loadingProgress > 0 && loadingProgress < 100 && (
                     <span className="text-xs text-blue-500 font-medium animate-pulse">
                         Updating Feeds... {Math.min(loadingProgress, 99)}%
                     </span>
                )}
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full max-w-xs ml-4">
            {currentView === 'feed' && (
                <div className="relative w-full">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
                        placeholder="Search articles..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {loading && articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Fetching latest stories...</p>
                <p className="text-xs text-gray-400">This may take a moment</p>
            </div>
          ) : (
             <>
               {currentView === 'trends' ? (
                   <TrendsDashboard articles={articles} onArticleClick={setSelectedArticle} />
               ) : (
                   /* Feed View */
                   <div className="p-4 sm:p-6 lg:p-8 pb-20">
                       {filteredArticles.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="inline-block p-4 rounded-full bg-gray-100 mb-4">
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900">No articles found</h3>
                                <p className="mt-1 text-gray-500">Try adjusting your search or check your connection.</p>
                            </div>
                       ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredArticles.map((article) => (
                                    <ArticleCard 
                                        key={article.id} 
                                        article={article} 
                                        onClick={setSelectedArticle} 
                                    />
                                ))}
                            </div>
                       )}
                   </div>
               )}
             </>
          )}
        </main>
        
        {/* Github Floating Link */}
        <a 
          href="https://github.com/abhayror17" 
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200 text-gray-800 hover:scale-110 hover:shadow-xl transition-all duration-300 group"
          title="Developed by Abhay"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
        </a>
      </div>

      <ArticleReader 
        article={selectedArticle} 
        onClose={() => setSelectedArticle(null)} 
      />

      <AddFeedDialog 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddFeed}
      />
    </div>
  );
}

export default App;
