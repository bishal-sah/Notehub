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
  NoteComment,
  NoteAnnotation,
  PaginatedResponse,
  AdminDashboardResponse,
  NoteReport,
  DuplicatePair,
  LeaderboardEntry,
  Badge,
  MyGamification,
  NoteRating,
  Collection,
  Bookmark,
  BookmarkStatus,
  StudyGroup,
  GroupMember,
  GroupMessage,
  GroupPinnedNote,
  FlashcardDeck,
  Flashcard,
  NoteVersion,
  VersionDiff,
  OcrResult,
  OcrStatus,
  NoteLayer,
  NoteLayerCreate,
  LearningStats,
  WeeklyLearningReport,
  NoteSummary,
  ExamModeData,
  ConceptSimplification,
  SemesterPack,
  GeneratedTest,
  TopperStatus,
  BuddyMatchResponse,
  BuddyListResponse,
  SemesterRoadmapResponse,
  Resource,
  ResourceStats,
  ChatSessionItem,
  ChatSessionDetail,
  ChatSendResponse,
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

  requestPasswordReset: (email: string) =>
    api.post<{ message: string }>('/auth/password-reset/', { email }),

  confirmPasswordReset: (token: string, new_password: string) =>
    api.post<{ message: string }>('/auth/password-reset/confirm/', { token, new_password }),
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

  /** Returns the preview URL for in-browser viewing (no download count increment). */
  previewUrl: (slug: string) => `/api/notes/${slug}/preview/`,

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

/* ─── Comments ───────────────────────────────────────── */

export const commentService = {
  list: (slug: string) =>
    api.get<NoteComment[]>(`/notes/${slug}/comments/`),

  create: (data: { note: number; parent?: number | null; body: string; is_question?: boolean }) =>
    api.post<NoteComment>('/notes/comments/create/', data),

  update: (id: number, body: string) =>
    api.patch<NoteComment>(`/notes/comments/${id}/`, { body }),

  delete: (id: number) =>
    api.delete(`/notes/comments/${id}/`),

  vote: (id: number) =>
    api.post<{ voted: boolean; vote_count: number }>(`/notes/comments/${id}/vote/`),

  bestAnswer: (id: number) =>
    api.post<{ is_best_answer: boolean; comment_id: number }>(`/notes/comments/${id}/best-answer/`),
};

/* ─── Annotations ────────────────────────────────────── */

export const annotationService = {
  list: (slug: string) =>
    api.get<NoteAnnotation[]>(`/notes/${slug}/annotations/`),

  create: (data: {
    note: number;
    page_number: number;
    x: number;
    y: number;
    width: number;
    height: number;
    selected_text?: string;
    body: string;
    color?: string;
  }) =>
    api.post<NoteAnnotation>('/notes/annotations/create/', data),

  update: (id: number, data: Partial<{ body: string; color: string; is_resolved: boolean }>) =>
    api.patch<NoteAnnotation>(`/notes/annotations/${id}/`, data),

  delete: (id: number) =>
    api.delete(`/notes/annotations/${id}/`),
};

/* ─── Dashboard ───────────────────────────────────────── */

export const dashboardService = {
  user: () =>
    api.get<import('@/types').UserDashboardResponse>('/dashboard/user/'),

  admin: () =>
    api.get<AdminDashboardResponse>('/dashboard/admin/'),

  logs: (page = 1, pageSize = 50) =>
    api.get('/dashboard/admin/logs/', { params: { page, page_size: pageSize } }),
};

/* ─── Gamification ────────────────────────────────────── */

export const gamificationService = {
  leaderboard: (facultyId?: number) =>
    api.get<LeaderboardEntry[]>('/gamification/leaderboard/', {
      params: facultyId ? { faculty: facultyId } : undefined,
    }),

  me: () =>
    api.get<MyGamification>('/gamification/me/'),

  badges: () =>
    api.get<Badge[]>('/gamification/badges/'),
};

/* ─── Ratings & Reviews ──────────────────────────────── */

