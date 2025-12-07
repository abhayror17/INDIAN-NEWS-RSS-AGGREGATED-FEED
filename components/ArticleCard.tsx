import React from 'react';
import { Article } from '../types';
import { PLACEHOLDER_IMAGE } from '../constants';

interface ArticleCardProps {
  article: Article;
  onClick: (article: Article) => void;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article, onClick }) => {
  const [imgSrc, setImgSrc] = React.useState(article.thumbnail || PLACEHOLDER_IMAGE);

  const handleImageError = () => {
    setImgSrc(PLACEHOLDER_IMAGE);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <div 
      onClick={() => onClick(article)}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer flex flex-col h-full border border-gray-100 group"
    >
      <div className="relative h-48 overflow-hidden bg-gray-100">
        <img 
          src={imgSrc} 
          alt={article.title} 
          onError={handleImageError}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
        />
        <div className="absolute top-2 left-2">
            <span 
              className="px-2 py-1 text-xs font-semibold text-white rounded-md shadow-sm"
              style={{ backgroundColor: article.feedColor || '#64748b' }}
            >
              {article.feedTitle}
            </span>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex items-center text-xs text-gray-400 mb-2 space-x-2">
            <span>{formatDate(article.pubDate)}</span>
            {article.author && (
                <>
                    <span>•</span>
                    <span className="truncate max-w-[150px]">{article.author}</span>
                </>
            )}
        </div>
        
        <h3 className="text-lg font-bold text-gray-800 mb-2 leading-tight line-clamp-3 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        
        <p className="text-sm text-gray-600 line-clamp-3 flex-grow">
          {article.contentSnippet}
        </p>

        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Read More</span>
             <svg className="w-4 h-4 text-primary transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;
