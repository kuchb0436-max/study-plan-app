export type ThemeMode = 'dark' | 'light';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'homework' | 'study';

export type TabId =
  | 'dashboard'
  | 'tasks'
  | 'subjects'
  | 'timetable'
  | 'exams'
  | 'progress'
  | 'settings';

export interface SubjectColorOption {
  id: string;
  name: string;
  hex: string;
  softBg: string;
  text: string;
}

export const SUBJECT_COLORS: SubjectColorOption[] = [
  { id: 'blue', name: 'Royal Blue', hex: '#3B82F6', softBg: 'rgba(59, 130, 246, 0.14)', text: '#60A5FA' },
  { id: 'indigo', name: 'Indigo', hex: '#6366F1', softBg: 'rgba(99, 102, 241, 0.14)', text: '#818CF8' },
  { id: 'violet', name: 'Violet', hex: '#8B5CF6', softBg: 'rgba(139, 92, 246, 0.14)', text: '#A78BFA' },
  { id: 'cyan', name: 'Cyan', hex: '#06B6D4', softBg: 'rgba(6, 182, 212, 0.14)', text: '#22D3EE' },
  { id: 'emerald', name: 'Emerald', hex: '#10B981', softBg: 'rgba(16, 185, 129, 0.14)', text: '#34D399' },
  { id: 'amber', name: 'Amber', hex: '#F59E0B', softBg: 'rgba(245, 158, 11, 0.14)', text: '#FBBF24' },
  { id: 'rose', name: 'Rose', hex: '#F43F5E', softBg: 'rgba(244, 63, 94, 0.14)', text: '#FB7185' },
  { id: 'teal', name: 'Teal', hex: '#14B8A6', softBg: 'rgba(20, 184, 166, 0.14)', text: '#2DD4BF' },
];

export interface Subject {
  id: string;
  name: string;
  color: string; // hex from SUBJECT_COLORS
  code?: string;
  createdAt: string;
}

export interface StudyTask {
  id: string;
  title: string;
  notes?: string;
  category: TaskCategory;
  subjectId: string | null;
  priority: TaskPriority;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  dayOfWeek: number; // 0 = Monday ... 6 = Sunday
  startTime: string; // HH:MM (24h)
  durationMinutes: number;
  topic?: string;
  createdAt: string;
}

export interface Exam {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  subjectId: string | null;
  notes?: string;
  createdAt: string;
}

export interface StudentProfile {
  name: string;
  grade: string;
}

export interface StudyFlowData {
  version: number;
  theme: ThemeMode;
  profile: StudentProfile;
  onboardingCompleted: boolean;
  subjects: Subject[];
  tasks: StudyTask[];
  sessions: StudySession[];
  exams: Exam[];
}
