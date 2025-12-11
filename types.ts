
export interface Feed {
  id: string;
  url: string;
  title: string;
  icon?: string;
  color?: string;
}

export interface Article {
  id: string;
  feedId: string;
  feedTitle: string;
  feedColor?: string;
  title: string;
  link: string;
  content: string;
  contentSnippet: string;
  pubDate: string;
  isoDate: string;
  thumbnail?: string;
  author?: string;
}

export enum ViewMode {
  GRID = 'GRID',
  LIST = 'LIST'
}

export interface GeminiSummaryResponse {
  summary: string;
  keyPoints: string[];
  sentiment: 'Positive' | 'Neutral' | 'Negative';
}

export interface TrendTopic {
    keyword: string;
    count: number;
    relatedArticles: Article[];
}

export interface TrendReport {
    mainTopic: string;
    description: string;
    keyThemes: string[];
}

export interface PersonalityTrend {
  name: string;
  role: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  context: string;
}

export interface SentimentTrendPoint {
  timeLabel: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface CategoryTrend {
  category: string;
  count: number;
}

export interface TopicCluster {
  topic: string;
  count: number;
}

export interface LocationData {
  location: string;
  count: number;
}
