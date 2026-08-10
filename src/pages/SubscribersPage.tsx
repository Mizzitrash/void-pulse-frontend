import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Mail, Download, Trash2, Loader2, ShieldAlert, Search } from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  source?: string;
  status?: string;
  consentedAt?: Timestamp;
}

export const SubscribersPage: React.FC = () => {
  useDocumentMeta({ title: 'Newsletter' });

  const { hasPermission } = useAuth();
  const canManage =
    hasPermission('COMMUNITY_MANAGER') || hasPermission('MANAGER') || hasPermission('ADMIN');

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'subscribers'));
        setSubscribers(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<Subscriber, 'id'>) }))
            .sort((a, b) => (b.consentedAt?.seconds || 0) - (a.consentedAt?.seconds || 0))
        );
      } catch (error) {
        console.error('Chargement des inscrits :', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [canManage]);

  if (!canManage) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <ShieldAlert className="text-void-accent" size={30} aria-hidden="true" />
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-neutral-500">
          Accès réservé à l'équipe
        </p>
      </div>
    );
  }

  const formatDate = (ts?: Timestamp) =>
    ts ? ts.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  /**
   * Export CSV généré dans le navigateur, sans serveur.
   *
   * Le BOM en tête du fichier force Excel à lire l'UTF-8 : sans lui, une
   * adresse contenant un accent s'affiche en caractères illisibles.
   */
  const exportCsv = () => {
    const rows = [
      ['email', 'date_consentement', 'source', 'statut'],
      ...subscribers.map((s) => [
        s.email,
        s.consentedAt ? s.consentedAt.toDate().toISOString() : '',
        s.source || '',
        s.status || 'active',
      ]),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `void-pulse-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const remove = async (sub: Subscriber) => {
    if (!window.confirm(`Retirer ${sub.email} de la liste ?`)) return;
    try {
      await deleteDoc(doc(db, 'subscribers', sub.id));
      setSubscribers((prev) => prev.filter((s) => s.id !== sub.id));
    } catch (error) {
      console.error(error);
    }
  };

  const visible = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 flex flex-col justify-between gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
            Audience
          </p>
          <h1 className="mt-3 flex items-center gap-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
            <Mail className="text-void-accent" size={28} aria-hidden="true" />
            Newsletter
          </h1>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
            {subscribers.length} inscrit{subscribers.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportCsv}
            disabled={subscribers.length === 0}
            className="flex items-center gap-2 border border-neutral-800 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-void-accent hover:text-white disabled:opacity-40"
          >
            <Download size={13} aria-hidden="true" /> Exporter (CSV)
          </button>

          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
            <input
              type="search"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Rechercher une adresse"
              className="w-full border border-neutral-800 bg-black py-2.5 pl-10 pr-4 font-mono text-xs text-white outline-none transition-colors focus:border-void-accent md:w-48"
            />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 font-mono text-xs text-neutral-500">
          <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Chargement…
        </div>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-neutral-900 py-20 text-center">
          <Mail size={26} className="mx-auto mb-4 text-neutral-800" aria-hidden="true" />
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
            {subscribers.length === 0 ? 'Aucun inscrit pour le moment' : 'Aucun résultat'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-900 border-y border-neutral-900">
          {visible.map((sub) => (
            <li key={sub.id} className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm text-white">{sub.email}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                  {formatDate(sub.consentedAt)}
                  {sub.source && ` · depuis ${sub.source}`}
                </p>
              </div>
              <button
                onClick={() => remove(sub)}
                className="shrink-0 p-2 text-neutral-700 transition-colors hover:text-red-500"
                aria-label={`Retirer ${sub.email}`}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 border-t border-white/10 pt-6 font-mono text-[10px] leading-relaxed text-neutral-600">
        Ces adresses sont stockées chez toi, sans dépendance à une plateforme
        d'emailing. Pour envoyer une campagne, exporte le CSV et importe-le
        dans l'outil de ton choix. Une désinscription demandée par email doit
        être traitée ici, en retirant l'adresse.
      </p>
    </div>
  );
};