import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Camera, User, Mail, ShieldCheck, ArrowLeft, LogOut, Edit2, Check, X, Loader2, ShieldAlert, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

interface OrderItem {
  id: string;
  title: string;
  producer: string;
  price: number;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  createdAt?: Timestamp;
}

export const ProfilePage: React.FC = () => {
  const { profile, loading, logout, updateProfileData, firebaseUser } = useAuth();

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // --- Historique des commandes ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (profile?.username) {
      setUsernameInput(profile.username);
    }
  }, [profile]);

  useEffect(() => {
    if (!firebaseUser) {
      setOrdersLoading(false);
      return;
    }

    // Filtre sur `uid` (règle Firestore : un client ne lit que ses propres
    // commandes), triées de la plus récente à la plus ancienne.
    const q = query(
      collection(db, 'orders'),
      where('uid', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Order[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            items: data.items || [],
            total: data.total || 0,
            status: data.status || 'inconnu',
            createdAt: data.createdAt,
          };
        });
        setOrders(list);
        setOrdersLoading(false);
      },
      (error) => {
        console.error('Erreur lors du chargement des commandes :', error);
        setOrdersLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center font-mono text-xs">
        <p className="animate-pulse">CHARGEMENT DU PROFIL...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center pt-20">
        <p className="text-xs font-mono text-neutral-400 mb-4">Connecte-toi pour accéder à ton profil.</p>
        <Link to="/auth" className="px-4 py-2 bg-[#A00303] hover:bg-red-700 text-white text-xs font-mono font-bold rounded transition-colors">
          SE CONNECTER
        </Link>
      </div>
    );
  }

  const handleSaveUsername = async () => {
    if (!usernameInput.trim() || usernameInput === profile.username) {
      setIsEditingUsername(false);
      return;
    }

    setIsSaving(true);
    try {
      if (updateProfileData) {
        await updateProfileData({ username: usernameInput.trim() });
      }
      setIsEditingUsername(false);
    } catch (err) {
      alert("Erreur lors de la mise à jour du pseudo.");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Redimensionne l'image côté client et renvoie un Blob JPEG.
   * On garde la compression : elle divise le poids par 10 à 50 avant
   * l'envoi réseau, ce qui rend l'upload quasi instantané.
   */
  const resizeToBlob = (file: File, maxSize = 256): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Fichier image invalide'));
        img.onload = () => {
          let { width, height } = img;
          const ratio = Math.min(1, maxSize / Math.max(width, height));
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Conversion impossible'))),
            'image/jpeg',
            0.85
          );
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Choisis un fichier image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAvatarError('Image trop lourde (10 Mo maximum).');
      return;
    }

    setAvatarError(null);
    setIsSaving(true);
    try {
      // Avant : l'image était convertie en base64 (`canvas.toDataURL`) et
      // écrite DANS le document Firestore de l'utilisateur. Chaque profil
      // pesait alors des dizaines de Ko rechargés à chaque lecture — y
      // compris par AdminDashboard qui lit toute la collection `users`.
      // On envoie maintenant le fichier dans Storage (bucket déjà prévu
      // par storage.rules) et on ne stocke que son URL dans Firestore.
      const blob = await resizeToBlob(file);
      const avatarRef = ref(storage, `avatars/${profile.id}/avatar.jpg`);
      await uploadBytes(avatarRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(avatarRef);

      if (updateProfileData) {
        await updateProfileData({ avatarUrl: url });
      }
    } catch (err) {
      console.error("Erreur lors de l'envoi de l'avatar :", err);
      setAvatarError("Impossible d'enregistrer l'image. Réessaie.");
    } finally {
      setIsSaving(false);
      e.target.value = '';
    }
  };

  const isAdmin = profile.roles?.includes('ADMIN');

  const filteredRoles = profile.roles?.filter(
    role => profile.roles.length === 1 || role.toUpperCase() !== 'USER'
  ) || [];

  const formatOrderDate = (ts?: Timestamp) => {
    if (!ts) return '';
    return ts.toDate().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pt-28 pb-16 px-6 max-w-4xl mx-auto">

      <div className="flex items-center justify-between mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors uppercase"
        >
          <ArrowLeft size={16} /> Retour au site
        </Link>

        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 text-xs font-mono bg-neutral-900 border border-[#A00303]/50 text-red-500 hover:bg-[#A00303] hover:text-white px-3 py-1.5 rounded transition-all uppercase font-bold"
            >
              <ShieldAlert size={14} /> Panel Admin
            </Link>
          )}

          <button
            onClick={logout}
            className="inline-flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-red-400 transition-colors uppercase cursor-pointer"
          >
            <LogOut size={14} /> Déconnexion
          </button>
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-8 shadow-2xl space-y-8">

        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-neutral-900">

          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-900 border-2 border-neutral-800 flex items-center justify-center relative">
              {isSaving ? (
                <Loader2 size={24} className="animate-spin text-[#A00303]" />
              ) : profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-neutral-600" />
              )}
            </div>

            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-[#A00303] hover:bg-red-700 text-white p-2 rounded-full cursor-pointer transition-all shadow-lg group-hover:scale-110"
              title="Changer la photo de profil"
            >
              <Camera size={14} />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              disabled={isSaving}
            />
            {avatarError && (
              <p role="alert" className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 text-center text-[10px] font-mono text-red-400">
                {avatarError}
              </p>
            )}
          </div>

          <div className="text-center sm:text-left space-y-2 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">

              {isEditingUsername ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="bg-neutral-900 border border-neutral-700 text-white px-3 py-1 rounded text-lg font-bold font-mono focus:outline-none focus:border-[#A00303]"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveUsername}
                    disabled={isSaving}
                    className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => { setIsEditingUsername(false); setUsernameInput(profile.username || ''); }}
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingUsername(true)}>
                  <h1 className="text-2xl font-black uppercase tracking-tight">
                    {profile.username || 'MEMBRE VØID'}
                  </h1>
                  <Edit2 size={14} className="text-neutral-500 group-hover:text-white transition-colors" />
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {filteredRoles.map((r, i) => {
                  const displayRole = r.toUpperCase() === 'USER' ? 'MEMBRE' : r;
                  return (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.toUpperCase() === 'ADMIN' || r.toUpperCase() === 'FONDATEUR'
                          ? 'bg-[#A00303] text-white'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-300'
                      }`}
                    >
                      {displayRole}
                    </span>
                  );
                })}
              </div>
            </div>

            <p className="text-xs font-mono text-neutral-400 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail size={12} className="text-neutral-500" /> {profile.email}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <ShieldCheck size={14} className="text-[#A00303]" /> DÉTAILS DU COMPTE
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div className="bg-black p-4 rounded-xl border border-neutral-900 space-y-1">
              <p className="text-[10px] text-neutral-500 uppercase">IDENTIFIANT UNIQUE (ID)</p>
              <p className="text-white text-[11px] truncate">{profile.id}</p>
            </div>

            <div className="bg-black p-4 rounded-xl border border-neutral-900 space-y-1">
              <p className="text-[10px] text-neutral-500 uppercase">RÔLES ATTRIBUÉS</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {filteredRoles.map((r, i) => {
                  const displayRole = r.toUpperCase() === 'USER' ? 'MEMBRE' : r;
                  return (
                    <span key={i} className="text-[10px] bg-neutral-900 px-2 py-0.5 rounded text-neutral-300 border border-neutral-800 font-bold uppercase">
                      {displayRole}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* HISTORIQUE DES COMMANDES */}
        <div className="space-y-4">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <Package size={14} className="text-[#A00303]" /> MES COMMANDES ({orders.length})
          </h2>

          {ordersLoading ? (
            <div className="flex items-center gap-2 text-neutral-500 text-xs font-mono py-6 justify-center">
              <Loader2 className="animate-spin" size={16} /> Chargement des commandes...
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-black p-6 rounded-xl border border-dashed border-neutral-900 text-center">
              <p className="text-xs font-mono text-neutral-500">Aucune commande pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div key={order.id} className="bg-black p-4 rounded-xl border border-neutral-900">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-neutral-500">
                      {formatOrderDate(order.createdAt)}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                      {order.status === 'simulated' ? 'Simulée' : order.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs font-mono">
                        <span className="text-neutral-300">{item.title} <span className="text-neutral-600">— {item.producer}</span></span>
                        <span className="text-white">{item.price} €</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs font-mono font-bold pt-2 mt-2 border-t border-neutral-900">
                    <span className="text-neutral-400">Total</span>
                    <span className="text-[#A00303]">{order.total.toFixed(2)} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};