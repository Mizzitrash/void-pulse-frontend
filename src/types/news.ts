export interface NewsPost {
  id: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likes: number;
}

const STORAGE_KEY = 'void_news_posts';

export const getStoredNewsPosts = (): NewsPost[] => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [
    {
      id: '1',
      authorName: 'VØID CM',
      content: 'Bienvenue sur le flux d’actualités de VØID PULSE ! Suivez ici toutes nos prochaines sorties et exclusivités.',
      createdAt: 'Aujourd’hui à 14:00',
      likes: 12,
    },
  ];
};

export const saveNewsPosts = (posts: NewsPost[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
};