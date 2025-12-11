
import React, { useState, useEffect, useMemo } from 'react';
import { Article, TrendTopic, TrendReport, PersonalityTrend, SentimentTrendPoint } from '../types';
import { STOP_WORDS } from '../constants';
import { generateTrendReport, generateTrendingKeywords, generatePersonalityAnalysis, generateSentimentTimeline } from '../services/geminiService';
import ArticleCard from './ArticleCard';

interface TrendsDashboardProps {
    articles: Article[];
    onArticleClick: (article: Article) => void;
}

const TrendsDashboard: React.FC<TrendsDashboardProps> = ({ articles, onArticleClick }) => {
    const [trendTopics, setTrendTopics] = useState<TrendTopic[]>([]);
    const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
    
    // AI Data States
    const [aiReport, setAiReport] = useState<TrendReport[] | null>(null);
    const [aiKeywords, setAiKeywords] = useState<string[]>([]);
    const [personalities, setPersonalities] = useState<PersonalityTrend[]>([]);
    const [sentimentTimeline, setSentimentTimeline] = useState<SentimentTrendPoint[]>([]);
    const [loadingAi, setLoadingAi] = useState(false);

    // Calculate trends locally on mount or when articles change
    useEffect(() => {
        if (articles.length === 0) return;

        // 1. Calculate Keyword Trends
        const calculateTrends = (sourceArticles: Article[]) => {
            const words: Record<string, { count: number; articles: Article[] }> = {};

            sourceArticles.forEach(article => {
                const text = `${article.title} ${article.contentSnippet || ''}`.toLowerCase();
                const tokens = new Set(text.replace(/[^\w\s]/g, '').split(/\s+/));

                tokens.forEach(token => {
                    if (token.length > 2 && !STOP_WORDS.has(token) && isNaN(Number(token))) {
                        if (!words[token]) {
                            words[token] = { count: 0, articles: [] };
                        }
                        words[token].count++;
                        words[token].articles.push(article);
                    }
                });
            });

            return Object.entries(words)
                .map(([keyword, data]) => ({
                    keyword: keyword.charAt(0).toUpperCase() + keyword.slice(1),
                    count: data.count,
                    relatedArticles: data.articles
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 30);
        };

        setTrendTopics(calculateTrends(articles));

    }, [articles]);

    const handleGenerateAiReport = async () => {
        setLoadingAi(true);
        try {
            const latestArticles = articles.slice(0, 80);
            const titles = latestArticles.map(a => a.title);
            const timedTitles = latestArticles.map(a => {
                const date = new Date(a.isoDate);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric' });
                return `[${timeStr}] ${a.title}`;
            });

            const [report, keywords, people, timeline] = await Promise.all([
                generateTrendReport(titles),
                generateTrendingKeywords(titles),
                generatePersonalityAnalysis(titles),
                generateSentimentTimeline(timedTitles)
            ]);

            setAiReport(report);
            setAiKeywords(keywords);
            setPersonalities(people);
            setSentimentTimeline(timeline);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAi(false);
        }
    };

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
                            <h3 className="text-lg font-bold text-gray-900">AI Daily Briefing & Intelligence</h3>
                            <p className="text-sm text-gray-500">Generative report, personality tracking, and sentiment analysis</p>
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
                    <div className="space-y-8 animate-fade-in">
                        {/* 1. Topics Report */}
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
                        
                        {/* 2. Famous Personalities */}
                        {personalities.length > 0 && (
                            <div>
                                <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    Famous Personalities Trending
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    {personalities.map((person, idx) => (
                                        <div key={idx} className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm flex flex-col items-center text-center hover:shadow-md transition-shadow">
                                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-lg mb-3">
                                                {person.name.charAt(0)}
                                            </div>
                                            <h5 className="font-bold text-gray-900">{person.name}</h5>
                                            <span className="text-xs text-gray-500 mb-2">{person.role}</span>
                                            <p className="text-xs text-gray-600 italic mb-2">"{person.context}"</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Sentiment Analysis Timeline */}
                        {sentimentTimeline.length > 0 && (
                            <div>
                                <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                                    Sentiment Analysis Over Time
                                </h4>
                                <div className="bg-white border border-gray-100 rounded-lg p-6">
                                    <div className="flex items-end space-x-2 sm:space-x-8 h-48">
                                        {sentimentTimeline.map((point, idx) => (
                                            <div key={idx} className="flex-1 flex flex-col h-full justify-end group relative min-w-[50px]">
                                                {/* Tooltip */}
                                                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-32 text-center pointer-events-none">
                                                    Pos: {point.positive}%<br/>Neu: {point.neutral}%<br/>Neg: {point.negative}%
                                                </div>
                                                
                                                {/* Stacked Bar */}
                                                <div className="w-full flex flex-col-reverse rounded-t-md overflow-hidden bg-gray-100 h-full relative">
                                                     {/* Negative */}
                                                    <div style={{height: `${point.negative}%`}} className="w-full bg-red-400 transition-all duration-1000"></div>
                                                     {/* Neutral */}
                                                    <div style={{height: `${point.neutral}%`}} className="w-full bg-gray-300 transition-all duration-1000"></div>
                                                    {/* Positive */}
                                                    <div style={{height: `${point.positive}%`}} className="w-full bg-green-400 transition-all duration-1000"></div>
                                                </div>
                                                <span className="text-xs text-gray-500 mt-3 text-center truncate w-full block">{point.timeLabel}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-center mt-4 space-x-6 text-xs">
                                        <div className="flex items-center"><span className="w-3 h-3 bg-green-400 rounded-sm mr-2"></span>Positive</div>
                                        <div className="flex items-center"><span className="w-3 h-3 bg-gray-300 rounded-sm mr-2"></span>Neutral</div>
                                        <div className="flex items-center"><span className="w-3 h-3 bg-red-400 rounded-sm mr-2"></span>Negative</div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                ) : (
                    !loadingAi && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <p className="text-gray-500 text-sm">Tap "Generate Report" to let Gemini analyze headlines, find personalities, and track sentiment.</p>
                        </div>
                    )
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
