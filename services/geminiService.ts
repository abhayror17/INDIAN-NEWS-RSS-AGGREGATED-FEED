
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiSummaryResponse, TrendReport, PersonalityTrend, SentimentTrendPoint, CategoryTrend, TopicCluster, LocationData } from "../types";

// Initialize Gemini Client
// Note: API Key comes from process.env.API_KEY as per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const summarizeArticle = async (content: string, title: string): Promise<GeminiSummaryResponse> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a helpful news assistant. Please summarize the following article titled "${title}". 
      
      Article Content:
      ${content.slice(0, 10000)} // Limit context to avoid token limits on very large inputs

      Return a JSON object with a brief 'summary' (max 3 sentences), a list of 3-5 'keyPoints', and the overall 'sentiment' (Positive, Neutral, or Negative).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyPoints: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            sentiment: { 
              type: Type.STRING,
              enum: ["Positive", "Neutral", "Negative"]
            }
          },
          required: ["summary", "keyPoints", "sentiment"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeminiSummaryResponse;
    }
    
    throw new Error("No response text from Gemini");
  } catch (error) {
    console.error("Gemini Summarization Error:", error);
    throw error;
  }
};

export const generateTrendReport = async (titles: string[]): Promise<TrendReport[]> => {
    try {
        const joinedTitles = titles.slice(0, 100).join("\n- "); // Limit to top 100 to save tokens
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze the following news headlines and identify the top 3-4 most dominant news topics or trends currently happening.
            
            Headlines:
            - ${joinedTitles}

            For each dominant topic, provide:
            1. 'mainTopic': A short, catchy title for the trend (e.g. "Indigo Crisis", "Election Updates").
            2. 'description': A 1-2 sentence summary of what is happening regarding this topic based on the headlines.
            3. 'keyThemes': A list of 3-4 related keywords or entities involved.
            
            Return a JSON array of these objects.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            mainTopic: { type: Type.STRING },
                            description: { type: Type.STRING },
                            keyThemes: { type: Type.ARRAY, items: { type: Type.STRING }}
                        },
                        required: ["mainTopic", "description", "keyThemes"]
                    }
                }
            }
        });

        if (response.text) {
            return JSON.parse(response.text) as TrendReport[];
        }
        return [];
    } catch (error) {
        console.error("Gemini Trend Analysis Error:", error);
        return [];
    }
};

