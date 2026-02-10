/* ─── User Types ──────────────────────────────────────── */

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'user';
  avatar: string | null;
  bio: string;
  phone: string;
  faculty: number | null;
  faculty_name: string | null;
  is_verified: boolean;
  total_notes: number;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  faculty?: number | null;
}

/* ─── Notification Types ─────────────────────────────── */

export interface Notification {
  id: number;
  title: string;
  message: string;
  notification_type: 'note_approved' | 'note_rejected' | 'note_uploaded' | 'system';
  is_read: boolean;
  link: string;
  created_at: string;
}

/* ─── Academic Types ─────────────────────────────────── */

export interface Faculty {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string | null;
  total_notes: number;
  semester_count: number;
  user_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Semester {
  id: number;
  faculty: number;
  number: number;
  name: string;
  subjects: Subject[];
  subject_count: number;
  is_active: boolean;
  created_at: string;
}

export interface SemesterListItem {
  id: number;
  faculty: number;
  number: number;
  name: string;
  subject_count: number;
  is_active: boolean;
}

export interface Subject {
  id: number;
  name: string;
  slug: string;
  code: string;
  description: string;
  credit_hours: number;
  semester: number;
  semester_number: number;
  faculty_name: string;
  total_notes: number;
  is_active: boolean;
  created_at: string;
}

export interface FacultyDetail extends Faculty {
  semesters: Semester[];
}

/* ─── Note Types ─────────────────────────────────────── */

export interface NoteListItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  file_type: string;
  file_size: number;
  file_size_display: string;
  thumbnail: string | null;
  subject: number;
  subject_name: string;
  semester_number: number;
  faculty_name: string;
  faculty_slug: string;
  author: number;
  author_name: string;
  author_username: string;
  status: 'pending' | 'approved' | 'rejected';
  views_count: number;
  downloads_count: number;
  created_at: string;
}

export interface NoteDetail extends NoteListItem {
  file: string;
  author_avatar: string | null;
  semester_id: number;
  faculty_id: number;
  rejection_reason: string;
  updated_at: string;
}

/* ─── Dashboard Types ────────────────────────────────── */

export interface UserDashboardStats {
  total_notes: number;
  approved_notes: number;
  pending_notes: number;
  rejected_notes: number;
  total_views: number;
  total_downloads: number;
}

export interface AdminDashboardStats {
  total_users: number;
  total_notes: number;
  approved_notes: number;
  pending_notes: number;
  rejected_notes: number;
  total_faculties: number;
  total_subjects: number;
  total_views: number;
  total_downloads: number;
  new_users_month: number;
  new_notes_month: number;
  unresolved_reports: number;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

export interface FacultyChartData {
  name: string;
  note_count: number;
}

export interface AdminDashboardResponse {
  stats: AdminDashboardStats;
  charts: {
    notes_per_faculty: FacultyChartData[];
    uploads_over_time: ChartDataPoint[];
    registrations_over_time: ChartDataPoint[];
  };
  top_uploaders: { id: number; username: string; email: string; note_count: number }[];
  recent_approvals: {
    id: number;
    note__title: string;
    admin__username: string;
    action: string;
    reason: string;
    created_at: string;
  }[];
}

/* ─── Paginated Response ─────────────────────────────── */

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/* ─── Report Types ───────────────────────────────────── */

export interface NoteReport {
  id: number;
  note: number;
  note_title: string;
  reported_by: number;
  reported_by_name: string;
  reason: string;
  description: string;
  is_resolved: boolean;
  created_at: string;
}

/* ─── Duplicate Types ────────────────────────────────── */

export interface DuplicatePair {
  note_1: { id: number; title: string; author: string };
  note_2: { id: number; title: string; author: string };
  similarity_score: number;
}
