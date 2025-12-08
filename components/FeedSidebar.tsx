
import React from 'react';
import { Feed } from '../types';

interface FeedSidebarProps {
  feeds: Feed[];
  selectedFeedId: string | null;
  currentView: 'feed' | 'trends';
  onSelectFeed: (id: string | null) => void;
  onSelectView: (view: 'feed' | 'trends') => void;
  onAddFeed: () => void;
  onRemoveFeed: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const FeedSidebar: React.FC<FeedSidebarProps> = ({ 
  feeds, 
  selectedFeedId, 
  currentView,
  onSelectFeed, 
  onSelectView,
  onAddFeed,
  onRemoveFeed,
  isOpen,
  onClose
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`
        fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-gray-200 z-30 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-screen md:sticky md:top-0 flex flex-col
      `}>
        <div className="p-6 border-b border-gray-100 flex flex-col items-center justify-center relative">
            {/* Logo */}
            <div className="w-full flex items-center justify-center py-2">
                <img 
                    src="https://raw.githubusercontent.com/LGPSM-Solutions/LGPSM-Solutions/main/LGPSM%20LOGO%20FINAL%20.png" 
                    alt="LGPSM Solutions" 
                    className="h-20 w-auto object-contain transition-transform duration-300 hover:scale-105" 
                    onError={(e) => {
                        // Fallback if image fails or is transparent on white
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerText = 'LGPSM Solutions';
                        e.currentTarget.parentElement!.className = 'text-xl font-bold text-blue-700 text-center';
                    }}
                />
            </div>
            <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600 absolute right-4 top-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <nav className="flex-grow overflow-y-auto p-4 space-y-2">
            <div className="mb-6 space-y-1">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Discover</p>
                <button
                    onClick={() => { onSelectView('feed'); onSelectFeed(null); onClose(); }}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentView === 'feed' && selectedFeedId === null
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
                    News Feed
                </button>
                <button
                    onClick={() => { onSelectView('trends'); onClose(); }}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentView === 'trends'
                        ? 'bg-purple-50 text-purple-700' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    Trends & Insights
                </button>
            </div>

            <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Subscriptions</p>
                {feeds.map(feed => (
                    <div key={feed.id} className="group flex items-center justify-between">
                         <button
                            onClick={() => { onSelectView('feed'); onSelectFeed(feed.id); onClose(); }}
                            className={`flex-grow flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors truncate ${
                                currentView === 'feed' && selectedFeedId === feed.id 
                                ? 'bg-blue-50 text-blue-700' 
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <span 
                                className="w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0" 
                                style={{ backgroundColor: feed.color || '#94a3b8' }}
                            />
                            <span className="truncate">{feed.title}</span>
                        </button>
                        {feed.id !== '1' && feed.id !== '2' && feed.id !== '3' && feed.id !== '4' && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); onRemoveFeed(feed.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove Feed"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                        )}
                    </div>
                ))}
            </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
            <button 
                onClick={onAddFeed}
                className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
            >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Add New Feed
            </button>
        </div>
      </aside>
    </>
  );
};

export default FeedSidebar;