export const generateTrendingKeywords = async (titles: string[]): Promise<string[]> => {
  try {
      const joinedTitles = titles.slice(0, 100).join("\n- ");

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Analyze the following headlines and extract the top 20 trending keywords, entities, people, or events.
          Focus on proper nouns and significant topics. Exclude generic words like 'news', 'india', 'today', 'latest', 'live', 'update'.
          
          Headlines:
          - ${joinedTitles}

          Return a simple JSON array of strings.`,
          config: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
              }
          }
      });

      if (response.text) {
          return JSON.parse(response.text) as string[];
      }
      return [];
  } catch (error) {
      console.error("Gemini Keyword Extraction Error:", error);
      return [];
  }
};

export const generatePersonalityAnalysis = async (titles: string[]): Promise<PersonalityTrend[]> => {
  try {
    const joinedTitles = titles.slice(0, 100).join("\n- ");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Identify the top 4-6 famous personalities (politicians, business leaders, celebrities, sports stars) mentioned in these headlines.
      
      Headlines:
      - ${joinedTitles}
      
      Return a JSON array where each object has:
      - 'name': The person's name.
      - 'role': Their primary role (e.g., 'Prime Minister', 'Actor').
      - 'context': A very short phrase (max 6 words) explaining why they are in the news.
      - 'sentiment': The general sentiment around them in these news (Positive, Neutral, Negative).
      - 'imageUrl': A direct URL to a publicly available image of this person (e.g. from Wikimedia Commons). If unknown, return empty string.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              role: { type: Type.STRING },
              context: { type: Type.STRING },
              sentiment: { type: Type.STRING, enum: ["Positive", "Neutral", "Negative"] },
              imageUrl: { type: Type.STRING }
            },
            required: ["name", "role", "context", "sentiment", "imageUrl"]
          }
        }
      }
    });
    if (response.text) return JSON.parse(response.text) as PersonalityTrend[];
    return [];
  } catch (error) {
    console.error("Gemini Personality Error", error);
    return [];
  }
};

export const generateSentimentTimeline = async (titlesWithTime: string[]): Promise<SentimentTrendPoint[]> => {
  try {
    const joinedData = titlesWithTime.slice(0, 100).join("\n");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the sentiment of these news headlines over time.
      
      Data (Time - Headline):
      ${joinedData}
      
      1. Divide the time range covered by these articles into 5 equal chronological intervals (e.g. morning, afternoon, or specific dates if range is large).
      2. For each interval, calculate the approximate percentage of Positive, Neutral, and Negative headlines.
      3. Create a short 'timeLabel' for each interval (e.g., "9 AM", "Mon", "Jan").
      
      Return a JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              timeLabel: { type: Type.STRING },
              positive: { type: Type.NUMBER },
              neutral: { type: Type.NUMBER },
              negative: { type: Type.NUMBER }
            },
            required: ["timeLabel", "positive", "neutral", "negative"]
          }
        }
      }
    });
    if (response.text) return JSON.parse(response.text) as SentimentTrendPoint[];
    return [];
  } catch (error) {
    console.error("Gemini Sentiment Timeline Error", error);
    return [];
  }
};

export const generateCategoryAnalysis = async (titles: string[]): Promise<CategoryTrend[]> => {
  try {
    const joinedTitles = titles.slice(0, 100).join("\n- ");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Categorize the following news headlines into these 6 genres: News (General/National), Politics, Sports, Business, Technology, Entertainment.
      
      Headlines:
      - ${joinedTitles}
      
      Return a count of articles for each category in a JSON array.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, enum: ["News", "Politics", "Sports", "Business", "Technology", "Entertainment"] },
              count: { type: Type.NUMBER }
            },
            required: ["category", "count"]
          }
        }
      }
    });
    if (response.text) return JSON.parse(response.text) as CategoryTrend[];
    return [];
  } catch (error) {
    console.error("Gemini Category Analysis Error", error);
    return [];
  }
};

export const generateTopicClusters = async (titles: string[]): Promise<TopicCluster[]> => {
  try {
    const joinedTitles = titles.slice(0, 100).join("\n- ");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Group these news headlines into distinct semantic topic clusters (e.g., "Cricket", "Stock Market", "State Elections", "International Conflict").
      
      Headlines:
      - ${joinedTitles}
      
      Return a JSON array of objects with 'topic' and 'count' (number of headlines in that cluster). Limit to top 8 clusters.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              count: { type: Type.NUMBER }
            },
            required: ["topic", "count"]
          }
        }
      }
    });
    if (response.text) return JSON.parse(response.text) as TopicCluster[];
    return [];
  } catch (error) {
    console.error("Gemini Topic Cluster Error", error);
    return [];
  }
};

export const generateLocationAnalysis = async (titles: string[]): Promise<LocationData[]> => {
  try {
    const joinedTitles = titles.slice(0, 100).join("\n- ");
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract the geographical locations (cities, states, countries) mentioned in these headlines and count their occurrences.
      Ignore generic terms like "India" if specific cities/states are available. Focus on specific hotspots.
      
      Headlines:
      - ${joinedTitles}
      
      Return a JSON array of objects with 'location' and 'count'. Return top 12 locations.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              location: { type: Type.STRING },
              count: { type: Type.NUMBER }
            },
            required: ["location", "count"]
          }
        }
      }
    });
    if (response.text) return JSON.parse(response.text) as LocationData[];
    return [];
  } catch (error) {
    console.error("Gemini Location Analysis Error", error);
    return [];
  }
};
