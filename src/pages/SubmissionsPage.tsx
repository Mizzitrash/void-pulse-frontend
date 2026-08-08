import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import {
  Inbox, Mail, Phone, ExternalLink, Check, Trash2,
  Loader2, ShieldAlert, RotateCcw,
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
        setSubmissions(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Submission, 'id'>) }))
        );
        setLoading(false);
      },
      (error) => {
        console.error('Erreur lors du chargement des candidatures :', error);
        setLoadError("Impossible de charger les candidatures. Vérifie tes droits.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [canManage]);

  if (!canManage) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-6">
        <ShieldAlert className="text-void-accent mb-4" size={32} aria-hidden="true" />
        <p className="font-mono text-sm text-neutral-400">
          Accès réservé aux managers.
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
      // On supprime d'abord le fichier : si on effaçait le document en
      // premier et que la suppression Storage échouait, on perdrait le
      // chemin du fichier, qui resterait orphelin dans le bucket à
      // consommer du quota sans qu'on puisse le retrouver.
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
    `px-4 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
      filter === value
        ? 'bg-void-accent text-white'
        : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
    }`;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-white">
      <header className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Inbox className="text-void-accent" size={26} aria-hidden="true" />
          Candidatures
        </h1>
        <p className="text-neutral-400 text-xs font-mono uppercase mt-1">
          {newCount} en attente · {submissions.length} au total
        </p>
      </header>

      <div className="flex gap-2 mb-6" role="tablist" aria-label="Filtrer les candidatures">
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

      {loading ? (
        <div className="flex items-center gap-2 justify-center py-16 text-neutral-500 text-xs font-mono">
          <Loader2 className="animate-spin" size={16} aria-hidden="true" /> Chargement…
        </div>
      ) : loadError ? (
        <p role="alert" className="text-xs font-mono text-red-400">{loadError}</p>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-900 rounded-2xl">
          <p className="text-xs font-mono text-neutral-500">Aucune candidature dans cette vue.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((s) => {
            const isDone = s.status === 'done';
            const isVideo = s.filePath ? VIDEO_EXT.test(s.filePath) : false;

            return (
              <li
                key={s.id}
                className={`bg-neutral-950 border rounded-2xl p-5 transition-colors ${
                  isDone ? 'border-neutral-900 opacity-60' : 'border-neutral-800'
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-wide">{s.artistName}</h2>
                    <p className="text-[10px] font-mono text-neutral-500 mt-0.5">
                      {formatDate(s.createdAt)}
                    </p>
                  </div>
                  {isDone && (
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                      Traitée
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 mt-3 text-xs font-mono">
                  <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-neutral-300 hover:text-void-accent transition-colors">
                    <Mail size={13} aria-hidden="true" /> {s.email}
                  </a>
                  {s.phone && (
                    <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 text-neutral-300 hover:text-void-accent transition-colors">
                      <Phone size={13} aria-hidden="true" /> {s.phone}
                    </a>
                  )}
                </div>

                <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap mt-4">
                  {s.message}
                </p>

                {s.linkUrl && (
                  <a
                    href={s.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-4 text-xs font-mono text-void-accent hover:underline break-all"
                  >
                    <ExternalLink size={13} aria-hidden="true" /> {s.linkUrl}
                  </a>
                )}

                {s.fileUrl && (
                  <div className="mt-4">
                    {/* preload="none" est important : ces fichiers peuvent
                        peser jusqu'à 50 Mo. Sans cela, ouvrir la page
                        déclencherait le téléchargement de TOUTES les démos
                        affichées d'un coup — et ferait fondre le quota de
                        bande passante Storage. */}
                    {isVideo ? (
                      <video src={s.fileUrl} controls preload="none" className="w-full rounded-lg border border-neutral-800 max-h-80" />
                    ) : (
                      <audio src={s.fileUrl} controls preload="none" className="w-full" />
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-neutral-900">
                  <button
                    onClick={() => toggleStatus(s)}
                    disabled={busyId === s.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-emerald-700 hover:text-emerald-400 text-neutral-300 text-[10px] font-mono font-bold uppercase transition-colors disabled:opacity-50"
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-neutral-600 hover:text-red-500 text-[10px] font-mono font-bold uppercase transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} aria-hidden="true" /> Supprimer
                  </button>

                  {busyId === s.id && <Loader2 className="animate-spin text-neutral-500" size={14} aria-hidden="true" />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};