export const ratingService = {
  list: (slug: string) =>
    api.get<NoteRating[]>(`/notes/${slug}/ratings/`),

  myRating: (slug: string) =>
    api.get<NoteRating>(`/notes/${slug}/my-rating/`),

  create: (data: { note: number; rating: number; review?: string }) =>
    api.post<NoteRating>('/notes/ratings/create/', data),

  delete: (id: number) =>
    api.delete(`/notes/ratings/${id}/`),
};

/* ─── Bookmarks & Collections ─────────────────────── */

export const collectionService = {
  list: () =>
    api.get<Collection[]>('/notes/collections/'),

  create: (data: { name: string; description?: string }) =>
    api.post<Collection>('/notes/collections/', data),

  detail: (id: number) =>
    api.get<Collection>(`/notes/collections/${id}/`),

  update: (id: number, data: Partial<{ name: string; description: string }>) =>
    api.patch<Collection>(`/notes/collections/${id}/`, data),

  delete: (id: number) =>
    api.delete(`/notes/collections/${id}/`),

  bookmarks: (id: number) =>
    api.get<Bookmark[]>(`/notes/collections/${id}/bookmarks/`),
};

export const bookmarkService = {
  all: () =>
    api.get<Bookmark[]>('/notes/bookmarks/'),

  toggle: (noteId: number, collectionId?: number | null) =>
    api.post<{ bookmarked: boolean; bookmark?: Bookmark; message?: string }>(
      '/notes/bookmarks/toggle/',
      { note_id: noteId, collection_id: collectionId ?? null },
    ),

  status: (noteId: number) =>
    api.get<BookmarkStatus>(`/notes/bookmarks/status/${noteId}/`),

  move: (bookmarkIds: number[], collectionId: number | null) =>
    api.post<{ moved: number }>('/notes/bookmarks/move/', {
      bookmark_ids: bookmarkIds,
      collection_id: collectionId,
    }),

  update: (id: number, data: Partial<{ personal_note: string; highlight_color: string; is_offline: boolean }>) =>
    api.patch<Bookmark>(`/notes/bookmarks/${id}/`, data),
};

/* ─── Study Groups ───────────────────────────────── */

export const groupService = {
  myGroups: () =>
    api.get<StudyGroup[]>('/groups/'),

  create: (data: { name: string; description?: string; subject?: number | null; avatar_color?: string }) =>
    api.post<StudyGroup>('/groups/create/', data),

  detail: (id: number) =>
    api.get<StudyGroup>(`/groups/${id}/`),

  update: (id: number, data: Partial<{ name: string; description: string; avatar_color: string; subject: number | null }>) =>
    api.patch<StudyGroup>(`/groups/${id}/`, data),

  delete: (id: number) =>
    api.delete(`/groups/${id}/`),

  join: (inviteCode: string) =>
    api.post<StudyGroup>('/groups/join/', { invite_code: inviteCode }),

  leave: (id: number) =>
    api.post('/groups/' + id + '/leave/'),

  members: (id: number) =>
    api.get<GroupMember[]>(`/groups/${id}/members/`),

  removeMember: (groupId: number, userId: number) =>
    api.post(`/groups/${groupId}/members/${userId}/remove/`),

  promoteMember: (groupId: number, userId: number) =>
    api.post(`/groups/${groupId}/members/${userId}/promote/`),

  messages: (id: number, before?: number) =>
    api.get<GroupMessage[]>(`/groups/${id}/messages/`, {
      params: before ? { before } : undefined,
    }),

  sendMessage: (id: number, content: string) =>
    api.post<GroupMessage>(`/groups/${id}/messages/`, { content }),

  deleteMessage: (groupId: number, msgId: number) =>
    api.delete(`/groups/${groupId}/messages/${msgId}/`),

  pinnedNotes: (id: number) =>
    api.get<GroupPinnedNote[]>(`/groups/${id}/pins/`),

  pinNote: (groupId: number, noteId: number, comment?: string) =>
    api.post<GroupPinnedNote>(`/groups/${groupId}/pins/`, { note_id: noteId, comment: comment ?? '' }),

  unpinNote: (groupId: number, pinId: number) =>
    api.delete(`/groups/${groupId}/pins/${pinId}/`),
};

/* ─── Flashcards ─────────────────────────────────── */

