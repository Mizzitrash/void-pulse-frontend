// src/types/post.ts
export interface NewsPost {
  id?: string;
  title: string;
  content: string;
  author: string;
  category: 'ANNONCE' | 'RELEASE' | 'EVENT' | string;
  imageUrl?: string;
  createdAt?: string | Date;
}