export interface NewsItem {
  id: string;
  title: string;
  category: 'RELEASE' | 'EVENT' | 'STUDIO' | 'ANNOUNCEMENT';
  date: string;
  summary: string;
  imageUrl: string;
  tag?: string;
}

export const NEWS_DATA: NewsItem[] = [
  {
    id: '1',
    title: '"Soon"',
    category: 'RELEASE',
    date: '20 JUILLET 2026',
    summary: 'soon...',
    imageUrl: 'logo.png',
    tag: 'Soon'
  },
  {
    id: '2',
    title: 'Soon',
    category: 'RELEASE',
    date: '15 JUILLET 2026',
    summary: 'soon...',
    imageUrl: 'logo.png',
  },
  {
    id: '3',
    title: 'Soon',
    category: 'RELEASE',
    date: '02 AOÛT 2026',
    summary: 'soon...',
    imageUrl: 'logo.png',
    tag: 'Soon'
  }
];