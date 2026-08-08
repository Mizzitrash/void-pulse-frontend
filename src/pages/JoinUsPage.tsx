import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { Send, Upload, CheckCircle2, Loader2, X, Link2 } from 'lucide-react';

const MAX_MESSAGE = 1000;
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 Mo

export const JoinUsPage: React.FC = () => {
  useDocumentMeta({
    title: 'Rejoins-nous',
    description:
      "Envoie ta démo à VØID PULSE. Formulaire de candidature ouvert aux artistes, beatmakers et producteurs.",
  });

  const [artistName, setArtistName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // Champ piège : invisible pour un humain, mais rempli par la plupart des
  // robots qui remplissent aveuglément tous les champs d'un formulaire.
  // Si on le reçoit non vide, on ignore silencieusement la soumission.
  const [honeypot, setHoneypot] = useState('');

  const [progress, setProgress] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.type.startsWith('audio/') && !selected.type.startsWith('video/')) {
      setError('Seuls les fichiers audio et vidéo sont acceptés.');
      e.target.value = '';
      return;
    }
    if (selected.size > MAX_FILE_BYTES) {
      setError('Fichier trop lourd (50 Mo maximum). Utilise plutôt un lien.');
      e.target.value = '';
      return;
    }
    setFile(selected);
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
        // Chemin unique : évite qu'une soumission écrase la précédente.
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
        filePath = `demos/${Date.now()}-${Math.random().toString(36).slice(2, 10)}/${safeName}`;
        const fileRef = ref(storage, filePath);

        // uploadBytesResumable plutôt que uploadBytes : sur un fichier de
        // plusieurs dizaines de Mo, l'utilisateur a besoin de voir que
        // quelque chose se passe, sinon il quitte la page.
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
      console.error('Erreur lors de l\'envoi de la candidature :', err);
      setError("L'envoi a échoué. Vérifie ta connexion et réessaie.");
    } finally {
      setIsSending(false);
    }
  };

  if (isSent) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-6 max-w-lg mx-auto">
        <CheckCircle2 className="text-emerald-500 mb-6" size={56} aria-hidden="true" />
        <h1 className="text-3xl font-black uppercase tracking-tight text-white">
          Candidature envoyée
        </h1>
        <p className="text-neutral-400 text-xs font-mono mt-4 leading-relaxed">
          Merci. On écoute chaque démo reçue. Si ton univers correspond à celui du
          label, on revient vers toi par email.
        </p>
      </div>
    );
  }

  const inputClass =
    'w-full bg-black border border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder-neutral-600 focus:border-void-accent outline-none transition-colors';
  const labelClass =
    'block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5';

  return (
    <div className="max-w-2xl mx-auto px-6 py-16 text-white">
      <header className="mb-10">
        <span className="text-void-accent text-xs font-bold tracking-[0.4em] uppercase">
          Candidature
        </span>
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mt-2">
          Rejoins-nous
        </h1>
        <p className="text-neutral-400 text-sm mt-4 leading-relaxed font-light">
          Artiste, beatmaker ou producteur : envoie-nous ta démo. Un lien
          SoundCloud ou YouTube suffit — l'envoi de fichier est optionnel.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Piège à robots — masqué visuellement ET aux lecteurs d'écran. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }}>
          <label htmlFor="site-web">Ne pas remplir</label>
          <input
            id="site-web"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="artistName" className={labelClass}>
            Nom d'artiste <span className="text-void-accent">*</span>
          </label>
          <input
            id="artistName"
            type="text"
            required
            maxLength={80}
            autoComplete="nickname"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className={labelClass}>
              Email <span className="text-void-accent">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              maxLength={120}
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Téléphone
            </label>
            <input
              id="phone"
              type="tel"
              maxLength={30}
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className={labelClass}>
            Présente-toi en quelques lignes <span className="text-void-accent">*</span>
          </label>
          <textarea
            id="message"
            required
            rows={5}
            maxLength={MAX_MESSAGE}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${inputClass} resize-none`}
          />
          <p className="text-[10px] font-mono text-neutral-600 mt-1 text-right">
            {message.length} / {MAX_MESSAGE}
          </p>
        </div>

        <div>
          <label htmlFor="linkUrl" className={labelClass}>
            Lien vers ta musique (SoundCloud, YouTube, Drive…)
          </label>
          <div className="relative">
            <Link2
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
              aria-hidden="true"
            />
            <input
              id="linkUrl"
              type="url"
              maxLength={300}
              placeholder="https://"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>

        <div>
          <span className={labelClass}>Ou envoie un fichier (audio / vidéo, 50 Mo max)</span>
          <label
            htmlFor="demo-file"
            className="flex items-center gap-3 px-4 py-3 bg-neutral-950 border border-dashed border-neutral-800 hover:border-void-accent rounded-lg cursor-pointer transition-colors"
          >
            <Upload size={16} className="text-void-accent shrink-0" aria-hidden="true" />
            <span className="text-xs font-mono text-neutral-400 truncate">
              {file ? file.name : 'Choisir un fichier'}
            </span>
          </label>
          <input
            id="demo-file"
            type="file"
            accept="audio/*,video/*"
            onChange={handleFileSelect}
            className="sr-only"
          />
          {file && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono text-neutral-500 hover:text-red-400 transition-colors"
            >
              <X size={12} aria-hidden="true" /> Retirer le fichier
            </button>
          )}
        </div>

        {isSending && file && (
          <div>
            <div
              className="h-1 bg-neutral-900 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progression de l'envoi"
            >
              <div
                className="h-full bg-void-accent transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] font-mono text-neutral-500 mt-1">
              Envoi du fichier — {progress}%
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs font-mono text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSending}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-void-accent hover:bg-[#c00404] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-mono font-bold uppercase tracking-widest rounded-lg transition-colors"
        >
          {isSending ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Envoi…
            </>
          ) : (
            <>
              <Send size={16} aria-hidden="true" /> Envoyer ma candidature
            </>
          )}
        </button>

        <p className="text-[10px] font-mono text-neutral-600 leading-relaxed">
          Les informations envoyées ne servent qu'à traiter ta candidature et ne sont
          transmises à personne.
        </p>
      </form>
    </div>
  );
};