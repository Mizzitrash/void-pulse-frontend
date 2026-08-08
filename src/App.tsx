import { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Link } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { IntroScreen } from './components/IntroScreen';
import { ArtistSection } from './components/ArtistSection';
import { TeamSection } from './components/TeamSection';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
// ProtectedRoute reste en import direct : il ne pèse que ~0,5 Ko, et le
// charger en lazy créait une cascade réseau — il fallait attendre son
// chunk AVANT que celui de la page protégée ne commence à se télécharger.
import { ProtectedRoute } from './components/ProtectedRoute';
import { RequireAuth } from './components/RequireAuth';

// Découpage du bundle par route : chaque import() devient un chunk chargé
// à la demande. Les éléments du chemin critique (Navbar, ArtistSection,
// IntroScreen) restent en import direct pour ne pas retarder le premier rendu.
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
const SubmissionsPage = lazy(() => import('./pages/SubmissionsPage').then(m => ({ default: m.SubmissionsPage })));
const JoinUsPage = lazy(() => import('./pages/JoinUsPage').then(m => ({ default: m.JoinUsPage })));

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
      {/* <main> plutôt qu'un <div> neutre : c'est le repère que les lecteurs
          d'écran utilisent pour sauter directement au contenu. Il n'y en
          avait aucun sur les pages autres que l'accueil. */}
      <main id="contenu-principal">{children}</main>
      <Footer />
      <CartDrawer onGoToCheckout={() => navigate('/checkout')} />
    </div>
  );
}

function HomeWrapper({ showIntro, setShowIntro }: { showIntro: boolean; setShowIntro: (v: boolean) => void }) {
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
      <HomePage showIntro={showIntro} />
      <section id="artists-section" aria-label="Nos artistes">
        <ArtistSection />
      </section>
      <TeamSection />
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

function SubmissionsWrapper() {
  return <MainLayout><SubmissionsPage /></MainLayout>;
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

function NotFoundPage() {
  return (
    <MainLayout>
      <section className="min-h-[60vh] flex flex-col items-center justify-center px-6 py-24 text-center">
        <span className="text-xs font-mono font-bold uppercase tracking-[0.3em] text-void-accent">
          Erreur 404
        </span>
        <h1 className="mt-6 text-4xl font-black uppercase tracking-tight text-white">
          Page introuvable
        </h1>
        <p className="mt-4 max-w-xl text-sm text-neutral-400">
          La page que vous cherchez n’existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center rounded-full border border-white/20 px-6 py-3 text-xs font-mono font-bold uppercase tracking-widest text-white transition hover:bg-white hover:text-black"
        >
          Retour à l’accueil
        </Link>
      </section>
    </MainLayout>
  );
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
                <Route path="/" element={<HomeWrapper showIntro={showIntro} setShowIntro={setShowIntro} />} />
                <Route path="/beats" element={<BeatsPage />} />
                <Route path="/actu" element={<NewsPage />} />
                <Route path="/discovery" element={<DiscoveryWrapper />} />
                <Route
                  path="/rejoins-nous"
                  element={
                    <RequireAuth>
                      <JoinUsWrapper />
                    </RequireAuth>
                  }
                />

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

                <Route
                  path="/candidatures"
                  element={
                    <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN', 'FONDATEUR']}>
                      <SubmissionsWrapper />
                    </ProtectedRoute>
                  }
                />

                <Route path="/checkout" element={<CheckoutWrapper />} />
                <Route path="/auth" element={<AuthWrapper />} />
                <Route path="/login" element={<AuthWrapper />} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </Router>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;