import React from 'react';
import { Link } from 'react-router-dom';
import { MainLayout } from '../components/MainLayout';
import { useDocumentMeta } from '../hooks/useDocumentMeta';

export const NotFoundPage: React.FC = () => {
  useDocumentMeta({ title: 'Page introuvable' });

  return (
    <MainLayout>
      <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-24 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Erreur 404
        </p>
        <h1 className="mt-4 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-6xl">
          Page introuvable
        </h1>
        <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-neutral-400">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="mt-8 border border-void-accent bg-void-accent px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white transition-all hover:bg-transparent hover:text-void-accent"
        >
          Retour à l'accueil
        </Link>
      </section>
    </MainLayout>
  );
};