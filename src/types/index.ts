// Core domain types derived from the audited API contract.
// Kept intentionally close to the actual response shapes — do not add
// fields the backend doesn't return.

export type Role = 'student' | 'teacher' | 'admin' | 'superadmin';

export interface ApiSuccess<T> {
  success: true;
  data?: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error?: { code?: string; message?: string; details?: unknown };
}

export interface User {
  _id: string;
  name: string;
  role: Role;
  email?: string;
  studentId?: string;
  gender?: string;
  personalPhone?: string;
  guardianPhone?: string;
  area?: string;
  darkMode?: boolean;
  language?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
}

export type QuestionType = 'mcq' | 'true_false' | 'short_answer' | 'long_answer' | string;

export interface Question {
  _id: string;
  testId: string;
  questionText: string;
  type: QuestionType;
  options?: string[];
  correctAnswer?: string | string[];
  marks: number;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
}

export type TestStatus = 'draft' | 'published' | 'ended' | string;

export interface Test {
  _id: string;
  title: string;
  description?: string;
  subject?: string;
  duration: number; // minutes
  status: TestStatus;
  courseId?: string;
  shareLink?: string;
  startTime?: string;
  endTime?: string;
  totalMarks?: number;
  createdBy?: string;
}

export interface Answer {
  questionId: string;
  answer: string | string[] | null;
  flagged?: boolean;
}

export type SubmissionStatus = 'in_progress' | 'submitted' | 'graded' | 'force_submitted' | string;

export interface Submission {
  _id: string;
  testId: string;
  studentId: string;
  status: SubmissionStatus;
  answers?: Answer[];
  startedAt?: string;
  submittedAt?: string;
  remainingSeconds?: number;
}

export interface SubmissionResult {
  submission: Submission;
  answers: Array<Answer & { correctAnswer?: string | string[]; marksAwarded?: number; questionText?: string }>;
  totalMarks: number;
  marksObtained: number;
  teacherNotes?: string;
}

export interface Course {
  _id: string;
  courseName: string;
  courseCode?: string;
  description?: string;
  classType?: string;
  teacherId?: string;
}

export interface AttendanceRecord {
  studentId: string;
  present: boolean;
}

export interface Mark {
  _id: string;
  courseId: string;
  studentId: string;
  type: string;
  marksObtained: number;
  totalMarks: number;
  date: string;
}

export interface Result {
  _id: string;
  studentId: string;
  title: string;
  type: string;
  marksObtained: number;
  totalMarks: number;
  date: string;
}

export interface Announcement {
  _id: string;
  courseId: string;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

export interface Assignment {
  _id: string;
  courseId: string;
  title: string;
  description: string;
  deadline: string;
  totalMarks: number;
  submissionState?: 'not_submitted' | 'submitted' | 'graded' | string;
}

export interface AssignmentSubmission {
  _id: string;
  assignmentId: string;
  fileUrl?: string;
  text?: string;
  marks?: number;
  feedback?: string;
  submittedAt: string;
}

export interface LeaveRequest {
  _id: string;
  courseId: string;
  studentId: string;
  date: string;
  reason: string;
  proofImage?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Subscription {
  plan: string;
  status: string;
  expiresAt?: string;
}

export interface Review {
  _id: string;
  courseId: string;
  teacherId?: string;
  rating: number;
  content: string;
  status?: 'pending' | 'approved' | 'rejected' | string;
}

export interface ChatMessage {
  _id: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  message: string;
  createdAt: string;
}

export interface Group {
  _id: string;
  groupName: string;
  description?: string;
  joinMode?: string;
  members?: string[];
}

export interface RetakeRequest {
  _id: string;
  testId: string;
  studentId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  message?: string;
}
