
import React, { useState, useEffect, useMemo } from 'react';
import { Article, TrendTopic, TrendReport } from '../types';
import { STOP_WORDS } from '../constants';
import { generateTrendReport, generateTrendingKeywords } from '../services/geminiService';
import ArticleCard from './ArticleCard';

interface TrendsDashboardProps {
    articles: Article[];
    onArticleClick: (article: Article) => void;
}

const TrendsDashboard: React.FC<TrendsDashboardProps> = ({ articles, onArticleClick }) => {
    const [trendTopics, setTrendTopics] = useState<TrendTopic[]>([]);
    const [recentTrendTopics, setRecentTrendTopics] = useState<TrendTopic[]>([]);
    const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
    const [aiReport, setAiReport] = useState<TrendReport[] | null>(null);
    const [aiKeywords, setAiKeywords] = useState<string[]>([]);
    const [loadingAi, setLoadingAi] = useState(false);

    // Calculate trends locally on mount or when articles change
    useEffect(() => {
        if (articles.length === 0) return;

        const calculateTrends = (sourceArticles: Article[]) => {
            const words: Record<string, { count: number; articles: Article[] }> = {};

            sourceArticles.forEach(article => {
                // Combine title and snippet for analysis
                const text = `${article.title} ${article.contentSnippet || ''}`.toLowerCase();
                // Remove special characters and split
                const tokens = text.replace(/[^\w\s]/g, '').split(/\s+/);

                const uniqueTokensInArticle = new Set(tokens); // Count a word only once per article to measure spread

                uniqueTokensInArticle.forEach(token => {
                    if (token.length > 2 && !STOP_WORDS.has(token) && isNaN(Number(token))) {
                        if (!words[token]) {
                            words[token] = { count: 0, articles: [] };
                        }
                        words[token].count++;
                        words[token].articles.push(article);
                    }
                });
            });

            // Convert to array and sort
            return Object.entries(words)
                .map(([keyword, data]) => ({
                    keyword: keyword.charAt(0).toUpperCase() + keyword.slice(1),
                    count: data.count,
                    relatedArticles: data.articles
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 30); // Top 30 keywords
        };

        // 1. All Time Trends (based on all loaded articles)
        setTrendTopics(calculateTrends(articles));

        // 2. Recent Trends (Past 1 Hour)
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
        
        const recentArticles = articles.filter(a => {
            // Use isoDate if available, otherwise assume current time if missing (fallback)
            const pubDate = a.isoDate ? new Date(a.isoDate) : new Date();
            return pubDate >= oneHourAgo;
        });

        setRecentTrendTopics(calculateTrends(recentArticles));

    }, [articles]);

    const handleGenerateAiReport = async () => {
        setLoadingAi(true);
        try {
            // Send top 80 titles
            const titles = articles.slice(0, 80).map(a => a.title);
            
            // Run both report generation and keyword extraction in parallel
            const [report, keywords] = await Promise.all([
                generateTrendReport(titles),
                generateTrendingKeywords(titles)
            ]);
            
            setAiReport(report);
            setAiKeywords(keywords);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAi(false);
        }
    };

    // Filter articles based on selected keyword (either local or AI)
    const filteredArticles = useMemo(() => {
        if (!selectedKeyword) return [];
        const lowerKey = selectedKeyword.toLowerCase();
        return articles.filter(a => 
            a.title.toLowerCase().includes(lowerKey) || 
            a.contentSnippet.toLowerCase().includes(lowerKey)
        );
    }, [selectedKeyword, articles]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Trends & Insights</h2>
                <p className="text-gray-500">Analyze the pulse of the news with keyword frequency and AI insights.</p>
            </header>

            {/* AI Insight Section */}
            <section className="mb-10 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg mr-4">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">AI Daily Briefing & Keywords</h3>
                            <p className="text-sm text-gray-500">Generative summary and smart keyword extraction</p>
                        </div>
                    </div>
                    {!aiReport && (
                         <button 
                            onClick={handleGenerateAiReport}
                            disabled={loadingAi}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                         >
                            {loadingAi ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Analyzing...
                                </>
                            ) : (
                                'Generate Report'
                            )}
                         </button>
                    )}
                </div>

                {aiReport ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {aiReport.map((topic, idx) => (
                            <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-purple-200 transition-colors">
                                <h4 className="font-bold text-gray-800 mb-2">{topic.mainTopic}</h4>
                                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{topic.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    {topic.keyThemes.map((theme, i) => (
                                        <span key={i} className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-1 rounded-md">
                                            #{theme}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !loadingAi && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-gray-500 text-sm">Tap "Generate Report" to let Gemini analyze headlines for you.</p>
                        </div>
                    )
                )}
            </section>

             {/* Recent Trends (Past 1 Hr) Section */}
             <section className="mb-8">
                <div className="flex items-center mb-4 space-x-2">
                    <h3 className="text-lg font-bold text-gray-900">Trending Now (Past 1 Hr)</h3>
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                </div>
                
                {recentTrendTopics.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                        {recentTrendTopics.map((topic) => (
                            <button
                                key={`recent-${topic.keyword}`}
                                onClick={() => setSelectedKeyword(topic.keyword === selectedKeyword ? null : topic.keyword)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                                    selectedKeyword === topic.keyword
                                        ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-105'
                                        : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100 hover:border-red-300'
                                }`}
                            >
                                {topic.keyword}
                                <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                                    selectedKeyword === topic.keyword ? 'bg-red-500 text-white' : 'bg-white text-red-600 border border-red-200'
                                }`}>
                                    {topic.count}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-sm text-gray-500">
                        No breaking trends detected in the last hour.
                    </div>
                )}
            </section>

            {/* Local Keyword Cloud Section */}
            <section className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Trending Keywords (All Time)</h3>
                <div className="flex flex-wrap gap-3">
                    {trendTopics.map((topic) => (
                        <button
                            key={topic.keyword}
                            onClick={() => setSelectedKeyword(topic.keyword === selectedKeyword ? null : topic.keyword)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                selectedKeyword === topic.keyword
                                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-blue-300'
                            }`}
                        >
                            {topic.keyword}
                            <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                                selectedKeyword === topic.keyword ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {topic.count}
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            {/* AI Keyword Cloud Section */}
            {aiKeywords.length > 0 && (
                 <section className="mb-8 animate-fade-in">
                    <h3 className="text-lg font-bold text-indigo-900 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-indigo-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V13H11V7ZM11 15H13V17H11V15Z" fill="currentColor"/></svg>
                        AI Curated Keywords
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {aiKeywords.map((keyword) => (
                            <button
                                key={keyword}
                                onClick={() => setSelectedKeyword(keyword === selectedKeyword ? null : keyword)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                                    selectedKeyword === keyword
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-300'
                                }`}
                            >
                                {keyword}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Drill Down Section */}
            {selectedKeyword && (
                <section className="animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                         <h3 className="text-lg font-bold text-gray-900">
                            News mentioning <span className="text-blue-600">"{selectedKeyword}"</span>
                        </h3>
                        <button 
                            onClick={() => setSelectedKeyword(null)}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Clear Filter
                        </button>
                    </div>
                   
                    {filteredArticles.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredArticles.map(article => (
                                <ArticleCard 
                                    key={article.id} 
                                    article={article} 
                                    onClick={onArticleClick} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">No specific articles found matching "{selectedKeyword}" in the currently loaded feed.</p>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default TrendsDashboard;
