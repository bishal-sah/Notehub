/**
 * Main App component with routing configuration.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ErrorBoundary from '@/components/layout/ErrorBoundary';

// Public pages
import LandingPage from '@/pages/public/LandingPage';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import AboutPage from '@/pages/public/AboutPage';
import FacultiesPage from '@/pages/public/FacultiesPage';
import BrowseNotesPage from '@/pages/public/BrowseNotesPage';
import NoteDetailPage from '@/pages/public/NoteDetailPage';
import ForgotPasswordPage from '@/pages/public/ForgotPasswordPage';
import ResetPassword from '@/pages/auth/ResetPassword';
import LeaderboardPage from '@/pages/public/LeaderboardPage';
import OfflineNotesPage from '@/pages/public/OfflineNotesPage';
import NotFoundPage from '@/pages/public/NotFoundPage';
import ResourceHubPage from '@/pages/public/ResourceHubPage';
import StudyAssistant from '@/components/ai/StudyAssistant';

// PWA components
import OfflineIndicator from '@/components/pwa/OfflineIndicator';
import PWAInstallBanner from '@/components/pwa/PWAInstallBanner';

// User dashboard pages
import UserDashboard from '@/pages/dashboard/UserDashboard';
import UploadNote from '@/pages/dashboard/UploadNote';
import MyNotes from '@/pages/dashboard/MyNotes';
import EditNote from '@/pages/dashboard/EditNote';
import Profile from '@/pages/dashboard/Profile';
import ChangePassword from '@/pages/dashboard/ChangePassword';
import Notifications from '@/pages/dashboard/Notifications';
import Collections from '@/pages/dashboard/Collections';
import StudyGroups from '@/pages/dashboard/StudyGroups';
import GroupDetail from '@/pages/dashboard/GroupDetail';
import Flashcards from '@/pages/dashboard/Flashcards';
import FlashcardReview from '@/pages/dashboard/FlashcardReview';
import VersionHistory from '@/pages/dashboard/VersionHistory';
import OcrScanner from '@/pages/dashboard/OcrScanner';
import StudyBuddies from '@/pages/dashboard/StudyBuddies';
import SemesterRoadmap from '@/pages/dashboard/SemesterRoadmap';
import Reputation from '@/pages/dashboard/Reputation';

// Admin pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import PendingApprovals from '@/pages/admin/PendingApprovals';
import AllNotes from '@/pages/admin/AllNotes';
import UserManagement from '@/pages/admin/UserManagement';
import FacultyManagement from '@/pages/admin/FacultyManagement';
import Duplicates from '@/pages/admin/Duplicates';
import Reports from '@/pages/admin/Reports';
import Settings from '@/pages/admin/Settings';

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faculties" element={<FacultiesPage />} />
          <Route path="/notes" element={<BrowseNotesPage />} />
          <Route path="/notes/:slug" element={<NoteDetailPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/offline" element={<OfflineNotesPage />} />
          <Route path="/resources" element={<ResourceHubPage />} />

          {/* User Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/dashboard/upload" element={<UploadNote />} />
              <Route path="/dashboard/my-notes" element={<MyNotes />} />
              <Route path="/dashboard/edit/:id" element={<EditNote />} />
              <Route path="/dashboard/profile" element={<Profile />} />
              <Route path="/dashboard/change-password" element={<ChangePassword />} />
              <Route path="/dashboard/notifications" element={<Notifications />} />
              <Route path="/dashboard/collections" element={<Collections />} />
              <Route path="/dashboard/groups" element={<StudyGroups />} />
              <Route path="/dashboard/groups/:id" element={<GroupDetail />} />
              <Route path="/dashboard/flashcards" element={<Flashcards />} />
              <Route path="/dashboard/flashcards/:id/review" element={<FlashcardReview />} />
              <Route path="/dashboard/versions/:noteId" element={<VersionHistory />} />
              <Route path="/dashboard/ocr" element={<OcrScanner />} />
              <Route path="/dashboard/study-buddies" element={<StudyBuddies />} />
              <Route path="/dashboard/roadmap" element={<SemesterRoadmap />} />
              <Route path="/dashboard/reputation" element={<Reputation />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute requireAdmin />}>
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/approvals" element={<PendingApprovals />} />
              <Route path="/admin/notes" element={<AllNotes />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/faculties" element={<FacultyManagement />} />
              <Route path="/admin/duplicates" element={<Duplicates />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <Toaster />
        <OfflineIndicator />
        <PWAInstallBanner />
        <StudyAssistant />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
