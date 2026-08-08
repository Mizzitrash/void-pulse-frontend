import React, { useEffect, useState } from 'react';
import {
  collection, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  Inbox, Mail, Phone, ExternalLink, Check, Trash2,
  Loader2, ShieldAlert, RotateCcw, Link2,
} from 'lucide-react';

type SubmissionStatus = 'new' | 'done';

interface Submission {
  id: string;
  artistName: string;
  email: string;
  phone?: string;
  message: string;
  linkUrl?: string;
  fileUrl?: string;
  filePath?: string;
  status: SubmissionStatus;
  createdAt?: Timestamp;
}

const VIDEO_EXT = /\.(mp4|mov|webm|m4v|avi|mkv)$/i;

export const SubmissionsPage: React.FC = () => {
  useDocumentMeta({ title: 'Candidatures' });

  const { hasPermission } = useAuth();
  const canManage = hasPermission('MANAGER') || hasPermission('ADMIN');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'new' | 'done' | 'all'>('new');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setSubmissions(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Submission, 'id'>) })));
        setLoading(false);
      },
      (error) => {
        console.error('Erreur lors du chargement des candidatures :', error);
        setLoadError('Impossible de charger les candidatures. Vérifie tes droits.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [canManage]);

  if (!canManage) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
        <ShieldAlert className="text-void-accent" size={30} aria-hidden="true" />
        <p className="mt-4 font-mono text-xs uppercase tracking-widest text-neutral-500">
          Accès réservé aux managers
        </p>
      </div>
    );
  }

  const toggleStatus = async (s: Submission) => {
    setBusyId(s.id);
    try {
      await updateDoc(doc(db, 'submissions', s.id), {
        status: s.status === 'done' ? 'new' : 'done',
      });
    } catch (error) {
      console.error(error);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (s: Submission) => {
    if (!window.confirm(`Supprimer définitivement la candidature de ${s.artistName} ?`)) return;
    setBusyId(s.id);
    try {
      // Le fichier part en premier : supprimer le document d'abord ferait
      // perdre le chemin, et le fichier resterait orphelin dans le bucket
      // à consommer du quota sans qu'on puisse le retrouver.
      if (s.filePath) {
        try {
          await deleteObject(ref(storage, s.filePath));
        } catch (storageError) {
          console.warn('Fichier introuvable dans Storage :', storageError);
        }
      }
      await deleteDoc(doc(db, 'submissions', s.id));
    } catch (error) {
      console.error(error);
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (ts?: Timestamp) =>
    ts
      ? ts.toDate().toLocaleDateString('fr-FR', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : '';

  const visible = submissions.filter((s) =>
    filter === 'all' ? true : filter === 'done' ? s.status === 'done' : s.status !== 'done'
  );

  const newCount = submissions.filter((s) => s.status !== 'done').length;

  const tabClass = (value: typeof filter) =>
    `px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors ${
      filter === value
        ? 'bg-void-accent text-white'
        : 'border border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-white'
    }`;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <header className="mb-8 border-b border-white/10 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Boîte de réception
        </p>
        <h1 className="mt-3 flex items-center gap-4 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-5xl">
          Candidatures
          {newCount > 0 && (
            <span className="flex h-8 min-w-8 items-center justify-center bg-void-accent px-2 font-mono text-sm">
              {newCount}
            </span>
          )}
        </h1>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
          {newCount} en attente · {submissions.length} au total
        </p>

        <div className="mt-6 flex gap-2" role="tablist" aria-label="Filtrer les candidatures">
          <button role="tab" aria-selected={filter === 'new'} onClick={() => setFilter('new')} className={tabClass('new')}>
            En attente
          </button>
          <button role="tab" aria-selected={filter === 'done'} onClick={() => setFilter('done')} className={tabClass('done')}>
            Traitées
          </button>
          <button role="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')} className={tabClass('all')}>
            Toutes
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 font-mono text-xs text-neutral-500">
          <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Chargement…
        </div>
      ) : loadError ? (
        <p role="alert" className="border border-red-900/50 bg-red-950/40 px-5 py-4 font-mono text-xs text-red-400">
          {loadError}
        </p>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-neutral-900 py-20 text-center">
          <Inbox size={26} className="mx-auto mb-4 text-neutral-800" aria-hidden="true" />
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-600">
            Rien dans cette vue
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((s) => {
            const isDone = s.status === 'done';
            const isVideo = s.filePath ? VIDEO_EXT.test(s.filePath) : false;

            return (
              <li
                key={s.id}
                className={`relative border bg-neutral-950 p-6 transition-colors ${
                  isDone ? 'border-neutral-900 opacity-55' : 'border-neutral-800'
                }`}
              >
                {/* Filet rouge sur les candidatures non traitées : dans une
                    liste longue, on repère d'un regard ce qui reste à faire. */}
                {!isDone && (
                  <span className="absolute inset-y-0 left-0 w-0.5 bg-void-accent" aria-hidden="true" />
                )}

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black uppercase leading-none tracking-tight text-white">
                      {s.artistName}
                    </h2>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
                      {formatDate(s.createdAt)}
                    </p>
                  </div>
                  {isDone && (
                    <span className="border border-emerald-800/40 bg-emerald-950/60 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-emerald-400">
                      Traitée
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs">
                  <a href={`mailto:${s.email}`} className="flex items-center gap-2 text-neutral-300 transition-colors hover:text-void-accent">
                    <Mail size={13} aria-hidden="true" /> {s.email}
                  </a>
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="flex items-center gap-2 text-neutral-300 transition-colors hover:text-void-accent">
                      <Phone size={13} aria-hidden="true" /> {s.phone}
                    </a>
                  )}
                </div>

                <p className="mt-5 border-l-2 border-void-accent/30 pl-5 text-sm font-light leading-relaxed whitespace-pre-wrap text-neutral-300">
                  {s.message}
                </p>

                {s.linkUrl && (
                  <a
                    href={s.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group mt-5 flex items-center justify-between border border-neutral-900 bg-black px-4 py-3 transition-colors hover:border-void-accent"
                  >
                    <span className="flex min-w-0 items-center gap-2 font-mono text-xs text-neutral-400 transition-colors group-hover:text-white">
                      <Link2 size={13} className="shrink-0 text-void-accent" aria-hidden="true" />
                      <span className="truncate">{s.linkUrl}</span>
                    </span>
                    <ExternalLink size={13} className="ml-3 shrink-0 text-neutral-700 group-hover:text-void-accent" aria-hidden="true" />
                  </a>
                )}

                {s.fileUrl && (
                  <div className="mt-5">
                    {/* preload="none" : ces fichiers pèsent jusqu'à 50 Mo.
                        Sans cela, ouvrir la page téléchargerait toutes les
                        démos affichées d'un coup. */}
                    {isVideo ? (
                      <video src={s.fileUrl} controls preload="none" className="max-h-80 w-full border border-neutral-900 bg-black" />
                    ) : (
                      <audio src={s.fileUrl} controls preload="none" className="w-full" />
                    )}
                  </div>
                )}

                <div className="mt-6 flex items-center gap-2 border-t border-neutral-900 pt-5">
                  <button
                    onClick={() => toggleStatus(s)}
                    disabled={busyId === s.id}
                    className="flex items-center gap-2 border border-neutral-800 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-300 transition-colors hover:border-emerald-700 hover:text-emerald-400 disabled:opacity-50"
                  >
                    {isDone ? (
                      <><RotateCcw size={12} aria-hidden="true" /> Rouvrir</>
                    ) : (
                      <><Check size={12} aria-hidden="true" /> Marquer traitée</>
                    )}
                  </button>

                  <button
                    onClick={() => remove(s)}
                    disabled={busyId === s.id}
                    className="flex items-center gap-2 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-700 transition-colors hover:text-red-500 disabled:opacity-50"
                  >
                    <Trash2 size={12} aria-hidden="true" /> Supprimer
                  </button>

                  {busyId === s.id && (
                    <Loader2 className="animate-spin text-neutral-600" size={14} aria-hidden="true" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};