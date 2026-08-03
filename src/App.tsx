import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { IntroScreen } from './components/IntroScreen';
import { ArtistSection } from './components/ArtistSection';
import { BeatsSection } from './components/BeatsSection';
import { NewsSection } from './components/NewsSection';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutPage } from './components/CheckoutPage';
import { AuthPage } from './components/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { CommunityManagerPage } from './pages/CommunityManagerPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ArtistDetailPage } from './pages/ArtistDetailPage';
import { EditArtistPage } from './pages/EditArtistPage';

// LAYOUT PRINCIPAL (Navbar + Panier sur toutes les pages)
function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white relative selection:bg-[#A00303] selection:text-white pt-20">
      <Navbar />
      {children}
      <CartDrawer onGoToCheckout={() => navigate('/checkout')} />
    </div>
  );
}

// 1. PAGE D'ACCUEIL
function HomePage({ showIntro, setShowIntro }: { showIntro: boolean; setShowIntro: (v: boolean) => void }) {
  const navigate = useNavigate();

  const scrollToArtists = () => {
    const artistElem = document.getElementById('artists-section');
    artistElem?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <MainLayout>
      {showIntro && <IntroScreen onComplete={() => setShowIntro(false)} />}

      <main className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 relative z-10 py-16">
        <span className="text-[#A00303] text-xs font-bold tracking-[0.4em] uppercase mb-4 animate-pulse drop-shadow-[0_0_8px_rgba(160,3,3,0.8)]">
          Pulse from the void
        </span>
        <h1 className="text-6xl md:text-9xl font-black tracking-tighter uppercase bg-gradient-to-b from-white via-neutral-200 to-neutral-700 bg-clip-text text-transparent drop-shadow-2xl">
          VØID PULSE
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm tracking-[0.25em] uppercase mt-6 max-w-md font-light leading-relaxed">
          Une nouvelle ère sonore. Reconstruire la musique à partir du vide.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
          <button 
            onClick={() => navigate('/beats')}
            className="px-8 py-4 border border-white/20 text-xs font-bold tracking-[0.25em] uppercase bg-black hover:bg-[#A00303] hover:border-[#A00303] hover:text-white transition-all duration-500 shadow-lg hover:shadow-[0_0_20px_rgba(160,3,3,0.6)] cursor-pointer"
          >
            EXPLORER LES BEATS
          </button>
        </div>

        <button 
          onClick={scrollToArtists}
          className="mt-12 flex flex-col items-center gap-2 text-neutral-500 hover:text-white transition-colors cursor-pointer group"
          aria-label="Voir la suite"
        >
          <span className="text-[10px] font-mono uppercase tracking-widest group-hover:text-[#A00303] transition-colors">Artistes</span>
          <div className="w-5 h-9 rounded-full border-2 border-neutral-700 group-hover:border-[#A00303] flex justify-center pt-2 transition-colors">
            <div className="w-1 h-2 bg-neutral-400 group-hover:bg-[#A00303] rounded-full animate-bounce" />
          </div>
        </button>
      </main>

      <div id="artists-section">
        <ArtistSection />
      </div>
    </MainLayout>
  );
}

// 2. PAGE BEATS
function BeatsPage() {
  const navigate = useNavigate();
  return (
    <MainLayout>
      <BeatsSection onOpenAuth={() => navigate('/auth')} />
    </MainLayout>
  );
}

// 3. PAGE ACTU
function NewsPage() {
  return (
    <MainLayout>
      <NewsSection />
    </MainLayout>
  );
}

// 4. PAGE DÉCOUVERTE
function DiscoveryWrapper() {
  return (
    <MainLayout>
      <DiscoveryPage />
    </MainLayout>
  );
}

// 5. PAGE DÉTAIL ARTISTE
function ArtistDetailWrapper() {
  return (
    <MainLayout>
      <ArtistDetailPage />
    </MainLayout>
  );
}

// 6. PAGE ÉDITION ARTISTE
function EditArtistWrapper() {
  return (
    <MainLayout>
      <EditArtistPage />
    </MainLayout>
  );
}

// 7. PAGE PROFIL
function ProfileWrapper() {
  return (
    <MainLayout>
      <ProfilePage />
    </MainLayout>
  );
}

// 8. PAGE COMMUNITY MANAGER
function CommunityManagerWrapper() {
  return (
    <MainLayout>
      <CommunityManagerPage />
    </MainLayout>
  );
}

// 9. PAGE ADMIN DASHBOARD
function AdminWrapper() {
  return (
    <MainLayout>
      <AdminDashboard />
    </MainLayout>
  );
}

// 10. PAGE CHECKOUT
function CheckoutWrapper() {
  const navigate = useNavigate();
  return <CheckoutPage onBack={() => navigate('/')} />;
}

// 11. PAGE AUTH / LOGIN
function AuthWrapper() {
  const navigate = useNavigate();
  return <AuthPage onBack={() => navigate('/')} />;
}

// APPLICATION RACINE UNIQUE
export function App() {
  const [showIntro, setShowIntro] = useState(true);

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage showIntro={showIntro} setShowIntro={setShowIntro} />} />
            <Route path="/beats" element={<BeatsPage />} />
            <Route path="/actu" element={<NewsPage />} />
            <Route path="/discovery" element={<DiscoveryWrapper />} />
            
            {/* ROUTES DES ARTISTES */}
            <Route path="/artists/:id" element={<ArtistDetailWrapper />} />
            <Route path="/artist/edit/:id" element={<EditArtistWrapper />} />

            {/* ROUTE PROFIL */}
            <Route path="/profile" element={<ProfileWrapper />} />

            {/* ROUTE PROTÉGÉE COMMUNITY MANAGER */}
            <Route 
              path="/community-manager" 
              element={
                <ProtectedRoute allowedRoles={['COMMUNITY_MANAGER', 'ADMIN']}>
                  <CommunityManagerWrapper />
                </ProtectedRoute>
              } 
            />

            {/* ROUTE PROTÉGÉE ADMIN DASHBOARD */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR']}>
                  <AdminWrapper />
                </ProtectedRoute>
              } 
            />

            <Route path="/checkout" element={<CheckoutWrapper />} />
            
            {/* ROUTES D'AUTHENTIFICATION */}
            <Route path="/auth" element={<AuthWrapper />} />
            <Route path="/login" element={<AuthWrapper />} />

            {/* REDIRECTION SI LA ROUTE N'EXISTE PAS */}
            <Route path="*" element={<HomePage showIntro={false} setShowIntro={setShowIntro} />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;