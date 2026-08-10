import { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { IntroScreen } from './components/IntroScreen';
import { ArtistSection } from './components/ArtistSection';
import { TeamSection } from './components/TeamSection';
import { MainLayout } from './components/MainLayout';
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
const MusicPage = lazy(() => import('./pages/MusicPage').then(m => ({ default: m.MusicPage })));
const ReleaseDetailPage = lazy(() => import('./pages/ReleaseDetailPage').then(m => ({ default: m.ReleaseDetailPage })));
const ReleasesAdminPage = lazy(() => import('./pages/ReleasesAdminPage').then(m => ({ default: m.ReleasesAdminPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then(m => ({ default: m.LegalPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const SubscribersPage = lazy(() => import('./pages/SubscribersPage').then(m => ({ default: m.SubscribersPage })));
const JoinUsPage = lazy(() => import('./pages/JoinUsPage').then(m => ({ default: m.JoinUsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

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

function ReleasesAdminWrapper() {
  return <MainLayout><ReleasesAdminPage /></MainLayout>;
}

function SubscribersWrapper() {
  return <MainLayout><SubscribersPage /></MainLayout>;
}

function AboutWrapper() {
  return <MainLayout><AboutPage /></MainLayout>;
}

function LegalWrapper() {
  return <MainLayout><LegalPage /></MainLayout>;
}

function PrivacyWrapper() {
  return <MainLayout><PrivacyPage /></MainLayout>;
}

function MusicWrapper() {
  return <MainLayout><MusicPage /></MainLayout>;
}

function ReleaseWrapper() {
  return <MainLayout><ReleaseDetailPage /></MainLayout>;
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

export function App() {
  const [showIntro, setShowIntro] = useState(shouldShowIntro);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <PlayerProvider>
          <Router>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomeWrapper showIntro={showIntro} setShowIntro={setShowIntro} />} />
                <Route path="/music" element={<MusicWrapper />} />
                <Route path="/music/:id" element={<ReleaseWrapper />} />
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

                <Route
                  path="/admin/sorties"
                  element={
                    <ProtectedRoute allowedRoles={['MANAGER', 'ADMIN', 'FONDATEUR']}>
                      <ReleasesAdminWrapper />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/newsletter"
                  element={
                    <ProtectedRoute allowedRoles={['COMMUNITY_MANAGER', 'MANAGER', 'ADMIN', 'FONDATEUR']}>
                      <SubscribersWrapper />
                    </ProtectedRoute>
                  }
                />

                <Route path="/a-propos" element={<AboutWrapper />} />
                <Route path="/mentions-legales" element={<LegalWrapper />} />
                <Route path="/confidentialite" element={<PrivacyWrapper />} />

                <Route path="/checkout" element={<CheckoutWrapper />} />
                <Route path="/auth" element={<AuthWrapper />} />
                <Route path="/login" element={<AuthWrapper />} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </Router>
          </PlayerProvider>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;