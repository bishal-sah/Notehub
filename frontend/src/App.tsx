/**
 * Main App component with routing configuration.
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Public pages
import LandingPage from '@/pages/public/LandingPage';
import LoginPage from '@/pages/public/LoginPage';
import RegisterPage from '@/pages/public/RegisterPage';
import AboutPage from '@/pages/public/AboutPage';
import FacultiesPage from '@/pages/public/FacultiesPage';
import BrowseNotesPage from '@/pages/public/BrowseNotesPage';
import NoteDetailPage from '@/pages/public/NoteDetailPage';
import ForgotPasswordPage from '@/pages/public/ForgotPasswordPage';
import NotFoundPage from '@/pages/public/NotFoundPage';

// User dashboard pages
import UserDashboard from '@/pages/dashboard/UserDashboard';
import UploadNote from '@/pages/dashboard/UploadNote';
import MyNotes from '@/pages/dashboard/MyNotes';
import EditNote from '@/pages/dashboard/EditNote';
import Profile from '@/pages/dashboard/Profile';
import ChangePassword from '@/pages/dashboard/ChangePassword';
import Notifications from '@/pages/dashboard/Notifications';

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
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faculties" element={<FacultiesPage />} />
          <Route path="/notes" element={<BrowseNotesPage />} />
          <Route path="/notes/:slug" element={<NoteDetailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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
      </AuthProvider>
    </BrowserRouter>
  );
}
