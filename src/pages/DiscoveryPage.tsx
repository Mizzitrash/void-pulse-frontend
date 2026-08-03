import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { Plus, Trash2, Film, Image as ImageIcon, Loader2 } from 'lucide-react';

export interface DiscoveryItem {
  id?: string;
  title: string;
  description?: string;
  type: 'image' | 'video';
  url: string;
  category?: string;
  createdAt: string;
}

export const DiscoveryPage: React.FC = () => {
  const { hasPermission } = useAuth();
  
  // Seuls les RÉALISATEURS, ADMINS ou FONDATEURS peuvent éditer
  const canEdit = hasPermission('REALISATEUR');

  const [items, setItems] = useState<DiscoveryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulaire
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'image' | 'video'>('image');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('GÉNÉRAL');
  const [submitting, setSubmitting] = useState(false);

  // Charger les éléments depuis Firestore
  const fetchItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'discovery_items'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DiscoveryItem[];
      setItems(fetched);
    } catch (err) {
      console.error("Erreur chargement discovery_items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Ajouter un média
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !title.trim()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'discovery_items'), {
        title,
        description,
        type,
        url,
        category: category.toUpperCase(),
        createdAt: new Date().toISOString()
      });

      setTitle('');
      setDescription('');
      setUrl('');
      setShowAddModal(false);
      fetchItems();
    } catch (err) {
      console.error("Erreur lors de l'ajout:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Supprimer un média
  const handleDeleteItem = async (id: string) => {
    if (!window.confirm("Supprimer ce média de la page découverte ?")) return;
    try {
      await deleteDoc(doc(db, 'discovery_items', id));
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Erreur de suppression:", err);
    }
  };

  // Rendu vidéo (YouTube / Vimeo / MP4 direct)
  const renderVideo = (videoUrl: string) => {
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.includes('youtu.be') 
        ? videoUrl.split('/').pop() 
        : videoUrl.split('v=')[1]?.split('&')[0];
      
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="Vidéo VØID"
          className="w-full h-full rounded-xl border border-neutral-900"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    return (
      <video controls className="w-full h-full object-cover rounded-xl border border-neutral-900">
        <source src={videoUrl} type="video/mp4" />
        Votre navigateur ne supporte pas la lecture vidéo.
      </video>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 space-y-8">
      
      {/* HEADER DE LA PAGE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-900 pb-6">
        <div>
          <h1 className="text-3xl font-black font-mono tracking-tight uppercase">
            EXPLORATION & VISUELS
          </h1>
          <p className="text-xs font-mono text-neutral-400 mt-1">
            Plonge dans les coulisses, clips et archives visuelles de VØID PULSE.
          </p>
        </div>

        {/* BOUTON ÉDITION RÉALISATEUR */}
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#A00303] hover:bg-red-700 text-white font-mono text-xs font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all shadow-lg cursor-pointer"
          >
            <Plus size={16} /> Ajouter un média
          </button>
        )}
      </div>

      {/* GRILLE DE MÉDIAS */}
      {loading ? (
        <div className="flex justify-center items-center py-20 text-neutral-500">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 font-mono text-xs text-neutral-600 border border-dashed border-neutral-900 rounded-2xl">
          AUCUN VISUEL OU VIDÉO POUR LE MOMENT.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden group flex flex-col justify-between relative"
            >
              {/* SUPPRESSION RÉALISATEUR */}
              {canEdit && item.id && (
                <button
                  onClick={() => handleDeleteItem(item.id!)}
                  className="absolute top-3 right-3 z-10 bg-black/80 hover:bg-red-600 text-neutral-400 hover:text-white p-2 rounded-lg transition-colors cursor-pointer border border-neutral-800"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              )}

              {/* CONTENU MÉDIA */}
              <div className="aspect-video w-full bg-black relative flex items-center justify-center overflow-hidden">
                {item.type === 'image' ? (
                  <img 
                    src={item.url} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  renderVideo(item.url)
                )}
              </div>

              {/* DÉTAILS */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono font-bold bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5 rounded uppercase">
                      {item.category || 'VISUEL'}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-500 flex items-center gap-1">
                      {item.type === 'video' ? <Film size={10} /> : <ImageIcon size={10} />}
                      {item.type.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm tracking-wide text-white uppercase font-mono">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-neutral-400 font-mono mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL AJOUT RÉALISATEUR */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-900 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-black font-mono uppercase tracking-wider text-white">
              AJOUTER UN NOUVEAU MÉDIA
            </h2>

            <form onSubmit={handleAddItem} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">TITRE</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Teaser Album VØID"
                  className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#A00303]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">TYPE</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'image' | 'video')}
                    className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#A00303]"
                  >
                    <option value="image">IMAGE / PHOTO</option>
                    <option value="video">VIDÉO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">CATÉGORIE</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex: CLIP, BACKSTAGE..."
                    className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#A00303]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">URL DU MÉDIA (Image ou Lien YouTube)</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#A00303]"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">DESCRIPTION (OPTIONNEL)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Quelques détails sur ce visuel..."
                  rows={3}
                  className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-white focus:outline-none focus:border-[#A00303]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white transition-colors uppercase cursor-pointer"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl bg-[#A00303] hover:bg-red-700 text-white font-bold uppercase transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  PUBLIER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};