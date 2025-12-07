import React, { useState, useEffect } from 'react';
import { Article, GeminiSummaryResponse } from '../types';
import { summarizeArticle } from '../services/geminiService';

interface ArticleReaderProps {
  article: Article | null;
  onClose: () => void;
}

const ArticleReader: React.FC<ArticleReaderProps> = ({ article, onClose }) => {
  const [summary, setSummary] = useState<GeminiSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when article changes
    setSummary(null);
    setLoadingSummary(false);
    setError(null);
  }, [article]);

  if (!article) return null;

  const handleSummarize = async () => {
    setLoadingSummary(true);
    setError(null);
    try {
        // Use full content if possible, fallback to description. 
        // We concatenate title + content for better context.
        const textToSummarize = `${article.title}\n\n${article.content}`;
        const result = await summarizeArticle(textToSummarize, article.title);
        setSummary(result);
    } catch (err) {
        setError("Failed to generate summary. Please try again.");
    } finally {
        setLoadingSummary(false);
    }
  };

  const sentimentColor = {
      'Positive': 'bg-green-100 text-green-800',
      'Neutral': 'bg-gray-100 text-gray-800',
      'Negative': 'bg-red-100 text-red-800'
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Slide-over panel */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl overflow-y-auto transform transition-transform animate-slide-in">
        
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-start justify-between">
            <div className="flex-1 pr-4">
                <span className="inline-block px-2 py-1 mb-2 text-xs font-semibold rounded text-white" style={{ backgroundColor: article.feedColor || '#64748b' }}>
                    {article.feedTitle}
                </span>
                <h2 className="text-xl font-bold text-gray-900 leading-snug">{article.title}</h2>
            </div>
            <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="p-6 pb-20">
            {/* Meta */}
            <div className="flex items-center text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100">
                <span>{new Date(article.pubDate).toLocaleString()}</span>
                {article.author && (
                    <>
                        <span className="mx-2">•</span>
                        <span>{article.author}</span>
                    </>
                )}
                <a 
                    href={article.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-auto text-blue-600 hover:underline flex items-center"
                >
                    Visit Source
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
            </div>

             {/* AI Summary Section */}
             <div className="mb-8 bg-indigo-50 rounded-xl p-5 border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-indigo-900 font-semibold flex items-center">
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z" fill="currentColor"/></svg>
                        AI Insights
                    </h3>
                    {!summary && !loadingSummary && (
                        <button 
                            onClick={handleSummarize}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all flex items-center"
                        >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            Summarize with Gemini
                        </button>
                    )}
                </div>

                {loadingSummary && (
                    <div className="space-y-3 animate-pulse">
                        <div className="h-4 bg-indigo-200 rounded w-3/4"></div>
                        <div className="h-4 bg-indigo-200 rounded w-full"></div>
                        <div className="h-4 bg-indigo-200 rounded w-5/6"></div>
                    </div>
                )}

                {error && (
                    <p className="text-red-600 text-sm">{error}</p>
                )}

                {summary && (
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center mb-2">
                                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mr-2">Summary</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sentimentColor[summary.sentiment] || 'bg-gray-100'}`}>
                                    {summary.sentiment} Sentiment
                                </span>
                            </div>
                            <p className="text-gray-800 text-sm leading-relaxed">{summary.summary}</p>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-2">Key Points</span>
                            <ul className="list-disc list-inside space-y-1">
                                {summary.keyPoints.map((point, idx) => (
                                    <li key={idx} className="text-gray-700 text-sm">{point}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="prose prose-blue max-w-none">
                {/* Image if available */}
                {article.thumbnail && (
                    <img src={article.thumbnail} alt={article.title} className="w-full h-auto rounded-lg mb-6 object-cover max-h-[400px]" />
                )}
                
                {/* Render HTML content safely */}
                <div 
                    dangerouslySetInnerHTML={{ __html: article.content }} 
                    className="article-content"
                />
            </div>
        </div>
      </div>
      <style>{`
        .article-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
        .article-content p { margin-bottom: 1rem; line-height: 1.7; color: #334155; }
        .article-content a { color: #2563eb; text-decoration: underline; }
        .article-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
      `}</style>
    </div>
  );
};

export default ArticleReader;
