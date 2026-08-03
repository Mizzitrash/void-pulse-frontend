import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Vérifie la structure de tes dossiers :
// - Si config est dans src/firebase/config.ts : '../firebase/config'
// - Si config est dans src/firebase.ts : '../firebase'
import { db } from '../firebase';

import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Save, Plus, Trash2, Video, Music, Image as ImageIcon } from 'lucide-react';

interface Beat {
  id: string;
  title: string;
  price: number;
  bpm: number;
  genre: string;
  audioUrl?: string;
}

export const EditArtistPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Récupération de l'auth avec fallback (au cas où votre contexte utilise user ou profile)
  const auth = useAuth() as any;
  const profile = auth?.profile || auth?.user;
  const loading = auth?.loading ?? auth?.isLoading ?? false;

  const [formData, setFormData] = useState({
    name: '',
    genre: '',
    type: 'rapper', // 'beatmaker' | 'rapper' | 'other'
    bio: '',
    image: '',
    youtubeEmbed: '',
    spotifyUrl: '',
    youtubeUrl: '',
    instagramUrl: '',
    tiktokUrl: '',
    beats: [] as Beat[],
  });

  const [newBeat, setNewBeat] = useState<Beat>({
    id: '',
    title: '',
    price: 30,
    bpm: 140,
    genre: '',
  });

  const [saving, setSaving] = useState(false);

  // Vérification des droits : Admin OU l'artiste propriétaire du profil
  const isAuthorized = profile?.role === 'admin' || (profile?.role === 'artist' && profile?.artistId === id);

  useEffect(() => {
    const fetchArtist = async () => {
      if (!id) return;
      const docRef = doc(db, 'artists', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          name: data.name || '',
          genre: data.genre || '',
          type: data.type || (data.genre?.toLowerCase().includes('beatmaker') ? 'beatmaker' : 'rapper'),
          bio: data.bio || '',
          image: data.image || '',
          youtubeEmbed: data.youtubeEmbed || '',
          spotifyUrl: data.spotifyUrl || '',
          youtubeUrl: data.youtubeUrl || '',
          instagramUrl: data.instagramUrl || '',
          tiktokUrl: data.tiktokUrl || '',
          beats: data.beats || [],
        });
      }
    };
    fetchArtist();
  }, [id]);

  if (loading) return <div className="text-center py-20 text-white font-mono">Chargement...</div>;

  if (!isAuthorized) {
    return (
      <div className="text-center py-20 text-white font-mono">
        <h2 className="text-2xl text-red-600 font-bold">ACCÈS REFUSÉ</h2>
        <p className="mt-2 text-neutral-400">Vous n'avez pas la permission de modifier cette page.</p>
      </div>
    );
  }

  // Extraction Regex de l'ID vidéo YouTube (watch, embed, shorts, youtu.be)
  const formatYoutubeEmbed = (url: string) => {
    if (!url) return '';
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11
      ? `https://www.youtube.com/embed/${match[2]}`
      : url;
  };

  const handleAddBeat = () => {
    if (!newBeat.title) return;
    const beatToAdd = {
      ...newBeat,
      id: Date.now().toString(),
      genre: newBeat.genre || formData.genre,
    };
    setFormData((prev) => ({ ...prev, beats: [...prev.beats, beatToAdd] }));
    setNewBeat({ id: '', title: '', price: 30, bpm: 140, genre: '' });
  };

  const handleRemoveBeat = (beatId: string) => {
    setFormData((prev) => ({
      ...prev,
      beats: prev.beats.filter((b) => b.id !== beatId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    try {
      const docRef = doc(db, 'artists', id);
      const cleanedData = {
        ...formData,
        youtubeEmbed: formatYoutubeEmbed(formData.youtubeEmbed),
      };
      await updateDoc(docRef, cleanedData);
      
      // Redirection vers la route de détail d'artiste
      navigate(`/artists/${id}`);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde :', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-white pb-24">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 mb-8 text-xs font-mono text-neutral-400 hover:text-white cursor-pointer"
      >
        <ArrowLeft size={16} /> ANNULER
      </button>

      <h1 className="text-3xl font-black uppercase tracking-wider mb-8 border-b border-neutral-800 pb-4">
        Personnaliser ma page artiste
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* PROFIL & IDENTITÉ */}
        <div className="bg-neutral-950 p-6 border border-neutral-800 rounded-xl space-y-6">
          <h2 className="text-lg font-bold uppercase tracking-wider text-[#A00303] flex items-center gap-2">
            <ImageIcon size={18} /> Profil & Identité
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-2">Photo de profil (Lien / Chemin)</label>
              <input
                type="text"
                value={formData.image}
                placeholder="/PDP NSK.jpg ou https://..."
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm focus:border-[#A00303] outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-neutral-400 mb-2">Rôle principal</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm focus:border-[#A00303] outline-none"
              >
                <option value="rapper">Rappeur / Artiste</option>
                <option value="beatmaker">Beatmaker / Producteur</option>
                <option value="other">Autre / DJ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-neutral-400 mb-2">Style / Genre musical</label>
            <input
              type="text"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm focus:border-[#A00303] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-neutral-400 mb-2">Biographie</label>
            <textarea
              rows={4}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm focus:border-[#A00303] outline-none"
            />
          </div>
        </div>

        {/* VIDÉO A LA UNE (RAPPEURS / ARTISTES) */}
        {formData.type !== 'beatmaker' && (
          <div className="bg-neutral-950 p-6 border border-neutral-800 rounded-xl space-y-4">
            <h2 className="text-lg font-bold uppercase tracking-wider text-[#A00303] flex items-center gap-2">
              <Video size={18} /> Vidéo / Clip à la Une
            </h2>
            <p className="text-xs text-neutral-400 font-mono">
              Lien YouTube du clip ou de la prestation à afficher sur ta page.
            </p>
            <input
              type="text"
              value={formData.youtubeEmbed}
              placeholder="https://www.youtube.com/watch?v=..."
              onChange={(e) => setFormData({ ...formData, youtubeEmbed: e.target.value })}
              className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm focus:border-[#A00303] outline-none font-mono"
            />
          </div>
        )}

        {/* GESTION DES BEATS (BEATMAKERS) */}
        {formData.type === 'beatmaker' && (
          <div className="bg-neutral-950 p-6 border border-neutral-800 rounded-xl space-y-6">
            <h2 className="text-lg font-bold uppercase tracking-wider text-[#A00303] flex items-center gap-2">
              <Music size={18} /> Catalogue de Beats
            </h2>

            <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg space-y-4">
              <span className="text-xs font-mono font-bold uppercase text-neutral-300">Ajouter une prod</span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Titre de la prod"
                  value={newBeat.title}
                  onChange={(e) => setNewBeat({ ...newBeat, title: e.target.value })}
                  className="bg-neutral-950 border border-neutral-800 p-2.5 text-xs rounded text-white outline-none focus:border-[#A00303]"
                />
                <input
                  type="number"
                  placeholder="BPM"
                  value={newBeat.bpm || ''}
                  onChange={(e) => setNewBeat({ ...newBeat, bpm: Number(e.target.value) })}
                  className="bg-neutral-950 border border-neutral-800 p-2.5 text-xs rounded text-white outline-none focus:border-[#A00303]"
                />
                <input
                  type="number"
                  placeholder="Prix (€)"
                  value={newBeat.price || ''}
                  onChange={(e) => setNewBeat({ ...newBeat, price: Number(e.target.value) })}
                  className="bg-neutral-950 border border-neutral-800 p-2.5 text-xs rounded text-white outline-none focus:border-[#A00303]"
                />
                <button
                  type="button"
                  onClick={handleAddBeat}
                  className="bg-[#A00303] hover:bg-[#A00303]/80 text-white font-mono text-xs font-bold uppercase rounded p-2.5 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {formData.beats.map((beat) => (
                <div
                  key={beat.id}
                  className="flex items-center justify-between p-3 bg-neutral-900 border border-neutral-800 rounded font-mono text-xs"
                >
                  <div>
                    <span className="font-bold text-white uppercase">{beat.title}</span>
                    <span className="text-neutral-500 ml-3">{beat.bpm} BPM</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#A00303] font-bold">{beat.price} €</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBeat(beat.id)}
                      className="text-neutral-500 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RÉSEAUX SOCIAUX */}
        <div className="bg-neutral-950 p-6 border border-neutral-800 rounded-xl space-y-4">
          <h2 className="text-lg font-bold uppercase tracking-wider text-[#A00303]">Réseaux Sociaux</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="url"
              placeholder="Instagram URL"
              value={formData.instagramUrl || ''}
              onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
              className="bg-neutral-900 border border-neutral-800 rounded p-3 text-xs text-white outline-none focus:border-[#A00303]"
            />
            <input
              type="url"
              placeholder="YouTube URL"
              value={formData.youtubeUrl || ''}
              onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
              className="bg-neutral-900 border border-neutral-800 rounded p-3 text-xs text-white outline-none focus:border-[#A00303]"
            />
            <input
              type="url"
              placeholder="TikTok URL"
              value={formData.tiktokUrl || ''}
              onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
              className="bg-neutral-900 border border-neutral-800 rounded p-3 text-xs text-white outline-none focus:border-[#A00303]"
            />
            <input
              type="url"
              placeholder="Spotify URL"
              value={formData.spotifyUrl || ''}
              onChange={(e) => setFormData({ ...formData, spotifyUrl: e.target.value })}
              className="bg-neutral-900 border border-neutral-800 rounded p-3 text-xs text-white outline-none focus:border-[#A00303]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-[#A00303] hover:bg-[#A00303]/80 font-mono font-bold uppercase tracking-widest text-sm rounded transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save size={16} />
          {saving ? 'Enregistrement...' : 'Sauvegarder les modifications'}
        </button>
      </form>
    </div>
  );
};