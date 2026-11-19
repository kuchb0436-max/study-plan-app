import {
  Exam,
  StudentProfile,
  StudyFlowData,
  StudySession,
  StudyTask,
  Subject,
  SUBJECT_COLORS,
  TaskCategory,
  TaskPriority,
  ThemeMode,
} from '../types/study';
import { isValidDateISO, isValidTime24, toLocalISODate } from './date';

export const STORAGE_KEY = 'study_flow_data_v1';
export const ONBOARDING_COMPLETED_KEY = 'studyflow_onboarding_completed';
export const CORRUPTED_BACKUP_KEY = 'study_flow_corrupted_raw_v1';
export const PRE_IMPORT_BACKUP_KEY = 'study_flow_pre_import_backup_v1';
export const CURRENT_DATA_VERSION = 2;

export interface CorruptedStorageRecord {
  detectedAt: string;
  raw: string;
}

export interface PreImportBackupRecord {
  savedAt: string;
  data: StudyFlowData;
}

export function isOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(completed: boolean): boolean {
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, completed ? 'true' : 'false');
    return true;
  } catch {
    return false;
  }
}

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyData(
  theme: ThemeMode = 'dark',
  options?: {
    profile?: StudentProfile;
    onboardingCompleted?: boolean;
  }
): StudyFlowData {
  return {
    version: CURRENT_DATA_VERSION,
    theme,
    profile: options?.profile ?? { name: '', grade: '' },
    onboardingCompleted: options?.onboardingCompleted ?? false,
    subjects: [],
    tasks: [],
    sessions: [],
    exams: [],
  };
}

