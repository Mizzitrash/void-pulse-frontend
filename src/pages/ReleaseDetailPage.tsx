import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRelease } from '../hooks/useReleases';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { usePlayer, type PlayerTrack } from '../context/PlayerContext';
import { AnalyticsEvents } from '../utils/analytics';
import {
  RELEASE_TYPE_LABELS, isUpcoming, formatReleaseDate,
} from '../types/release';
import {
  ArrowLeft, Play, Pause, Disc3, Loader2, Clock, ExternalLink, Music,
} from 'lucide-react';

export const ReleaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { release, loading } = useRelease(id);
  const { current, isPlaying, play } = usePlayer();

  useEffect(() => {
    if (release) AnalyticsEvents.releaseView(release.id, release.title, release.type);
  }, [release?.id]);

  useDocumentMeta({
    title: release ? `${release.title} — ${release.artistNames}` : undefined,
    description: release?.description
      ? release.description.slice(0, 155)
      : release
      ? `${RELEASE_TYPE_LABELS[release.type]} de ${release.artistNames}, sorti sur VØID PULSE.`
      : undefined,
    image: release?.artwork,
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-neutral-500">
        <Loader2 className="animate-spin" size={24} aria-hidden="true" />
      </div>
    );
  }

  if (!release) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">Erreur</p>
        <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-white">
          Sortie introuvable
        </h1>
        <Link
          to="/music"
          className="mt-8 border border-void-accent bg-void-accent px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-void-accent"
        >
          Voir le catalogue
        </Link>
      </div>
    );
  }

  const upcoming = isUpcoming(release);

  // Seuls les titres ayant un extrait alimentent la file : proposer un
  // bouton lecture sur un morceau sans fichier ne produirait rien.
  const playable = release.tracks
    .filter((t) => t.audioUrl)
    .map<PlayerTrack>((t) => ({
      id: `${release.id}-${t.id}`,
      title: t.title,
      subtitle: release.artistNames,
      artwork: release.artwork,
      src: t.audioUrl as string,
      href: `/music/${release.id}`,
    }));

  const streamingLinks = [
    { label: 'Spotify', url: release.spotifyUrl },
    { label: 'Apple Music', url: release.appleMusicUrl },
    { label: 'Deezer', url: release.deezerUrl },
    { label: 'YouTube', url: release.youtubeUrl },
    { label: 'SoundCloud', url: release.soundcloudUrl },
  ].filter((l) => l.url && l.url.trim() !== '') as { label: string; url: string }[];

  const sectionHead =
    'flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400';

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <button
        onClick={() => navigate(-1)}
        className="mb-10 inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500 transition-colors hover:text-white"
      >
        <ArrowLeft size={14} aria-hidden="true" /> Retour
      </button>

      {/* ─────────── EN-TÊTE ─────────── */}
      <header className="grid grid-cols-1 gap-10 border-b border-white/10 pb-12 md:grid-cols-[320px_1fr]">
        <div className="relative aspect-square overflow-hidden border border-neutral-900 bg-neutral-950">
          {release.artwork ? (
            <img src={release.artwork} alt={`Pochette de ${release.title}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-800">
              <Disc3 size={48} aria-hidden="true" />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-end">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
              {RELEASE_TYPE_LABELS[release.type]}
            </span>
            {upcoming && (
              <span className="flex items-center gap-1.5 bg-void-accent px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-white">
                <Clock size={9} aria-hidden="true" /> À venir
              </span>
            )}
          </div>

          <h1 className="mt-4 text-[clamp(2.2rem,7vw,4.5rem)] font-black uppercase leading-[0.9] tracking-[-0.03em] text-white">
            {release.title}
          </h1>

          {/* Chaque artiste renvoie vers sa page : c'est le lien le plus
              utile depuis une sortie, et il fait circuler dans le roster. */}
          <p className="mt-4 flex flex-wrap items-center gap-x-2 text-lg font-light text-neutral-300">
            {release.artistIds.length > 0 ? (
              release.artistIds.map((artistId, i) => (
                <React.Fragment key={artistId}>
                  {i > 0 && <span className="text-neutral-700">·</span>}
                  <Link to={`/artists/${artistId}`} className="transition-colors hover:text-void-accent">
                    {release.artistNames.split(',')[i]?.trim() || release.artistNames}
                  </Link>
                </React.Fragment>
              ))
            ) : (
              <span>{release.artistNames}</span>
            )}
          </p>

          <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-neutral-600">
            {formatReleaseDate(release.releaseDate)}
            {release.tracks.length > 0 && ` · ${release.tracks.length} titre${release.tracks.length > 1 ? 's' : ''}`}
          </p>

          {playable.length > 0 && (
            <button
              onClick={() => play(playable[0], playable)}
              className="mt-8 flex w-fit items-center gap-3 border border-void-accent bg-void-accent px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-transparent hover:text-void-accent"
            >
              <Play size={15} className="ml-0.5" aria-hidden="true" /> Écouter
            </button>
          )}
        </div>
      </header>

      {release.description && (
        <section className="py-12">
          <h2 className={sectionHead}>
            À propos <span className="h-px flex-1 bg-white/10" />
          </h2>
          <p className="mt-6 max-w-2xl border-l-2 border-void-accent/40 pl-6 text-base font-light leading-relaxed text-neutral-300">
            {release.description}
          </p>
        </section>
      )}

      {release.tracks.length > 0 && (
        <section className="py-12">
          <h2 className={sectionHead}>
            <Music size={13} className="text-void-accent" aria-hidden="true" />
            Tracklist
            <span className="h-px flex-1 bg-white/10" />
          </h2>

          <ol className="mt-6 divide-y divide-neutral-900 border-y border-neutral-900">
            {release.tracks.map((track, index) => {
              const trackId = `${release.id}-${track.id}`;
              const isCurrent = current?.id === trackId;
              const canPlay = Boolean(track.audioUrl);

              return (
                <li
                  key={track.id}
                  className={`flex items-center gap-4 px-4 py-4 transition-colors ${
                    isCurrent ? 'bg-void-accent/5' : 'hover:bg-neutral-950'
                  }`}
                >
                  <span className="w-6 shrink-0 font-mono text-xs text-neutral-700">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  {canPlay ? (
                    <button
                      onClick={() => play(
                        playable.find((p) => p.id === trackId) as PlayerTrack,
                        playable
                      )}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center transition-all ${
                        isCurrent && isPlaying
                          ? 'bg-void-accent text-white'
                          : 'border border-neutral-800 text-white hover:border-void-accent hover:bg-void-accent'
                      }`}
                      aria-label={isCurrent && isPlaying ? `Mettre ${track.title} en pause` : `Écouter ${track.title}`}
                    >
                      {isCurrent && isPlaying
                        ? <Pause size={14} aria-hidden="true" />
                        : <Play size={14} className="ml-0.5" aria-hidden="true" />}
                    </button>
                  ) : (
                    <span className="h-9 w-9 shrink-0" aria-hidden="true" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-bold uppercase tracking-tight ${isCurrent ? 'text-void-accent' : 'text-white'}`}>
                      {track.title}
                    </p>
                    {track.featuring && (
                      <p className="truncate font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                        feat. {track.featuring}
                      </p>
                    )}
                  </div>

                  {track.duration && (
                    <span className="shrink-0 font-mono text-xs tabular-nums text-neutral-600">
                      {track.duration}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {streamingLinks.length > 0 && (
        <section className="py-12">
          <h2 className={sectionHead}>
            Écouter en streaming <span className="h-px flex-1 bg-white/10" />
          </h2>

          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {streamingLinks.map(({ label, url }) => (
              <li key={label}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => AnalyticsEvents.clickStreaming(label, release.id)}
                  className="group flex items-center justify-between border border-neutral-900 bg-neutral-950 px-5 py-4 transition-all hover:border-void-accent hover:bg-void-accent/10"
                >
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-300 transition-colors group-hover:text-white">
                    {label}
                  </span>
                  <ExternalLink size={13} className="text-neutral-700 transition-colors group-hover:text-void-accent" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {release.credits && (
        <section className="border-t border-white/10 py-12">
          <h2 className={sectionHead}>
            Crédits <span className="h-px flex-1 bg-white/10" />
          </h2>
          <p className="mt-6 max-w-2xl whitespace-pre-wrap font-mono text-xs leading-relaxed text-neutral-500">
            {release.credits}
          </p>
        </section>
      )}
    </div>
  );
};