export const flashcardService = {
  generate: (noteId: number, maxCards?: number) =>
    api.post<FlashcardDeck>('/notes/flashcards/generate/', {
      note_id: noteId,
      ...(maxCards ? { max_cards: maxCards } : {}),
    }),

  myDecks: () =>
    api.get<FlashcardDeck[]>('/notes/flashcards/decks/'),

  deckDetail: (id: number) =>
    api.get<FlashcardDeck>(`/notes/flashcards/decks/${id}/`),

  deleteDeck: (id: number) =>
    api.delete(`/notes/flashcards/decks/${id}/`),

  dueCards: (deckId: number) =>
    api.get<Flashcard[]>(`/notes/flashcards/decks/${deckId}/due/`),

  reviewCard: (cardId: number, quality: 0 | 3 | 4 | 5) =>
    api.post<Flashcard>(`/notes/flashcards/cards/${cardId}/review/`, { quality }),

  editCard: (cardId: number, data: Partial<{ question: string; answer: string }>) =>
    api.patch<Flashcard>(`/notes/flashcards/cards/${cardId}/`, data),

  deleteCard: (cardId: number) =>
    api.delete(`/notes/flashcards/cards/${cardId}/`),
};

/* ─── Version History ─────────────────────────────── */

export const versionService = {
  list: (noteId: number) =>
    api.get<NoteVersion[]>(`/notes/${noteId}/versions/`),

  detail: (noteId: number, versionId: number) =>
    api.get<NoteVersion>(`/notes/${noteId}/versions/${versionId}/`),

  diff: (noteId: number, aId: number, bId: number) =>
    api.get<VersionDiff>(`/notes/${noteId}/versions/diff/`, {
      params: { a: aId, b: bId },
    }),

  restore: (noteId: number, versionId: number) =>
    api.post(`/notes/${noteId}/versions/${versionId}/restore/`),
};

/* ─── OCR ──────────────────────────────────────── */