export function getPreservedCorruptedStorage(): CorruptedStorageRecord | null {
  try {
    const raw = localStorage.getItem(CORRUPTED_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CorruptedStorageRecord>;
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.raw === 'string' &&
      parsed.raw.length > 0
    ) {
      return {
        detectedAt:
          typeof parsed.detectedAt === 'string' ? parsed.detectedAt : new Date().toISOString(),
        raw: parsed.raw,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function preserveCorruptedStorage(raw: string): boolean {
  if (!raw) return false;
  try {
    const existing = getPreservedCorruptedStorage();
    if (existing && existing.raw === raw) {
      return true;
    }
    const record: CorruptedStorageRecord = {
      detectedAt: new Date().toISOString(),
      raw,
    };
    localStorage.setItem(CORRUPTED_BACKUP_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function clearPreservedCorruptedStorage(): void {
  try {
    localStorage.removeItem(CORRUPTED_BACKUP_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

export function savePreImportBackup(data: StudyFlowData): boolean {
  const checked = validateImportPayload(data, {
    profile: data.profile,
    theme: data.theme,
  });
  if (!checked.ok || !checked.data) {
    return false;
  }
  try {
    const record: PreImportBackupRecord = {
      savedAt: new Date().toISOString(),
      data: checked.data,
    };
    localStorage.setItem(PRE_IMPORT_BACKUP_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

export function getPreImportBackup(): PreImportBackupRecord | null {
  try {
    const raw = localStorage.getItem(PRE_IMPORT_BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PreImportBackupRecord>;
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return null;
    const validated = validateImportPayload(parsed.data);
    if (!validated.ok || !validated.data) return null;
    return {
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : new Date().toISOString(),
      data: validated.data,
    };
  } catch {
    return null;
  }
}

export function clearPreImportBackup(): void {
  try {
    localStorage.removeItem(PRE_IMPORT_BACKUP_KEY);
  } catch {
    // Ignore storage removal errors
  }
}

export interface LoadAppDataResult {
  data: StudyFlowData;
  corruptedStorageDetected: boolean;
}

export function loadAppDataWithStatus(): LoadAppDataResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        data: createEmptyData('dark', { onboardingCompleted: isOnboardingCompleted() }),
        corruptedStorageDetected: false,
      };
    }

    const parsed = JSON.parse(raw);
    const validated = validateImportPayload(parsed);
    if (validated.ok && validated.data) {
      return {
        data: validated.data,
        corruptedStorageDetected: false,
      };
    }

    preserveCorruptedStorage(raw);
    return {
      data: createEmptyData('dark', { onboardingCompleted: isOnboardingCompleted() }),
      corruptedStorageDetected: true,
    };
  } catch {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        preserveCorruptedStorage(raw);
      }
    } catch {
      // Ignore secondary read failure
    }
    return {
      data: createEmptyData('dark', { onboardingCompleted: isOnboardingCompleted() }),
      corruptedStorageDetected: true,
    };
  }
}

export function loadAppData(): StudyFlowData {
  return loadAppDataWithStatus().data;
}

export function saveAppData(data: StudyFlowData): boolean {
  const validated = validateImportPayload(data, {
    profile: data.profile,
    theme: data.theme,
  });
  if (!validated.ok || !validated.data) {
    return false;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validated.data));
    return true;
  } catch {
    return false;
  }
}

export function buildExportPayload(data: StudyFlowData): string {
  const payload = {
    app: 'Study Flow',
    exportedAt: new Date().toISOString(),
    ...data,
  };
  return JSON.stringify(payload, null, 2);
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'application/json;charset=utf-8'
): boolean {
  if (
    typeof document === 'undefined' ||
    typeof Blob === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return false;
  }

  let url: string | null = null;
  let link: HTMLAnchorElement | null = null;
  try {
    const blob = new Blob([content], { type: mimeType });
    url = URL.createObjectURL(blob);
    link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    const anchorToRemove = link;
    const objectUrlToRevoke = url;

    window.setTimeout(() => {
      try {
        if (anchorToRemove.parentNode) {
          anchorToRemove.parentNode.removeChild(anchorToRemove);
        }
      } catch {
        // Ignore DOM cleanup errors
      }
    }, 1000);

    window.setTimeout(() => {
      try {
        URL.revokeObjectURL(objectUrlToRevoke);
      } catch {
        // Ignore Blob URL cleanup errors
      }
    }, 60_000);

    return true;
  } catch {
    if (link && link.parentNode) {
      link.parentNode.removeChild(link);
    }
    if (url) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore cleanup errors
      }
    }
    return false;
  }
}

const VALID_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];
const VALID_CATEGORIES: TaskCategory[] = ['homework', 'study'];

export interface ValidateImportOptions {
  profile?: StudentProfile;
  theme?: ThemeMode;
}

export interface ValidateImportResult {
  ok: boolean;
  data?: StudyFlowData;
  error?: string;
  skippedCount?: number;
  warnings?: string[];
  profilePreserved?: boolean;
}

export function validateImportPayload(
  raw: unknown,
  fallback?: ValidateImportOptions
): ValidateImportResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Backup file must contain a valid JSON object.' };
  }

  const obj = raw as Record<string, unknown>;

  if (obj.app !== undefined && obj.app !== 'Study Flow') {
    return {
      ok: false,
      error: 'Unrecognized backup file: this JSON does not belong to Study Flow.',
    };
  }

  const collectionKeys = ['subjects', 'tasks', 'sessions', 'exams'] as const;
  const hasAnyCollection = collectionKeys.some((key) => obj[key] !== undefined);
  if (!hasAnyCollection) {
    return {
      ok: false,
      error: 'Invalid backup format: missing subjects, tasks, sessions, or exams data.',
    };
  }

  for (const key of collectionKeys) {
    if (obj[key] !== undefined && !Array.isArray(obj[key])) {
      return {
        ok: false,
        error: `Invalid backup format: "${key}" must be an array.`,
      };
    }
  }

  const warnings: string[] = [];
  const rawSubjects = Array.isArray(obj.subjects) ? obj.subjects : [];
  const rawTasks = Array.isArray(obj.tasks) ? obj.tasks : [];
  const rawSessions = Array.isArray(obj.sessions) ? obj.sessions : [];
  const rawExams = Array.isArray(obj.exams) ? obj.exams : [];

  const theme: ThemeMode =
    obj.theme === 'light' || obj.theme === 'dark' ? obj.theme : fallback?.theme ?? 'dark';
  const defaultColor = SUBJECT_COLORS[0].hex;

  const rawProfile =
    obj.profile && typeof obj.profile === 'object' && !Array.isArray(obj.profile)
      ? (obj.profile as Record<string, unknown>)
      : {};
  const importedName =
    typeof rawProfile.name === 'string' ? rawProfile.name.trim().slice(0, 60) : '';
  const importedGrade =
    typeof rawProfile.grade === 'string' ? rawProfile.grade.trim().slice(0, 40) : '';

  const fallbackName = fallback?.profile?.name?.trim().slice(0, 60) ?? '';
  const fallbackGrade = fallback?.profile?.grade?.trim().slice(0, 40) ?? '';

  const profile: StudentProfile = {
    name: importedName || fallbackName,
    grade: importedGrade || fallbackGrade,
  };
  const profilePreserved =
    (!importedName && Boolean(fallbackName)) || (!importedGrade && Boolean(fallbackGrade));

  let skippedCount = 0;

  const subjects: Subject[] = [];
  const subjectIds = new Set<string>();

  for (const item of rawSubjects) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      skippedCount += 1;
      continue;
    }
    const s = item as Record<string, unknown>;
    if (typeof s.id !== 'string' || !s.id.trim() || typeof s.name !== 'string' || !s.name.trim()) {
      skippedCount += 1;
      continue;
    }
    const cleanId = s.id.trim();
    if (subjectIds.has(cleanId)) {
      skippedCount += 1;
      continue;
    }
    const color =
      typeof s.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(s.color) ? s.color : defaultColor;
    subjectIds.add(cleanId);
    subjects.push({
      id: cleanId,
      name: s.name.trim().slice(0, 60),
      code: typeof s.code === 'string' && s.code.trim() ? s.code.trim().slice(0, 20) : undefined,
      color,
      createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
    });
  }

  if (rawSubjects.length > 0 && subjects.length === 0) {
    return {
      ok: false,
      error: 'Invalid backup data: subjects entries are malformed or missing required fields.',
    };
  }

  const tasks: StudyTask[] = [];
  const taskIds = new Set<string>();
  for (const item of rawTasks) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      skippedCount += 1;
      continue;
    }
    const t = item as Record<string, unknown>;
    if (
      typeof t.id !== 'string' ||
      !t.id.trim() ||
      typeof t.title !== 'string' ||
      !t.title.trim()
    ) {
      skippedCount += 1;
      continue;
    }
    const cleanId = t.id.trim();
    if (taskIds.has(cleanId)) {
      skippedCount += 1;
      continue;
    }
    taskIds.add(cleanId);
    const dueDate =
      typeof t.dueDate === 'string' && isValidDateISO(t.dueDate) ? t.dueDate : toLocalISODate();
    const priority: TaskPriority = VALID_PRIORITIES.includes(t.priority as TaskPriority)
      ? (t.priority as TaskPriority)
      : 'medium';
    const category: TaskCategory = VALID_CATEGORIES.includes(t.category as TaskCategory)
      ? (t.category as TaskCategory)
      : 'study';
    const subjectId =
      typeof t.subjectId === 'string' && subjectIds.has(t.subjectId) ? t.subjectId : null;
    const completed = Boolean(t.completed);
    tasks.push({
      id: cleanId,
      title: t.title.trim().slice(0, 120),
      notes: typeof t.notes === 'string' && t.notes.trim() ? t.notes.trim().slice(0, 500) : undefined,
      category,
      subjectId,
      priority,
      dueDate,
      completed,
      completedAt: completed
        ? typeof t.completedAt === 'string'
          ? t.completedAt
          : new Date().toISOString()
        : null,
      createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString(),
    });
  }

  if (rawTasks.length > 0 && tasks.length === 0) {
    return {
      ok: false,
      error: 'Invalid backup data: task entries are malformed or missing required fields.',
    };
  }

  const sessions: StudySession[] = [];
  const sessionIds = new Set<string>();
  for (const item of rawSessions) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      skippedCount += 1;
      continue;
    }
    const sess = item as Record<string, unknown>;
    if (
      typeof sess.id !== 'string' ||
      !sess.id.trim() ||
      typeof sess.subjectId !== 'string' ||
      !subjectIds.has(sess.subjectId)
    ) {
      skippedCount += 1;
      continue;
    }
    const cleanId = sess.id.trim();
    if (sessionIds.has(cleanId)) {
      skippedCount += 1;
      continue;
    }
    const dayOfWeek = Number(sess.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      skippedCount += 1;
      continue;
    }
    sessionIds.add(cleanId);
    const startTime =
      typeof sess.startTime === 'string' && isValidTime24(sess.startTime) ? sess.startTime : '16:00';
    const duration = Number(sess.durationMinutes);
    const durationMinutes =
      Number.isFinite(duration) && duration >= 5 && duration <= 600 ? Math.round(duration) : 45;
    sessions.push({
      id: cleanId,
      subjectId: sess.subjectId,
      dayOfWeek,
      startTime,
      durationMinutes,
      topic:
        typeof sess.topic === 'string' && sess.topic.trim()
          ? sess.topic.trim().slice(0, 120)
          : undefined,
      createdAt: typeof sess.createdAt === 'string' ? sess.createdAt : new Date().toISOString(),
    });
  }

  if (rawSessions.length > 0 && sessions.length === 0) {
    return {
      ok: false,
      error:
        'Invalid backup data: timetable session entries are malformed or reference missing subjects.',
    };
  }

  const exams: Exam[] = [];
  const examIds = new Set<string>();
  for (const item of rawExams) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      skippedCount += 1;
      continue;
    }
    const ex = item as Record<string, unknown>;
    if (
      typeof ex.id !== 'string' ||
      !ex.id.trim() ||
      typeof ex.name !== 'string' ||
      !ex.name.trim() ||
      typeof ex.date !== 'string' ||
      !isValidDateISO(ex.date)
    ) {
      skippedCount += 1;
      continue;
    }
    const cleanId = ex.id.trim();
    if (examIds.has(cleanId)) {
      skippedCount += 1;
      continue;
    }
    examIds.add(cleanId);
    const subjectId =
      typeof ex.subjectId === 'string' && subjectIds.has(ex.subjectId) ? ex.subjectId : null;
    exams.push({
      id: cleanId,
      name: ex.name.trim().slice(0, 100),
      date: ex.date,
      subjectId,
      notes: typeof ex.notes === 'string' && ex.notes.trim() ? ex.notes.trim().slice(0, 300) : undefined,
      createdAt: typeof ex.createdAt === 'string' ? ex.createdAt : new Date().toISOString(),
    });
  }

  if (rawExams.length > 0 && exams.length === 0) {
    return {
      ok: false,
      error: 'Invalid backup data: exam entries are malformed or have invalid dates.',
    };
  }

  if (skippedCount > 0) {
    warnings.push(`${skippedCount} malformed or incomplete ${skippedCount === 1 ? 'entry was' : 'entries were'} skipped.`);
  }
  if (profilePreserved) {
    warnings.push('Missing profile fields in backup were filled using your existing profile.');
  }

  const onboardingCompleted =
    typeof obj.onboardingCompleted === 'boolean' ? obj.onboardingCompleted : false;

  return {
    ok: true,
    skippedCount,
    warnings,
    profilePreserved,
    data: {
      version: CURRENT_DATA_VERSION,
      theme,
      profile,
      onboardingCompleted,
      subjects,
      tasks,
      sessions,
      exams,
    },
  };
}
