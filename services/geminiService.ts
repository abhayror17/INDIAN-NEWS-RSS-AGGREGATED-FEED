
import { GoogleGenAI, Type } from "@google/genai";
import { GeminiSummaryResponse, TrendReport } from "../types";

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
