
import React, { useState, useEffect, useMemo } from 'react';
import { Article, TrendReport, PersonalityTrend, SentimentTrendPoint, CategoryTrend, TopicCluster, LocationData } from '../types';
import { generateTrendReport, generatePersonalityAnalysis, generateSentimentTimeline, generateCategoryAnalysis, generateTopicClusters, generateLocationAnalysis } from '../services/geminiService';

interface AnalyticsDashboardProps {
    articles: Article[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ articles }) => {
    const [aiReport, setAiReport] = useState<TrendReport[] | null>(null);
    const [personalities, setPersonalities] = useState<PersonalityTrend[]>([]);
    const [sentimentTimeline, setSentimentTimeline] = useState<SentimentTrendPoint[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryTrend[]>([]);
    const [topicClusters, setTopicClusters] = useState<TopicCluster[]>([]);
    const [locationData, setLocationData] = useState<LocationData[]>([]);
    const [loading, setLoading] = useState(false);

    // Calculate Feed Source Stats locally
    const feedStats = useMemo(() => {
        const counts: Record<string, number> = {};
        articles.forEach(a => {
            const source = a.feedTitle || 'Unknown Source';
            counts[source] = (counts[source] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([source, count]) => ({ source, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10
    }, [articles]);

    const handleRunAnalysis = async () => {
        if (articles.length === 0) return;
        setLoading(true);
        try {
            const latestArticles = articles.slice(0, 100);
            const titles = latestArticles.map(a => a.title);
            const timedTitles = latestArticles.map(a => {
                const date = new Date(a.isoDate);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric' });
                return `[${timeStr}] ${a.title}`;
            });

            const [reportRes, peopleRes, timelineRes, catRes, clusterRes, locRes] = await Promise.all([
                generateTrendReport(titles),
                generatePersonalityAnalysis(titles),
                generateSentimentTimeline(timedTitles),
                generateCategoryAnalysis(titles),
                generateTopicClusters(titles),
                generateLocationAnalysis(titles)
            ]);

            setAiReport(reportRes);
            setPersonalities(peopleRes);
            setSentimentTimeline(timelineRes);
            setCategoryData(catRes);
            setTopicClusters(clusterRes);
            setLocationData(locRes);
        } catch (e) {
            console.error("Analytics Error", e);
        } finally {
            setLoading(false);
        }
    };

    // Helper for SVG Chart Points
    const getPolylinePoints = (data: SentimentTrendPoint[], key: 'positive' | 'neutral' | 'negative', height: number, width: number) => {
        if (data.length === 0) return "";
        const dx = width / (data.length - 1);
        return data.map((point, index) => {
            const x = index * dx;
            const y = height - (point[key] / 100 * height);
            return `${x},${y}`;
        }).join(" ");
    };

    const sentimentColorMap = {
        'Positive': 'text-green-600 bg-green-50 border-green-200',
        'Neutral': 'text-gray-600 bg-gray-50 border-gray-200',
        'Negative': 'text-red-600 bg-red-50 border-red-200'
    };

    const categoryColors: Record<string, string> = {
        "News": "#3b82f6",
        "Sports": "#ef4444",
        "Politics": "#f97316",
        "Business": "#a855f7",
        "Technology": "#10b981",
        "Entertainment": "#ec4899"
    };

    // Helper to determine heatmap color intensity
    const getHeatmapColor = (count: number, max: number) => {
        const ratio = count / max;
        if (ratio > 0.8) return 'bg-red-600 text-white';
        if (ratio > 0.6) return 'bg-red-500 text-white';
        if (ratio > 0.4) return 'bg-orange-400 text-white';
        if (ratio > 0.2) return 'bg-orange-300 text-slate-800';
        return 'bg-amber-100 text-slate-800';
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-gray-50/50 min-h-full">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
                    <p className="text-gray-500">Deep dive into content performance and AI-driven insights.</p>
                </div>
                {!aiReport && (
                    <button 
                        onClick={handleRunAnalysis}
                        disabled={loading}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Running AI Analysis...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                Generate Full Report
                            </>
                        )}
                    </button>
                )}
            </header>

            {!aiReport && !loading && (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Analyze</h3>
                    <p className="text-gray-500 max-w-lg mx-auto">
                        Click "Generate Full Report" to process the latest 100 headlines. Gemini will extract sentiment trends, categorize content, identify key personalities, cluster topics, and map locations.
                    </p>
                </div>
            )}

            {aiReport && (
                <div className="animate-fade-in space-y-8">
                    {/* Top Row: Sentiment & Categories */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Sentiment Analysis Line Chart */}
                        <div className="bg-[#1e293b] rounded-2xl p-6 text-white shadow-lg overflow-hidden relative">
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-lg font-bold">Sentiment Analysis Over Time</h3>
                                    <p className="text-slate-400 text-sm">Brand perception tracking</p>
                                </div>
                                <div className="p-2 bg-slate-700/50 rounded-lg">
                                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                            </div>
                            
                            <div className="h-64 w-full relative">
                                {/* SVG Chart */}
                                <svg viewBox="0 0 400 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                    {/* Grid Lines */}
                                    <line x1="0" y1="50" x2="400" y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                                    <line x1="0" y1="100" x2="400" y2="100" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                                    <line x1="0" y1="150" x2="400" y2="150" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

                                    {/* Lines */}
                                    <polyline 
                                        points={getPolylinePoints(sentimentTimeline, 'positive', 200, 400)} 
                                        fill="none" 
                                        stroke="#34d399" 
                                        strokeWidth="3" 
                                        strokeLinecap="round"
                                        className="drop-shadow-lg"
                                    />
                                    <polyline 
                                        points={getPolylinePoints(sentimentTimeline, 'neutral', 200, 400)} 
                                        fill="none" 
                                        stroke="#fbbf24" 
                                        strokeWidth="3" 
                                        strokeLinecap="round"
                                    />
                                    <polyline 
                                        points={getPolylinePoints(sentimentTimeline, 'negative', 200, 400)} 
                                        fill="none" 
                                        stroke="#f87171" 
                                        strokeWidth="3" 
                                        strokeLinecap="round"
                                    />

                                    {/* Dots */}
                                    {sentimentTimeline.map((p, i) => {
                                        const dx = 400 / (sentimentTimeline.length - 1);
                                        const x = i * dx;
                                        return (
                                            <g key={i}>
                                                <circle cx={x} cy={200 - (p.positive / 100 * 200)} r="4" fill="#34d399" />
                                                <circle cx={x} cy={200 - (p.neutral / 100 * 200)} r="4" fill="#fbbf24" />
                                                <circle cx={x} cy={200 - (p.negative / 100 * 200)} r="4" fill="#f87171" />
                                            </g>
                                        )
                                    })}
                                </svg>
                            </div>
                            
                            {/* X-Axis Labels */}
                            <div className="flex justify-between mt-4 text-xs text-slate-400">
                                {sentimentTimeline.map((p, i) => (
                                    <span key={i}>{p.timeLabel}</span>
                                ))}
                            </div>
                            
                            {/* Legend */}
                            <div className="flex justify-center mt-6 space-x-6 text-sm">
                                <div className="flex items-center"><span className="w-3 h-3 bg-emerald-400 rounded-full mr-2"></span>Positive</div>
                                <div className="flex items-center"><span className="w-3 h-3 bg-red-400 rounded-full mr-2"></span>Negative</div>
                                <div className="flex items-center"><span className="w-3 h-3 bg-amber-400 rounded-full mr-2"></span>Neutral</div>
                            </div>
                        </div>

                        {/* Genre-wise Viewership Bar Chart */}
                        <div className="bg-[#1e293b] rounded-2xl p-6 text-white shadow-lg">
                             <div className="flex justify-between items-start mb-8">
                                <div>
                                    <h3 className="text-lg font-bold">Content Category Performance</h3>
                                    <p className="text-slate-400 text-sm">Genre-wise Viewership & Volume</p>
                                </div>
                                <div className="p-2 bg-slate-700/50 rounded-lg">
                                     <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {categoryData.map((cat, idx) => {
                                    const maxCount = Math.max(...categoryData.map(c => c.count));
                                    const widthPercent = (cat.count / maxCount) * 100;
                                    
                                    return (
                                        <div key={idx} className="group">
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-slate-300">{cat.category}</span>
                                                <span className="text-slate-400 font-mono">{cat.count}</span>
                                            </div>
                                            <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                                                <div 
                                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{ 
                                                        width: `${widthPercent}%`, 
                                                        backgroundColor: categoryColors[cat.category] || '#94a3b8' 
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                             <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between text-xs text-slate-500">
                                <span>Based on last 100 articles</span>
                                <span>Updated just now</span>
                             </div>
                        </div>
                    </div>

                    {/* Middle Row: Topic Clustering & Location Heatmap */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Topic Clustering (Bubble Style) */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                             <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Semantic Topic Clusters</h3>
                                    <p className="text-sm text-gray-500">Major themes grouped by volume</p>
                                </div>
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3 items-center justify-center min-h-[200px] content-center p-4 bg-gray-50/50 rounded-xl">
                                {topicClusters.map((cluster, idx) => {
                                    const maxCount = Math.max(...topicClusters.map(c => c.count));
                                    const minSize = 0.8;
                                    const maxSize = 2.0;
                                    const size = minSize + ((cluster.count / maxCount) * (maxSize - minSize));
                                    const opacity = 0.6 + ((cluster.count / maxCount) * 0.4);

                                    return (
                                        <div 
                                            key={idx} 
                                            className="flex flex-col items-center justify-center rounded-full bg-blue-500 text-white transition-all hover:scale-105 shadow-sm text-center px-2"
                                            style={{
                                                width: `${size * 5}rem`,
                                                height: `${size * 5}rem`,
                                                opacity: opacity,
                                                zIndex: Math.floor(cluster.count)
                                            }}
                                        >
                                            <span className="font-bold leading-none text-sm md:text-base line-clamp-2">{cluster.topic}</span>
                                            <span className="text-xs opacity-80 mt-1">{cluster.count}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                         {/* Location Heatmap (Grid Intensity) */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Location Heatmap</h3>
                                    <p className="text-sm text-gray-500">Geographic hotspots mentioned</p>
                                </div>
                                <div className="p-2 bg-orange-50 rounded-lg">
                                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {locationData.map((loc, idx) => {
                                    const maxCount = Math.max(...locationData.map(l => l.count));
                                    const colorClass = getHeatmapColor(loc.count, maxCount);
                                    return (
                                        <div key={idx} className={`p-3 rounded-lg flex flex-col justify-between h-24 ${colorClass} transition-transform hover:scale-105 shadow-sm`}>
                                            <span className="text-xs font-semibold opacity-80 uppercase tracking-wide truncate">{loc.location}</span>
                                            <span className="text-2xl font-bold">{loc.count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                             <div className="mt-4 flex items-center justify-end text-xs text-gray-400 space-x-2">
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-600 mr-1"></span> High Activity</span>
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-orange-400 mr-1"></span> Medium</span>
                                <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-amber-100 mr-1 border border-gray-200"></span> Low</span>
                             </div>
                        </div>
                    </div>

                    {/* Feed Source Distribution - NEW */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                         <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Feed Source Distribution</h3>
                                <p className="text-sm text-gray-500">Top 10 sources by article volume</p>
                            </div>
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {feedStats.map((stat, idx) => {
                                const max = feedStats[0]?.count || 1;
                                const percentage = (stat.count / max) * 100;
                                return (
                                    <div key={idx} className="group">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-gray-700">{stat.source}</span>
                                            <span className="text-gray-500 font-mono">{stat.count} articles</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                            <div 
                                                className="bg-indigo-600 h-3 rounded-full transition-all duration-1000 ease-out" 
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {feedStats.length === 0 && (
                                <p className="text-sm text-gray-500 text-center py-4">No feed data available.</p>
                            )}
                        </div>
                    </div>

                    {/* AI Trend Report Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {aiReport.map((topic, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex items-center mb-3">
                                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Trend #{idx + 1}</span>
                                </div>
                                <h4 className="font-bold text-gray-900 text-lg mb-2">{topic.mainTopic}</h4>
                                <p className="text-sm text-gray-600 mb-4 leading-relaxed">{topic.description}</p>
                                <div className="flex flex-wrap gap-2">
                                    {topic.keyThemes.map((theme, i) => (
                                        <span key={i} className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2 py-1 rounded-md font-medium">
                                            #{theme}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Personality Cards */}
                    {personalities.length > 0 && (
                        <div>
                             <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                                Key Figures in the News
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {personalities.map((person, idx) => (
                                    <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden group">
                                        {/* Image or Fallback Initials */}
                                        <div className="w-16 h-16 mb-4 relative flex justify-center">
                                            {person.imageUrl ? (
                                                <img 
                                                    src={person.imageUrl} 
                                                    alt={person.name} 
                                                    className="w-16 h-16 rounded-full object-cover shadow-md"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                    }} 
                                                />
                                            ) : null}
                                            <div className={`w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold text-2xl shadow-inner ${person.imageUrl ? 'hidden' : ''}`}>
                                                {person.name.charAt(0)}
                                            </div>
                                        </div>
                                        
                                        <h5 className="font-bold text-gray-900 text-lg">{person.name}</h5>
                                        <span className="text-xs text-gray-500 uppercase tracking-wider mb-3">{person.role}</span>
                                        <p className="text-sm text-gray-600 italic mb-4 line-clamp-2">"{person.context}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
