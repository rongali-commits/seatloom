import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { useDemoState } from '@/lib/demo-store';
import { DemoProvider } from '@/lib/demo-context';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { HomePage } from '@/pages/HomePage';
import { WorkshopDetailPage } from '@/pages/WorkshopDetailPage';
import { OrganizerDemoPage } from '@/pages/OrganizerDemoPage';
import { SignUpPage } from '@/pages/SignUpPage';
import { LoginPage } from '@/pages/LoginPage';
import { StudioPage } from '@/pages/StudioPage';
import { StudioWorkshopEditPage, StudioWorkshopDetailPage } from '@/pages/StudioWorkshopEditPage';
import { PublicStudioPage } from '@/pages/PublicStudioPage';
import { PublicWorkshopPage } from '@/pages/PublicWorkshopPage';
import { MyBookingsPage } from '@/pages/MyBookingsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';

function NotFoundPage() {
  return (
    <div className="max-w-content mx-auto px-5 sm:px-8 py-24 text-center">
      <h1 className="text-display text-ink mb-4">Page not found</h1>
      <p className="text-ink-muted mb-6">The page you're looking for doesn't exist.</p>
      <a href="/" className="btn-primary">Back to home</a>
    </div>
  );
}

function AppShell() {
  const { state, dispatch, reset } = useDemoState();

  return (
    <DemoProvider state={state} dispatch={dispatch} reset={reset}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/workshops/:slug" element={<WorkshopDetailPage />} />
            <Route path="/demo/organizer" element={<OrganizerDemoPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/studio" element={<StudioPage />} />
            <Route path="/studio/workshops/new" element={<StudioWorkshopEditPage />} />
            <Route path="/studio/workshops/:workshopId" element={<StudioWorkshopDetailPage />} />
            <Route path="/s/:studioSlug" element={<PublicStudioPage />} />
            <Route path="/s/:studioSlug/:workshopSlug" element={<PublicWorkshopPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </DemoProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
