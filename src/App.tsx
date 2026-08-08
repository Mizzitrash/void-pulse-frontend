import { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { IntroScreen } from './components/IntroScreen';
import { ArtistSection } from './components/ArtistSection';
import { CartDrawer } from './components/CartDrawer';

// Découpage du bundle par route. Avant, TOUT était dans un seul fichier
// JS : un visiteur anonyme téléchargeait AdminDashboard, EditArtistPage et
// CommunityManagerPage — du code auquel il n'aura jamais accès. Chaque
// import() ci-dessous devient un chunk séparé, chargé à la demande.
// Les pages du chemin critique (accueil : Navbar, ArtistSection, Intro)
// restent en import direct pour ne pas retarder le premier rendu.
const BeatsSection = lazy(() => import('./components/BeatsSection').then(m => ({ default: m.BeatsSection })));
const NewsSection = lazy(() => import('./components/NewsSection').then(m => ({ default: m.NewsSection })));
const CheckoutPage = lazy(() => import('./components/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const AuthPage = lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CommunityManagerPage = lazy(() => import('./pages/CommunityManagerPage').then(m => ({ default: m.CommunityManagerPage })));
const DiscoveryPage = lazy(() => import('./pages/DiscoveryPage').then(m => ({ default: m.DiscoveryPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ArtistDetailPage = lazy(() => import('./pages/ArtistDetailPage').then(m => ({ default: m.ArtistDetailPage })));
const EditArtistPage = lazy(() => import('./pages/EditArtistPage').then(m => ({ default: m.EditArtistPage })));
const JoinUsPage = lazy(() => import('./pages/JoinUsPage').then(m => ({ default: m.JoinUsPage })));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute').then(m => ({ default: m.ProtectedRoute })));

const INTRO_SESSION_KEY = 'void-pulse-intro-shown';

function shouldShowIntro(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) !== 'true';
  } catch {
    return true;
  }
}

function markIntroShown() {
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, 'true');
  } catch {
    /* navigation privée stricte : l'intro se rejouera, sans casser la page */
  }
}

/** Affiché pendant le téléchargement d'un chunk de route. */
function RouteFallback() {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <span className="text-xs font-mono uppercase tracking-widest text-neutral-500 animate-pulse">
        Chargement…
      </span>
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white relative selection:bg-void-accent selection:text-white pt-20">
      {/* Lien d'évitement : permet à un utilisateur au clavier de sauter
          la navigation. Invisible tant qu'il n'a pas le focus. */}
      <a
        href="#contenu-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:top-24 focus:left-4 focus:z-100 focus:px-4 focus:py-2 focus:bg-void-accent focus:text-white focus:rounded-xl focus:text-xs focus:font-mono focus:font-bold focus:uppercase"
      >
        Aller au contenu
      </a>
      <Navbar />
      <div id="contenu-principal">{children}</div>
      <CartDrawer onGoToCheckout={() => navigate('/checkout')} />
    </div>
  );
}

function HomePage({ showIntro, setShowIntro }: { showIntro: boolean; setShowIntro: (v: boolean) => void }) {
  const navigate = useNavigate();

  const scrollToArtists = () => {
    document.getElementById('artists-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <MainLayout>
      {showIntro && (
        <IntroScreen
          onComplete={() => {
            markIntroShown();
            setShowIntro(false);
          }}
        />
      )}

      <main className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 relative z-10 py-16">
        <span className="text-void-accent text-xs font-bold tracking-[0.4em] uppercase mb-4 animate-pulse drop-shadow-[0_0_8px_rgba(160,3,3,0.8)]">
          Pulse from the void
        </span>
        <h1 className="text-6xl md:text-9xl font-black tracking-tighter uppercase bg-linear-to-b from-white via-neutral-200 to-neutral-700 bg-clip-text text-transparent drop-shadow-2xl">
          VØID PULSE
        </h1>
        <p className="text-neutral-400 text-xs md:text-sm tracking-[0.25em] uppercase mt-6 max-w-md font-light leading-relaxed">
          Une nouvelle ère sonore. Reconstruire la musique à partir du vide.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
          <button
            onClick={() => navigate('/beats')}
            className="px-8 py-4 border border-white/20 text-xs font-bold tracking-[0.25em] uppercase bg-black hover:bg-void-accent hover:border-void-accent hover:text-white transition-all duration-500 shadow-lg hover:shadow-[0_0_20px_rgba(160,3,3,0.6)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-void-accent"
          >
            EXPLORER LES BEATS
          </button>
        </div>

        <button
          onClick={scrollToArtists}
          className="mt-12 flex flex-col items-center gap-2 text-neutral-500 hover:text-white transition-colors cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-void-accent"
          aria-label="Faire défiler jusqu'à la section Artistes"
        >
          <span className="text-[10px] font-mono uppercase tracking-widest group-hover:text-void-accent transition-colors">Artistes</span>
          <div className="w-5 h-9 rounded-full border-2 border-neutral-700 group-hover:border-void-accent flex justify-center pt-2 transition-colors">
            <div className="w-1 h-2 bg-neutral-400 group-hover:bg-void-accent rounded-full animate-bounce" />
          </div>
        </button>
      </main>

      <section id="artists-section" aria-label="Nos artistes">
        <ArtistSection />
      </section>
    </MainLayout>
  );
}

function BeatsPage() {
  const navigate = useNavigate();
  return <MainLayout><BeatsSection onOpenAuth={() => navigate('/auth')} /></MainLayout>;
}

function NewsPage() {
  return <MainLayout><NewsSection /></MainLayout>;
}

function JoinUsWrapper() {
  return <MainLayout><JoinUsPage /></MainLayout>;
}

function DiscoveryWrapper() {
  return <MainLayout><DiscoveryPage /></MainLayout>;
}

function ArtistDetailWrapper() {
  return <MainLayout><ArtistDetailPage /></MainLayout>;
}

function EditArtistWrapper() {
  return <MainLayout><EditArtistPage /></MainLayout>;
}

function ProfileWrapper() {
  return <MainLayout><ProfilePage /></MainLayout>;
}

function CommunityManagerWrapper() {
  return <MainLayout><CommunityManagerPage /></MainLayout>;
}

function AdminWrapper() {
  return <MainLayout><AdminDashboard /></MainLayout>;
}

function CheckoutWrapper() {
  const navigate = useNavigate();
  return <CheckoutPage onBack={() => navigate('/')} />;
}

function AuthWrapper() {
  const navigate = useNavigate();
  return <AuthPage onBack={() => navigate('/')} />;
}

export function App() {
  const [showIntro, setShowIntro] = useState(shouldShowIntro);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <Router>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage showIntro={showIntro} setShowIntro={setShowIntro} />} />
                <Route path="/beats" element={<BeatsPage />} />
                <Route path="/actu" element={<NewsPage />} />
                <Route path="/discovery" element={<DiscoveryWrapper />} />
                <Route path="/rejoins-nous" element={<JoinUsWrapper />} />

                <Route path="/artists/:id" element={<ArtistDetailWrapper />} />
                <Route path="/artist/edit/:id" element={<EditArtistWrapper />} />

                <Route path="/profile" element={<ProfileWrapper />} />

                <Route
                  path="/community-manager"
                  element={
                    <ProtectedRoute allowedRoles={['COMMUNITY_MANAGER', 'ADMIN']}>
                      <CommunityManagerWrapper />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'FONDATEUR']}>
                      <AdminWrapper />
                    </ProtectedRoute>
                  }
                />

                <Route path="/checkout" element={<CheckoutWrapper />} />
                <Route path="/auth" element={<AuthWrapper />} />
                <Route path="/login" element={<AuthWrapper />} />

                <Route path="*" element={<HomePage showIntro={false} setShowIntro={setShowIntro} />} />
              </Routes>
            </Suspense>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;