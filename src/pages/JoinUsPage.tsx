import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Send, Upload, CheckCircle2, Loader2, X, Link2, FileAudio, ArrowRight } from 'lucide-react';

const MAX_MESSAGE = 1000;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 Mo

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} Ko`
    : `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;

export const JoinUsPage: React.FC = () => {
  useDocumentMeta({
    title: 'Rejoins-nous',
    description:
      'Envoie ta démo à VØID PULSE. Candidatures ouvertes aux artistes, beatmakers et producteurs.',
  });

  const [artistName, setArtistName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Champ piège : invisible pour un humain, mais rempli par la plupart des
  // robots qui remplissent aveuglément tous les champs d'un formulaire.
  const [honeypot, setHoneypot] = useState('');

  const [progress, setProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Validation commune au choix par bouton et au glisser-déposer. */
  const acceptFile = (selected: File | undefined | null) => {
    setError(null);
    if (!selected) return;
    if (!selected.type.startsWith('audio/') && !selected.type.startsWith('video/')) {
      setError('Seuls les fichiers audio et vidéo sont acceptés.');
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError('Fichier trop lourd (50 Mo maximum). Utilise plutôt un lien.');
      return;
    }
    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    // Robot détecté : on simule un succès sans rien écrire, pour ne pas
    // lui indiquer que le piège a fonctionné.
    if (honeypot) {
      setIsSent(true);
      return;
    }

    if (!artistName.trim() || !email.trim() || !message.trim()) {
      setError('Nom, email et message sont obligatoires.');
      return;
    }

    setIsSending(true);
    setError(null);
    setProgress(0);

    try {
      let fileUrl = '';
      let filePath = '';

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
        filePath = `demos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}/${safeName}`;
        const fileRef = ref(storage, filePath);

        // uploadBytesResumable plutôt qu'uploadBytes : sur plusieurs
        // dizaines de Mo, sans retour visuel la personne quitte la page.
        const task = uploadBytesResumable(fileRef, file, { contentType: file.type });

        await new Promise<void>((resolve, reject) => {
          task.on(
            'state_changed',
            (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            resolve
          );
        });

        fileUrl = await getDownloadURL(fileRef);
      }

      await addDoc(collection(db, 'submissions'), {
        artistName: artistName.trim().slice(0, 80),
        email: email.trim().slice(0, 120),
        phone: phone.trim().slice(0, 30),
        message: message.trim().slice(0, MAX_MESSAGE),
        linkUrl: linkUrl.trim().slice(0, 300),
        fileUrl,
        filePath,
        status: 'new',
        createdAt: serverTimestamp(),
      });

      setIsSent(true);
    } catch (err) {
      console.error("Erreur lors de l'envoi de la candidature :", err);
      setError("L'envoi a échoué. Vérifie ta connexion et réessaie.");
    } finally {
      setIsSending(false);
    }
  };

  if (isSent) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <CheckCircle2 className="text-emerald-500" size={52} aria-hidden="true" />
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Bien reçu
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white">
          Candidature envoyée
        </h1>
        <p className="mt-5 text-sm font-light leading-relaxed text-neutral-400">
          On écoute chaque démo reçue. Si ton univers correspond à celui du label,
          on revient vers toi par email.
        </p>
        <Link
          to="/"
          className="group mt-8 inline-flex items-center gap-3 border border-white/20 px-6 py-3.5 font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-white transition-all hover:border-void-accent hover:bg-void-accent"
        >
          Retour à l'accueil
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const fieldClass =
    'w-full border border-neutral-800 bg-black px-4 py-3 text-sm text-white placeholder-neutral-700 outline-none transition-colors focus:border-void-accent';
  const microLabel =
    'mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-neutral-500';
  const sectionHead =
    'flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400';

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <header className="mb-12 border-b border-white/10 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-void-accent">
          Candidatures ouvertes
        </p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight text-white md:text-6xl">
          Rejoins-nous
        </h1>
        <p className="mt-5 max-w-md text-sm font-light leading-relaxed text-neutral-400">
          Artiste, beatmaker ou producteur : envoie-nous ta démo. Un lien
          SoundCloud ou YouTube suffit — le fichier est optionnel.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-14" noValidate>
        {/* Piège à robots — hors écran ET masqué aux lecteurs d'écran. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
          <label htmlFor="site-web">Ne pas remplir</label>
          <input
            id="site-web" type="text" tabIndex={-1} autoComplete="off"
            value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* ─────────── 01 · TOI ─────────── */}
        <section>
          <h2 className={sectionHead}>
            <span className="text-void-accent">01</span> Qui es-tu
            <span className="h-px flex-1 bg-white/10" />
          </h2>

          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="artistName" className={microLabel}>
                Nom d'artiste <span className="text-void-accent">*</span>
              </label>
              <input
                id="artistName" type="text" required maxLength={80} autoComplete="nickname"
                value={artistName} onChange={(e) => setArtistName(e.target.value)}
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="email" className={microLabel}>
                  Email <span className="text-void-accent">*</span>
                </label>
                <input
                  id="email" type="email" required maxLength={120} autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label htmlFor="phone" className={microLabel}>Téléphone</label>
                <input
                  id="phone" type="tel" maxLength={30} autoComplete="tel"
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="message" className={microLabel}>
                Présente-toi en quelques lignes <span className="text-void-accent">*</span>
              </label>
              <textarea
                id="message" required rows={6} maxLength={MAX_MESSAGE}
                value={message} onChange={(e) => setMessage(e.target.value)}
                className={`${fieldClass} resize-none leading-relaxed`}
              />
              <p className="mt-1.5 text-right font-mono text-[10px] text-neutral-700">
                {message.length} / {MAX_MESSAGE}
              </p>
            </div>
          </div>
        </section>

        {/* ─────────── 02 · TA MUSIQUE ─────────── */}
        <section>
          <h2 className={sectionHead}>
            <span className="text-void-accent">02</span> Ta musique
            <span className="h-px flex-1 bg-white/10" />
          </h2>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="linkUrl" className={microLabel}>
                Lien vers ta musique — SoundCloud, YouTube, Drive
              </label>
              <div className="relative">
                <Link2 size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" aria-hidden="true" />
                <input
                  id="linkUrl" type="url" maxLength={300} placeholder="https://"
                  value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)}
                  className={`${fieldClass} pl-11 font-mono text-xs`}
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="h-px flex-1 bg-neutral-900" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-700">ou</span>
              <span className="h-px flex-1 bg-neutral-900" />
            </div>

            {/* Zone de dépôt : envoyer une démo est le geste central de
                cette page. Le glisser-déposer évite d'ouvrir un
                sélecteur de fichiers, et la zone reste cliquable pour
                qui préfère la méthode classique. */}
            {file ? (
              <div className="flex items-center gap-4 border border-void-accent/40 bg-void-accent/5 p-5">
                <FileAudio size={22} className="shrink-0 text-void-accent" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{file.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                    {formatSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="shrink-0 p-2 text-neutral-600 transition-colors hover:text-red-500"
                  aria-label="Retirer le fichier"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="demo-file"
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex cursor-pointer flex-col items-center gap-3 border border-dashed px-6 py-12 text-center transition-colors ${
                  isDragging
                    ? 'border-void-accent bg-void-accent/10'
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <Upload size={24} className="text-void-accent" aria-hidden="true" />
                <span className="font-mono text-xs uppercase tracking-wider text-neutral-300">
                  Dépose ton fichier ici
                </span>
                <span className="font-mono text-[10px] text-neutral-600">
                  ou clique pour parcourir · audio ou vidéo · 50 Mo max
                </span>
              </label>
            )}

            <input
              id="demo-file" ref={fileInputRef} type="file" accept="audio/*,video/*"
              onChange={(e) => acceptFile(e.target.files?.[0])}
              className="sr-only"
            />
          </div>
        </section>

        {isSending && file && (
          <div>
            <div
              className="h-1 overflow-hidden bg-neutral-900"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progression de l'envoi"
            >
              <div className="h-full bg-void-accent transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
              Envoi du fichier — {progress}%
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="border border-red-900/50 bg-red-950/40 px-5 py-4 font-mono text-xs text-red-400">
            {error}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={isSending}
            className="flex w-full items-center justify-center gap-3 border border-void-accent bg-void-accent py-5 font-mono text-xs font-bold uppercase tracking-[0.3em] text-white transition-all hover:bg-transparent hover:text-void-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? (
              <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Envoi…</>
            ) : (
              <><Send size={16} aria-hidden="true" /> Envoyer ma candidature</>
            )}
          </button>

          <p className="mt-4 font-mono text-[10px] leading-relaxed text-neutral-600">
            Les informations envoyées servent uniquement à traiter ta candidature
            et ne sont transmises à personne.
          </p>
        </div>
      </form>
    </div>
  );
};