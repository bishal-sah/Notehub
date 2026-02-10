/**
 * API service functions for all NoteHub endpoints.
 */
import api from './api';
import type {
  LoginResponse,
  RegisterPayload,
  User,
  Notification,
  Faculty,
  FacultyDetail,
  SemesterListItem,
  Semester,
  Subject,
  NoteListItem,
  NoteDetail,
  PaginatedResponse,
  AdminDashboardResponse,
  NoteReport,
  DuplicatePair,
} from '@/types';

/* ─── Auth ────────────────────────────────────────────── */

export const authService = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login/', { email, password }),

  register: (data: RegisterPayload) =>
    api.post<LoginResponse & { message: string }>('/auth/register/', data),

  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),

  refreshToken: (refresh: string) =>
    api.post('/auth/token/refresh/', { refresh }),
};

/* ─── Profile ─────────────────────────────────────────── */

export const profileService = {
  get: () => api.get<User>('/auth/profile/'),

  update: (data: FormData) =>
    api.patch<User>('/auth/profile/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  changePassword: (data: { old_password: string; new_password: string; new_password_confirm: string }) =>
    api.post('/auth/change-password/', data),
};

/* ─── Notifications ───────────────────────────────────── */

export const notificationService = {
  list: (page = 1) =>
    api.get<PaginatedResponse<Notification>>('/auth/notifications/', { params: { page } }),

  unreadCount: () =>
    api.get<{ unread_count: number }>('/auth/notifications/unread-count/'),

  markRead: (id: number) =>
    api.post(`/auth/notifications/${id}/mark-read/`),

  markAllRead: () =>
    api.post('/auth/notifications/mark-read/'),
};

/* ─── Academics ───────────────────────────────────────── */

export const academicService = {
  faculties: () =>
    api.get<PaginatedResponse<Faculty>>('/academics/faculties/', { params: { page_size: 100 } }),

  facultyDetail: (slug: string) =>
    api.get<FacultyDetail>(`/academics/faculties/${slug}/`),

  semesters: (facultyId?: number) =>
    api.get<PaginatedResponse<SemesterListItem>>('/academics/semesters/', {
      params: { faculty: facultyId, page_size: 100 },
    }),

  semesterDetail: (id: number) =>
    api.get<Semester>(`/academics/semesters/${id}/`),

  subjects: (semesterId?: number, facultyId?: number) =>
    api.get<PaginatedResponse<Subject>>('/academics/subjects/', {
      params: { semester: semesterId, semester__faculty: facultyId, page_size: 100 },
    }),

  subjectDetail: (id: number) =>
    api.get<Subject>(`/academics/subjects/${id}/`),
};

/* ─── Notes ───────────────────────────────────────────── */

export const noteService = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<NoteListItem>>('/notes/', { params }),

  detail: (slug: string) =>
    api.get<NoteDetail>(`/notes/${slug}/`),

  download: (slug: string) =>
    api.post<{ file_url: string; downloads_count: number }>(`/notes/${slug}/download/`),

  search: (q: string) =>
    api.get('/notes/search/', { params: { q } }),

  // User notes
  myNotes: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<NoteListItem>>('/notes/user/my-notes/', { params }),

  upload: (data: FormData) =>
    api.post('/notes/user/upload/', data),

  update: (id: number, data: FormData) =>
    api.patch(`/notes/user/${id}/edit/`, data),

  delete: (id: number) =>
    api.delete(`/notes/user/${id}/delete/`),

  report: (data: { note: number; reason: string; description: string }) =>
    api.post('/notes/user/report/', data),
};

/* ─── Admin Notes ─────────────────────────────────────── */

export const adminNoteService = {
  pending: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<NoteListItem>>('/notes/admin/pending/', { params }),

  all: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<NoteListItem>>('/notes/admin/all/', { params }),

  detail: (id: number) =>
    api.get<NoteDetail>(`/notes/admin/${id}/`),

  approve: (id: number, reason = '') =>
    api.post(`/notes/admin/${id}/approve/`, { action: 'approved', reason }),

  reject: (id: number, reason: string) =>
    api.post(`/notes/admin/${id}/approve/`, { action: 'rejected', reason }),

  bulkApprove: (noteIds: number[], action: 'approved' | 'rejected', reason = '') =>
    api.post('/notes/admin/bulk-approve/', { note_ids: noteIds, action, reason }),

  approvalHistory: (params?: Record<string, string | number | undefined>) =>
    api.get('/notes/admin/approval-history/', { params }),

  reports: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<NoteReport>>('/notes/admin/reports/', { params }),

  resolveReport: (id: number) =>
    api.post(`/notes/admin/reports/${id}/resolve/`),

  duplicates: (threshold = 0.85) =>
    api.get<{ duplicates: DuplicatePair[] }>('/notes/admin/duplicates/', { params: { threshold } }),
};

/* ─── Admin Users ─────────────────────────────────────── */

export const adminUserService = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<PaginatedResponse<User>>('/auth/admin/users/', { params }),

  detail: (id: number) =>
    api.get<User>(`/auth/admin/users/${id}/`),

  update: (id: number, data: Partial<User>) =>
    api.patch(`/auth/admin/users/${id}/`, data),

  toggleActive: (id: number) =>
    api.post(`/auth/admin/users/${id}/toggle-active/`),

  verify: (id: number) =>
    api.post(`/auth/admin/users/${id}/verify/`),
};

/* ─── Admin Academics ─────────────────────────────────── */

export const adminAcademicService = {
  createFaculty: (data: Record<string, unknown>) =>
    api.post('/academics/admin/faculties/', data),
  updateFaculty: (id: number, data: Record<string, unknown>) =>
    api.patch(`/academics/admin/faculties/${id}/`, data),
  deleteFaculty: (id: number) =>
    api.delete(`/academics/admin/faculties/${id}/`),

  createSemester: (data: Record<string, unknown>) =>
    api.post('/academics/admin/semesters/', data),
  updateSemester: (id: number, data: Record<string, unknown>) =>
    api.patch(`/academics/admin/semesters/${id}/`, data),
  deleteSemester: (id: number) =>
    api.delete(`/academics/admin/semesters/${id}/`),

  createSubject: (data: Record<string, unknown>) =>
    api.post('/academics/admin/subjects/', data),
  updateSubject: (id: number, data: Record<string, unknown>) =>
    api.patch(`/academics/admin/subjects/${id}/`, data),
  deleteSubject: (id: number) =>
    api.delete(`/academics/admin/subjects/${id}/`),
};

/* ─── Dashboard ───────────────────────────────────────── */

export const dashboardService = {
  user: () =>
    api.get<{ stats: import('@/types').UserDashboardStats; recent_uploads: NoteListItem[] }>(
      '/dashboard/user/'
    ),

  admin: () =>
    api.get<AdminDashboardResponse>('/dashboard/admin/'),

  logs: (page = 1, pageSize = 50) =>
    api.get('/dashboard/admin/logs/', { params: { page, page_size: pageSize } }),
};
