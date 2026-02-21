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
  is_active: boolean;
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
  average_rating: number | null;
  ratings_count: number;
  topper_verified: boolean;
  topper_verification_count: number;
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

export interface PieDataPoint {
  name: string;
  value: number;
}

export interface MonthlyTrend {
  month: string;
  uploads: number;
  views: number;
  downloads: number;
}

export interface UserDashboardResponse {
  stats: UserDashboardStats;
  charts: {
    upload_trends: ChartDataPoint[];
    views_downloads: { date: string; views: number; downloads: number }[];
    status_distribution: PieDataPoint[];
    top_subjects: { name: string; count: number }[];
  };
  recent_uploads: import('./index').NoteListItem[];
}

export interface AdminDashboardResponse {
  stats: AdminDashboardStats;
  charts: {
    notes_per_faculty: FacultyChartData[];
    downloads_per_faculty: { name: string; total_downloads: number }[];
    top_subjects: { name: string; note_count: number }[];
    status_distribution: PieDataPoint[];
    uploads_over_time: ChartDataPoint[];
    registrations_over_time: ChartDataPoint[];
    monthly_trends: MonthlyTrend[];
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

/* ─── Comment & Annotation Types ────────────────────── */

export interface NoteCommentReply {
  id: number;
  author: number;
  author_name: string;
  author_username: string;
  author_avatar: string | null;
  parent: number;
  body: string;
  is_question: boolean;
  is_best_answer: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  vote_count: number;
  user_has_voted: boolean;
  created_at: string;
  updated_at: string;
}

export interface NoteComment {
  id: number;
  note: number;
  author: number;
  author_name: string;
  author_username: string;
  author_avatar: string | null;
  parent: number | null;
  body: string;
  is_question: boolean;
  is_best_answer: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  vote_count: number;
  user_has_voted: boolean;
  reply_count: number;
  replies: NoteCommentReply[];
  created_at: string;
  updated_at: string;
}

export interface NoteAnnotation {
  id: number;
  note: number;
  author: number;
  author_name: string;
  author_username: string;
  author_avatar: string | null;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  selected_text: string;
  body: string;
  color: string;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
}

/* ─── Gamification Types ─────────────────────────────── */

export interface Badge {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'upload' | 'download' | 'engagement' | 'special';
  threshold_field: string;
  threshold_value: number;
  points_reward: number;
}

export interface UserBadge {
  id: number;
  badge: Badge;
  earned_at: string;
}

export interface PointTransaction {
  id: number;
  points: number;
  reason: string;
  description: string;
  created_at: string;
}

export interface LeaderboardEntry {
  username: string;
  full_name: string;
  avatar: string | null;
  faculty_name: string | null;
  faculty_id: number | null;
  total_points: number;
  upload_count: number;
  downloads_received: number;
  views_received: number;
  comments_count: number;
  badge_count: number;
}

export interface ReputationTier {
  key: string;
  name: string;
  emoji: string;
  min_points: number;
  color: string;
}

export interface MyGamification {
  total_points: number;
  upload_count: number;
  downloads_received: number;
  views_received: number;
  comments_count: number;
  ratings_received: number;
  five_star_count: number;
  rank: number;
  badges: UserBadge[];
  recent_points: PointTransaction[];
  reputation: {
    current_tier: ReputationTier;
    next_tier: ReputationTier | null;
    progress_to_next: number;
    points_to_next: number;
  };
  all_tiers: ReputationTier[];
  point_values: Record<string, number>;
}

/* ─── Rating Types ───────────────────────────────────── */

export interface NoteRating {
  id: number;
  note: number;
  user: number;
  user_name: string;
  user_username: string;
  user_avatar: string | null;
  rating: number;
  review: string;
  created_at: string;
  updated_at: string;
}

/* ─── Bookmark & Collection Types ────────────────────── */

export interface Collection {
  id: number;
  name: string;
  description: string;
  is_default: boolean;
  note_count: number;
  created_at: string;
  updated_at: string;
}

export interface BookmarkNote {
  id: number;
  title: string;
  slug: string;
  description: string;
  file_type: string;
  file_size: number;
  file_size_display: string;
  thumbnail: string | null;
  subject_name: string;
  faculty_name: string;
  author_name: string;
  views_count: number;
  downloads_count: number;
  created_at: string;
}

export interface Bookmark {
  id: number;
  note: number;
  note_detail: BookmarkNote;
  collection: number | null;
  collection_name: string | null;
  personal_note: string;
  highlight_color: string;
  is_offline: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookmarkStatus {
  is_bookmarked: boolean;
  collections: {
    bookmark_id: number;
    collection_id: number | null;
    collection_name: string | null;
  }[];
}

/* ─── Study Group Types ──────────────────────────────── */

export interface StudyGroup {
  id: number;
  name: string;
  description: string;
  subject: number | null;
  subject_name: string | null;
  creator: number;
  creator_name: string;
  invite_code: string;
  avatar_color: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: number;
  user: number;
  user_name: string;
  user_username: string;
  user_avatar: string | null;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupMessage {
  id: number;
  group: number;
  author: number;
  author_name: string;
  author_username: string;
  author_avatar: string | null;
  content: string;
  created_at: string;
}

export interface GroupPinnedNote {
  id: number;
  note: number;
  note_title: string;
  note_slug: string;
  note_file_type: string;
  note_subject: string | null;
  pinned_by: number;
  pinned_by_name: string;
  comment: string;
  pinned_at: string;
}

/* ─── Flashcard Types ────────────────────────────────── */

export interface Flashcard {
  id: number;
  deck: number;
  question: string;
  answer: string;
  order: number;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string | null;
  created_at: string;
}

export interface FlashcardDeck {
  id: number;
  note: number;
  note_title: string;
  note_slug: string;
  user: number;
  title: string;
  status: 'pending' | 'ready' | 'failed';
  card_count: number;
  created_at: string;
  updated_at: string;
  cards?: Flashcard[];
}

export interface FlashcardReview {
  id: number;
  card: number;
  user: number;
  quality: 0 | 3 | 4 | 5;
  reviewed_at: string;
}

/* ─── Version History Types ──────────────────────────── */

export interface NoteVersion {
  id: number;
  note: number;
  version_number: number;
  change_type: 'created' | 'edited' | 'file_replaced' | 'restored';
  change_summary: string;
  title: string;
  description: string;
  file: string | null;
  file_url: string | null;
  file_type: string;
  file_size: number;
  subject: number | null;
  subject_name: string | null;
  created_by: number | null;
  created_by_name: string;
  created_at: string;
}

export interface VersionDiffChange {
  field: string;
  old_value: string | number | null;
  new_value: string | number | null;
  diff?: string[];
}

export interface VersionDiff {
  version_a: NoteVersion;
  version_b: NoteVersion;
  changes: VersionDiffChange[];
}

/* ─── OCR Types ──────────────────────────────────────── */

export interface OcrResult {
  note_id: number;
  note_slug: string;
  ocr_text: string;
  ocr_confidence: number;
  ocr_status: 'none' | 'pending' | 'completed' | 'failed';
  message: string;
}

export interface OcrStatus {
  id: number;
  title: string;
  slug: string;
  is_handwritten: boolean;
  ocr_status: 'none' | 'pending' | 'completed' | 'failed';
  ocr_text: string;
  ocr_confidence: number | null;
}

/* ─── Collaborative Note Layers ─────────────────────── */

export type LayerType = 'clarification' | 'example' | 'explanation' | 'summary' | 'correction' | 'resource';

export interface NoteLayer {
  id: number;
  note: number;
  author: number;
  author_name: string;
  author_avatar: string | null;
  layer_type: LayerType;
  title: string;
  content: string;
  upvotes: number;
  downvotes: number;
  score: number;
  is_pinned: boolean;
  user_vote: 'up' | 'down' | null;
  created_at: string;
  updated_at: string;
}

export interface NoteLayerCreate {
  layer_type: LayerType;
  title: string;
  content: string;
}

/* ─── Learning Tracker Types ────────────────────────── */

export interface SubjectStudyTime {
  subject_id: number;
  subject_name: string;
  total_seconds: number;
  prev_week_seconds?: number;
  change_pct?: number | null;
}

export interface LearningStats {
  period: string;
  total_seconds: number;
  per_subject: SubjectStudyTime[];
  daily: { date: string; total_seconds: number }[];
}

export interface WeeklyLearningReport {
  this_week_total: number;
  prev_week_total: number;
  per_subject: SubjectStudyTime[];
  strongest: SubjectStudyTime | null;
  weakest: SubjectStudyTime | null;
  insights: string[];
  daily: { date: string; total_seconds: number }[];
}

/* ─── AI Summary Types ───────────────────────────────── */

export interface NoteSummary {
  summary: string;
  generated_at: string | null;
  has_summary: boolean;
  source?: string;
  word_count?: number;
  error?: string;
}

/* ─── Exam Mode Types ────────────────────────────────── */

export interface ExamModeDefinition {
  term: string;
  definition: string;
}

export interface ExamModeFormula {
  label: string;
  formula: string;
}

export interface ExamModeSyntax {
  label: string;
  code: string;
}

export interface ExamModeData {
  definitions: ExamModeDefinition[];
  formulas: ExamModeFormula[];
  key_points: string[];
  diagrams: string[];
  syntax: ExamModeSyntax[];
  success: boolean;
  error?: string;
  source?: string;
  stats: {
    definitions: number;
    formulas: number;
    key_points: number;
    diagrams: number;
    syntax: number;
    total: number;
  };
}

/* ─── Concept Simplifier Types ───────────────────────── */

export interface ConceptSimplification {
  original: string;
  simplified: string;
  analogy: string;
  emoji: string;
  matched_concept: boolean;
  ai_powered: boolean;
  success: boolean;
  error?: string;
}

/* ─── Semester Pack Types ────────────────────────────── */

export interface SemesterPackSubject {
  name: string;
  note_count: number;
}

export interface SemesterPack {
  semester_id: number;
  semester_number: number;
  semester_name: string;
  faculty_id: number;
  faculty_name: string;
  note_count: number;
  total_size: number;
  total_size_display: string;
  subjects: SemesterPackSubject[];
}

/* ─── Topper Verification Types ──────────────────────── */

export interface TopperVerifier {
  username: string;
  full_name: string;
  comment: string;
  verified_at: string;
}

export interface TopperStatus {
  topper_verified: boolean;
  verification_count: number;
  verifiers: TopperVerifier[];
  current_user_is_topper: boolean;
  current_user_has_verified: boolean;
}

/* ─── Study Buddy Types ──────────────────────────────── */

export interface BuddyUser {
  id: number;
  username: string;
  full_name: string;
  avatar: string | null;
  faculty_name: string | null;
  bio: string;
  notes_count?: number;
}

export interface BuddyMatch {
  user: BuddyUser;
  score: number;
  reasons: string[];
  shared_subjects: string[];
}

export interface BuddyMatchResponse {
  matches: BuddyMatch[];
  total: number;
}

export interface BuddyConnection {
  request_id: number;
  user: BuddyUser;
  subject_name: string | null;
  message: string;
  connected_at?: string;
  sent_at?: string;
}

export interface BuddyListResponse {
  buddies: BuddyConnection[];
  incoming_requests: BuddyConnection[];
  outgoing_requests: BuddyConnection[];
  total_buddies: number;
}

/* ─── Semester Roadmap Planner Types ─────────────────── */

export interface SubjectProgressData {
  percent_complete: number;
  status: 'not_started' | 'in_progress' | 'completed';
  notes_studied: number;
  target_date: string | null;
  notes_text: string;
  updated_at: string;
}

export interface RoadmapSubject {
  id: number;
  name: string;
  slug: string;
  code: string;
  description: string;
  credit_hours: number;
  note_count: number;
  timeline: {
    start_week: number;
    end_week: number;
    weeks: number;
  };
  progress: SubjectProgressData | null;
}

export interface RoadmapSemester {
  id: number;
  number: number;
  name: string;
  faculty_id: number;
  faculty_name: string;
  faculty_slug: string;
}

export interface RoadmapStats {
  total_subjects: number;
  completed: number;
  in_progress: number;
  not_started: number;
  overall_percent: number;
  total_notes: number;
}

export interface SemesterRoadmapResponse {
  semester: RoadmapSemester;
  subjects: RoadmapSubject[];
  stats: RoadmapStats;
}

/* ─── Instant Test Generator Types ────────────────────── */

export interface TestMCQ {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: string;
  explanation: string;
}

export interface TestShortQuestion {
  id: number;
  question: string;
  answer: string;
}

export interface TestLongQuestion {
  id: number;
  question: string;
  answer: string;
}

export interface GeneratedTest {
  success: boolean;
  error?: string;
  mcqs: TestMCQ[];
  short_questions: TestShortQuestion[];
  long_questions: TestLongQuestion[];
  stats: {
    mcqs: number;
    short_questions: number;
    long_questions: number;
    total: number;
    requested: { mcqs: number; short: number; long: number };
  };
}

/* ─── Duplicate Types ────────────────────────────────── */

export interface DuplicatePair {
  note_1: { id: number; title: string; author: string };
  note_2: { id: number; title: string; author: string };
  similarity_score: number;
}

/* ─── Resource Hub Types ────────────────────────────── */

export type ResourceCategory = 'internship' | 'project_ideas' | 'interview_qa' | 'viva';
export type ResourceDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Resource {
  id: number;
  title: string;
  description: string;
  category: ResourceCategory;
  category_display: string;
  difficulty: ResourceDifficulty;
  difficulty_display: string;
  tags: string;
  tags_list: string[];
  link: string;
  author: number;
  author_name: string;
  author_username: string;
  author_avatar: string | null;
  faculty: number | null;
  faculty_name: string | null;
  is_approved: boolean;
  views_count: number;
  upvotes_count: number;
  user_has_upvoted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResourceStats {
  total: number;
  internship: number;
  project_ideas: number;
  interview_qa: number;
  viva: number;
}

/* ─── AI Study Assistant Types ──────────────────────── */

export interface ChatMessageItem {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatSessionItem {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatSessionDetail {
  id: number;
  title: string;
  created_at: string;
  messages: ChatMessageItem[];
}

export interface ChatSendResponse {
  user_message: ChatMessageItem;
  assistant_message: ChatMessageItem;
  session_title: string;
}

/* ─── Personal Notes (Note Maker) ───────────────────── */

export interface PersonalNoteListItem {
  id: number;
  title: string;
  preview: string;
  tags: string;
  tags_list: string[];
  is_pinned: boolean;
  is_archived: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface PersonalNoteDetail {
  id: number;
  title: string;
  content: string;
  tags: string;
  tags_list: string[];
  preview: string;
  is_pinned: boolean;
  is_archived: boolean;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface PersonalNoteExport {
  title: string;
  content: string;
  text: string;
  html: string;
}
