import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { User, X, Mail, ExternalLink } from 'lucide-react';

export interface TeamMember {
  uid: string;
  displayName: string;
  title: string;
  bio?: string;
  photoUrl?: string;
  publicEmail?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  visible?: boolean;
  order?: number;
}

export const TeamSection: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeamMember | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // Pas de where() + orderBy() combinés : cela imposerait un index
        // composite à créer à la main dans la console Firebase. L'équipe
        // comptant quelques personnes, filtrer et trier côté client est
        // largement suffisant et évite cette dépendance.
        const snap = await getDocs(collection(db, 'team'));
        const list = snap.docs
          .map((d) => ({ uid: d.id, ...(d.data() as Omit<TeamMember, 'uid'>) }))
          .filter((m) => m.visible !== false && m.displayName)
          .sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.displayName.localeCompare(b.displayName));
        setMembers(list);
      } catch (error) {
        console.error("Erreur lors du chargement de l'équipe :", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const close = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selected, close]);

  // Section entièrement masquée tant que personne n'a rempli sa fiche :
  // un bandeau "Notre équipe" vide ferait plus de mal que de bien.
  if (loading || members.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-24" aria-labelledby="team-heading">
      <div className="mb-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Dans l'ombre
        </p>
        <h2
          id="team-heading"
          className="mt-3 text-4xl md:text-5xl font-black uppercase leading-none tracking-tight text-white"
        >
          L'équipe
        </h2>
        <p className="mt-4 max-w-md text-sm font-light leading-relaxed text-neutral-400">
          Celles et ceux qui font tourner le label au quotidien.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {members.map((member) => (
          <li key={member.uid}>
            <button
              onClick={() => setSelected(member)}
              className="group w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-void-accent"
              aria-label={`En savoir plus sur ${member.displayName}`}
            >
              <div className="relative aspect-[3/4] overflow-hidden border border-neutral-900 bg-neutral-950">
                {member.photoUrl ? (
                  <img
                    src={member.photoUrl}
                    alt={member.displayName}
                    loading="lazy"
                    className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-700">
                    <User size={40} aria-hidden="true" />
                  </div>
                )}

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-void-accent">
                    {member.title}
                  </p>
                  <p className="mt-1 text-sm font-black uppercase leading-tight tracking-tight text-white">
                    {member.displayName}
                  </p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {/* ─────────── FICHE DÉTAILLÉE ─────────── */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selected.displayName}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-neutral-800 bg-neutral-950"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              className="absolute right-4 top-4 z-10 rounded-xl border border-neutral-800 bg-black/80 p-2 text-neutral-400 transition-colors hover:text-white"
              aria-label="Fermer"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr]">
              <div className="aspect-[3/4] w-full overflow-hidden bg-black sm:aspect-auto">
                {selected.photoUrl ? (
                  <img
                    src={selected.photoUrl}
                    alt={selected.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-60 items-center justify-center text-neutral-700">
                    <User size={48} aria-hidden="true" />
                  </div>
                )}
              </div>

              <div className="p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-void-accent">
                  {selected.title}
                </p>
                <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                  {selected.displayName}
                </h3>

                {selected.bio && (
                  <p className="mt-4 whitespace-pre-wrap text-sm font-light leading-relaxed text-neutral-300">
                    {selected.bio}
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-2 border-t border-neutral-900 pt-5">
                  {selected.publicEmail && (
                    <a
                      href={`mailto:${selected.publicEmail}`}
                      className="flex items-center gap-2 font-mono text-xs text-neutral-300 transition-colors hover:text-void-accent"
                    >
                      <Mail size={13} aria-hidden="true" /> {selected.publicEmail}
                    </a>
                  )}
                  {selected.instagramUrl && (
                    <a
                      href={selected.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-mono text-xs text-neutral-300 transition-colors hover:text-void-accent"
                    >
                      <ExternalLink size={13} aria-hidden="true" /> Instagram
                    </a>
                  )}
                  {selected.youtubeUrl && (
                    <a
                      href={selected.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 font-mono text-xs text-neutral-300 transition-colors hover:text-void-accent"
                    >
                      <ExternalLink size={13} aria-hidden="true" /> YouTube
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};