export const ocrService = {
  upload: (formData: FormData) =>
    api.post<OcrResult>('/notes/ocr/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  status: (noteId: number) =>
    api.get<OcrStatus>(`/notes/ocr/status/${noteId}/`),

  retry: (noteId: number) =>
    api.post<OcrResult>('/notes/ocr/retry/', { note_id: noteId }),

  search: (query: string) =>
    api.get<{ results: any[]; count: number }>('/notes/ocr/search/', {
      params: { q: query },
    }),
};

/* ─── Collaborative Note Layers ──────────────────────── */

export const layerService = {
  list: (slug: string) =>
    api.get<{ layers: NoteLayer[]; count: number }>(`/notes/${slug}/layers/`),

  create: (slug: string, data: NoteLayerCreate) =>
    api.post<NoteLayer>(`/notes/${slug}/layers/create/`, data),

  update: (id: number, data: Partial<NoteLayerCreate>) =>
    api.patch<NoteLayer>(`/notes/layers/${id}/`, data),

  delete: (id: number) =>
    api.delete(`/notes/layers/${id}/`),

  vote: (id: number, voteType: 'up' | 'down') =>
    api.post<NoteLayer>(`/notes/layers/${id}/vote/`, { vote_type: voteType }),

  pin: (id: number) =>
    api.post<NoteLayer>(`/notes/layers/${id}/pin/`),
};

/* ─── Learning Tracker ───────────────────────────────── */

export const learningService = {
  ping: (noteId: number, elapsed: number = 30) =>
    api.post<{ session_id: number; duration: number }>('/dashboard/learning/ping/', {
      note_id: noteId,
      elapsed,
    }),

  stats: (period: 'week' | 'month' | 'all' = 'week') =>
    api.get<LearningStats>('/dashboard/learning/stats/', {
      params: { period },
    }),

  weeklyReport: () =>
    api.get<WeeklyLearningReport>('/dashboard/learning/weekly-report/'),
};

/* ─── AI Summary ────────────────────────────────────── */

export const summaryService = {
  get: (slug: string) =>
    api.get<NoteSummary>(`/notes/${slug}/summary/`),

  generate: (slug: string) =>
    api.post<NoteSummary>(`/notes/${slug}/summary/`),
};

/* ─── Exam Mode ─────────────────────────────────────── */

export const examModeService = {
  generate: (slug: string) =>
    api.post<ExamModeData>(`/notes/${slug}/exam-mode/`),
};

/* ─── Concept Simplifier ──────────────────────────────── */

export const conceptSimplifierService = {
  simplify: (text: string, noteSlug?: string) =>
    api.post<ConceptSimplification>('/notes/simplify/', {
      text,
      ...(noteSlug ? { note_slug: noteSlug } : {}),
    }),
};

/* ─── Semester Roadmap Planner ─────────────────────────── */

export const roadmapService = {
  getRoadmap: (semesterId: number) =>
    api.get<SemesterRoadmapResponse>('/academics/roadmap/', {
      params: { semester: semesterId },
    }),

  updateProgress: (data: {
    subject_id: number;
    percent_complete: number;
    status?: string;
    notes_studied?: number;
    target_date?: string | null;
    notes_text?: string;
  }) =>
    api.post('/academics/roadmap/progress/', data),
};

/* ─── Semester Packs ───────────────────────────────────── */

/* ─── Study Buddy Matching ────────────────────────────── */

export const studyBuddyService = {
  matches: () =>
    api.get<BuddyMatchResponse>('/auth/study-buddies/matches/'),

  list: () =>
    api.get<BuddyListResponse>('/auth/study-buddies/'),

  sendRequest: (receiverId: number, message?: string, subjectId?: number) =>
    api.post('/auth/study-buddies/request/', {
      receiver_id: receiverId,
      message: message || '',
      ...(subjectId ? { subject_id: subjectId } : {}),
    }),

  respond: (requestId: number, action: 'accept' | 'reject') =>
    api.post(`/auth/study-buddies/respond/${requestId}/`, { action }),
};

/* ─── Topper Verification ─────────────────────────────── */

export const topperService = {
  status: (slug: string) =>
    api.get<TopperStatus>(`/notes/${slug}/topper-status/`),

  verify: (slug: string, comment?: string) =>
    api.post(`/notes/${slug}/topper-verify/`, { comment: comment || '' }),

  unverify: (slug: string) =>
    api.delete(`/notes/${slug}/topper-verify/`),
};

/* ─── Test Generator ──────────────────────────────────── */

export const testGeneratorService = {
  generate: (slug: string, numMcqs: number, numShort: number, numLong: number) =>
    api.post<GeneratedTest>(`/notes/${slug}/generate-test/`, {
      num_mcqs: numMcqs,
      num_short: numShort,
      num_long: numLong,
    }),
};

export const semesterPackService = {
  list: (facultyId?: number) =>
    api.get<SemesterPack[]>('/notes/semester-packs/', {
      params: facultyId ? { faculty: facultyId } : {},
    }),

  downloadUrl: (semesterId: number) =>
    `/api/notes/semester-packs/${semesterId}/download/`,
};

/* ─── Resource Hub ───────────────────────────────────── */

export const resourceService = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.get<Resource[]>('/resources/', { params }),

  detail: (id: number) =>
    api.get<Resource>(`/resources/${id}/`),

  create: (data: Partial<Resource>) =>
    api.post<Resource>('/resources/create/', data),

  update: (id: number, data: Partial<Resource>) =>
    api.patch<Resource>(`/resources/${id}/update/`, data),

  delete: (id: number) =>
    api.delete(`/resources/${id}/delete/`),

  upvote: (id: number) =>
    api.post<{ upvoted: boolean; upvotes_count: number }>(`/resources/${id}/upvote/`),

  stats: () =>
    api.get<ResourceStats>('/resources/stats/'),
};

/* ─── AI Study Assistant ─────────────────────────────── */

export const chatService = {
  sessions: () =>
    api.get<ChatSessionItem[]>('/notes/chat/sessions/'),

  createSession: () =>
    api.post<ChatSessionItem>('/notes/chat/sessions/'),

  sessionDetail: (id: number) =>
    api.get<ChatSessionDetail>(`/notes/chat/sessions/${id}/`),

  sendMessage: (sessionId: number, message: string) =>
    api.post<ChatSendResponse>(`/notes/chat/sessions/${sessionId}/send/`, { message }),

  deleteSession: (id: number) =>
    api.delete(`/notes/chat/sessions/${id}/`),

  clearAll: () =>
    api.delete('/notes/chat/clear/'),
};
