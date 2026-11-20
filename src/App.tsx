import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckSquare,
  GraduationCap,
  LayoutDashboard,
  RotateCcw,
  Settings,
  X,
} from 'lucide-react';
import { DashboardView } from './components/DashboardView';
import { ExamCountdownView } from './components/ExamCountdownView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OnboardingView } from './components/OnboardingView';
import { ProgressTrackerView } from './components/ProgressTrackerView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SettingsView } from './components/SettingsView';
import { SubjectManagerView } from './components/SubjectManagerView';
import { TaskManagerView } from './components/TaskManagerView';
import { TaskModal } from './components/TaskModal';
import { TimetableView } from './components/TimetableView';
import {
  Exam,
  StudentProfile,
  StudyFlowData,
  StudySession,
  StudyTask,
  Subject,
  TabId,
  TaskCategory,
  TaskPriority,
  ThemeMode,
} from './types/study';
import { useI18n } from './i18n';
import { TranslationKey } from './i18n/locales/en';
import { toLocalISODate } from './utils/date';
import {
  clearPreImportBackup,
  clearPreservedCorruptedStorage,
  CorruptedStorageRecord,
  createEmptyData,
  downloadTextFile,
  generateId,
  getPreImportBackup,
  getPreservedCorruptedStorage,
  isOnboardingCompleted,
  loadAppDataWithStatus,
  ONBOARDING_COMPLETED_KEY,
  PreImportBackupRecord,
  saveAppData,
  savePreImportBackup,
  setOnboardingCompleted,
  STORAGE_KEY,
  validateImportPayload,
} from './utils/storage';

const DESKTOP_NAV: { id: TabId; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', labelKey: 'navDashboard', icon: LayoutDashboard },
  { id: 'tasks', labelKey: 'navTasks', icon: CheckSquare },
  { id: 'subjects', labelKey: 'navSubjects', icon: BookOpen },
  { id: 'timetable', labelKey: 'navTimetable', icon: CalendarClock },
  { id: 'exams', labelKey: 'navExams', icon: GraduationCap },
  { id: 'progress', labelKey: 'navProgress', icon: BarChart3 },
  { id: 'settings', labelKey: 'navSettings', icon: Settings },
];

const MOBILE_BOTTOM_NAV: { id: TabId; labelKey: TranslationKey; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', labelKey: 'navHome', icon: LayoutDashboard },
  { id: 'tasks', labelKey: 'navTasks', icon: CheckSquare },
  { id: 'timetable', labelKey: 'navSchedule', icon: CalendarClock },
  { id: 'exams', labelKey: 'navExams', icon: GraduationCap },
  { id: 'progress', labelKey: 'navProgress', icon: BarChart3 },
];

type UndoToastState =
  | { kind: 'task'; label: string; item: StudyTask }
  | { kind: 'session'; label: string; item: StudySession }
  | { kind: 'exam'; label: string; item: Exam };

export default function App() {
  const { t } = useI18n();
  const [initialLoad] = useState(() => loadAppDataWithStatus());
  const [data, setData] = useState<StudyFlowData>(initialLoad.data);
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => isOnboardingCompleted());
  const [previewOnboarding, setPreviewOnboarding] = useState<boolean>(false);
  const [corruptedWarning, setCorruptedWarning] = useState<boolean>(
    initialLoad.corruptedStorageDetected
  );
  const [corruptedBackup, setCorruptedBackup] = useState<CorruptedStorageRecord | null>(() =>
    getPreservedCorruptedStorage()
  );
  const [preImportBackup, setPreImportBackup] = useState<PreImportBackupRecord | null>(() =>
    getPreImportBackup()
  );
  const [storageError, setStorageError] = useState<boolean>(false);
  const canPersistRef = useRef<boolean>(!initialLoad.corruptedStorageDetected);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [taskDefaultDate, setTaskDefaultDate] = useState<string | undefined>(undefined);

  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  const commitData = (updater: (prev: StudyFlowData) => StudyFlowData) => {
    canPersistRef.current = true;
    setCorruptedWarning(false);
    setData((prev) => updater(prev));
  };

  // Persist data changes to LocalStorage (only when safe to write)
  useEffect(() => {
    if (!canPersistRef.current) return;
    const ok = saveAppData(data);
    setStorageError(!ok);
  }, [data]);

  // Keep state synced across multiple open tabs to prevent silent overwrites
  useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          const validated = validateImportPayload(parsed);
          if (validated.ok && validated.data) {
            canPersistRef.current = false;
            setCorruptedWarning(false);
            setData(validated.data);
          }
        } catch {
          // Ignore malformed external tab payload
        }
      } else if (event.key === ONBOARDING_COMPLETED_KEY) {
        setOnboardingDone(event.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, []);

  // Sync Tailwind dark class and PWA theme-color meta tag
  useEffect(() => {
    const isDark = data.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#080D1A' : '#F4F6FB');
    }
  }, [data.theme]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    };
  }, []);

  const showUndoToast = (toast: UndoToastState) => {
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    setUndoToast(toast);
    undoTimerRef.current = window.setTimeout(() => {
      setUndoToast(null);
    }, 5000);
  };

  const handleUndoDelete = () => {
    if (!undoToast) return;
    if (undoTimerRef.current) window.clearTimeout(undoTimerRef.current);
    const target = undoToast;
    setUndoToast(null);

    commitData((prev) => {
      if (target.kind === 'task') {
        if (prev.tasks.some((t) => t.id === target.item.id)) return prev;
        return { ...prev, tasks: [target.item, ...prev.tasks] };
      }
      if (target.kind === 'session') {
        if (prev.sessions.some((s) => s.id === target.item.id)) return prev;
        return { ...prev, sessions: [...prev.sessions, target.item] };
      }
      if (prev.exams.some((ex) => ex.id === target.item.id)) return prev;
      return { ...prev, exams: [...prev.exams, target.item] };
    });
  };

  const handleNavigate = (tab: TabId) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Onboarding completion
  const handleCompleteOnboarding = (payload: {
    profile: StudentProfile;
    theme: ThemeMode;
    subjects: Subject[];
  }) => {
    commitData((prev) => ({
      ...prev,
      profile: payload.profile,
      theme: payload.theme,
      subjects: payload.subjects,
      onboardingCompleted: true,
    }));
    setOnboardingCompleted(true);
    setOnboardingDone(true);
    setPreviewOnboarding(false);
    setActiveTab('dashboard');
  };

  // Task handlers
  const openQuickAddTask = () => {
    setEditingTask(null);
    setTaskDefaultDate(toLocalISODate());
    setTaskModalOpen(true);
  };

  const openEditTask = (task: StudyTask) => {
    setEditingTask(task);
    setTaskDefaultDate(undefined);
    setTaskModalOpen(true);
  };

  const handleSaveTask = (payload: {
    id?: string;
    title: string;
    notes?: string;
    category: TaskCategory;
    subjectId: string | null;
    priority: TaskPriority;
    dueDate: string;
  }) => {
    commitData((prev) => {
      if (payload.id) {
        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === payload.id
              ? {
                  ...t,
                  title: payload.title,
                  notes: payload.notes,
                  category: payload.category,
                  subjectId: payload.subjectId,
                  priority: payload.priority,
                  dueDate: payload.dueDate,
                }
              : t
          ),
        };
      }
      const newTask: StudyTask = {
        id: generateId('task'),
        title: payload.title,
        notes: payload.notes,
        category: payload.category,
        subjectId: payload.subjectId,
        priority: payload.priority,
        dueDate: payload.dueDate,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        tasks: [newTask, ...prev.tasks],
      };
    });
  };

  const handleToggleTask = (taskId: string) => {
    commitData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              completedAt: !t.completed ? new Date().toISOString() : null,
            }
          : t
      ),
    }));
  };

  const handleDeleteTask = (taskId: string) => {
    const removed = data.tasks.find((t) => t.id === taskId);
    commitData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
    if (removed) {
      showUndoToast({
        kind: 'task',
        label: t('deletedLabel', { name: removed.title }),
        item: removed,
      });
    }
  };

  // Subject handlers
  const handleSaveSubject = (payload: {
    id?: string;
    name: string;
    code?: string;
    color: string;
  }) => {
    commitData((prev) => {
      if (payload.id) {
        return {
          ...prev,
          subjects: prev.subjects.map((s) =>
            s.id === payload.id
              ? { ...s, name: payload.name, code: payload.code, color: payload.color }
              : s
          ),
        };
      }
      return {
        ...prev,
        subjects: [
          ...prev.subjects,
          {
            id: generateId('subj'),
            name: payload.name,
            code: payload.code,
            color: payload.color,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });
  };

  const handleDeleteSubject = (subjectId: string) => {
    commitData((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((s) => s.id !== subjectId),
      sessions: prev.sessions.filter((sess) => sess.subjectId !== subjectId),
      tasks: prev.tasks.map((t) => (t.subjectId === subjectId ? { ...t, subjectId: null } : t)),
      exams: prev.exams.map((ex) => (ex.subjectId === subjectId ? { ...ex, subjectId: null } : ex)),
    }));
  };

  // Timetable session handlers
  const handleSaveSession = (payload: {
    id?: string;
    subjectId: string;
    dayOfWeek: number;
    startTime: string;
    durationMinutes: number;
    topic?: string;
  }) => {
    commitData((prev) => {
      if (payload.id) {
        return {
          ...prev,
          sessions: prev.sessions.map((s) =>
            s.id === payload.id
              ? {
                  ...s,
                  subjectId: payload.subjectId,
                  dayOfWeek: payload.dayOfWeek,
                  startTime: payload.startTime,
                  durationMinutes: payload.durationMinutes,
                  topic: payload.topic,
                }
              : s
          ),
        };
      }
      return {
        ...prev,
        sessions: [
          ...prev.sessions,
          {
            id: generateId('sess'),
            subjectId: payload.subjectId,
            dayOfWeek: payload.dayOfWeek,
            startTime: payload.startTime,
            durationMinutes: payload.durationMinutes,
            topic: payload.topic,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });
  };

  const handleDeleteSession = (sessionId: string) => {
    const removed = data.sessions.find((s) => s.id === sessionId);
    commitData((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== sessionId),
    }));
    if (removed) {
      showUndoToast({ kind: 'session', label: t('sessionDeletedLabel'), item: removed });
    }
  };

  // Exam handlers
  const handleSaveExam = (payload: {
    id?: string;
    name: string;
    date: string;
    subjectId: string | null;
    notes?: string;
  }) => {
    commitData((prev) => {
      if (payload.id) {
        return {
          ...prev,
          exams: prev.exams.map((ex) =>
            ex.id === payload.id
              ? {
                  ...ex,
                  name: payload.name,
                  date: payload.date,
                  subjectId: payload.subjectId,
                  notes: payload.notes,
                }
              : ex
          ),
        };
      }
      return {
        ...prev,
        exams: [
          ...prev.exams,
          {
            id: generateId('exam'),
            name: payload.name,
            date: payload.date,
            subjectId: payload.subjectId,
            notes: payload.notes,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    });
  };

  const handleDeleteExam = (examId: string) => {
    const removed = data.exams.find((ex) => ex.id === examId);
    commitData((prev) => ({
      ...prev,
      exams: prev.exams.filter((ex) => ex.id !== examId),
    }));
    if (removed) {
      showUndoToast({
        kind: 'exam',
        label: t('deletedLabel', { name: removed.name }),
        item: removed,
      });
    }
  };

  // Settings handlers
  const handleChangeTheme = (theme: ThemeMode) => {
    commitData((prev) => ({ ...prev, theme }));
  };

  const handleUpdateProfile = (profile: StudentProfile) => {
    commitData((prev) => ({ ...prev, profile }));
  };

  const handleImportData = (imported: StudyFlowData): { ok: boolean; error?: string } => {
    // Automatically save a backup of the current data before overwriting
    savePreImportBackup(data);
    setPreImportBackup(getPreImportBackup());

    const nextData: StudyFlowData = {
      ...imported,
      onboardingCompleted: true,
    };

    const saved = saveAppData(nextData);
    if (!saved) {
      setStorageError(true);
      return {
        ok: false,
        error: t('importSaveFailedError'),
      };
    }

    canPersistRef.current = true;
    setCorruptedWarning(false);
    setStorageError(false);
    setData(nextData);
    setOnboardingCompleted(true);
    setOnboardingDone(true);
    return { ok: true };
  };

  const handleRestorePreImportBackup = (): { ok: boolean; error?: string } => {
    const snapshot = getPreImportBackup();
    if (!snapshot) {
      setPreImportBackup(null);
      return { ok: false, error: t('restorePreImportErr') };
    }
    const saved = saveAppData(snapshot.data);
    if (!saved) {
      return {
        ok: false,
        error: t('restorePreImportErr'),
      };
    }
    canPersistRef.current = true;
    setCorruptedWarning(false);
    setStorageError(false);
    setData(snapshot.data);
    clearPreImportBackup();
    setPreImportBackup(null);
    return { ok: true };
  };

  const handleDismissPreImportBackup = () => {
    clearPreImportBackup();
    setPreImportBackup(null);
  };

  const handleDownloadCorruptedBackup = () => {
    const snapshot = getPreservedCorruptedStorage();
    if (!snapshot) {
      setCorruptedBackup(null);
      return;
    }
    downloadTextFile(
      `study-flow-corrupted-recovery-${toLocalISODate()}.json`,
      snapshot.raw,
      'application/json;charset=utf-8'
    );
  };

  const handleDiscardCorruptedBackup = () => {
    clearPreservedCorruptedStorage();
    setCorruptedBackup(null);
    setCorruptedWarning(false);
  };

  const handleResetData = (options: { resetOnboarding: boolean }) => {
    commitData((prev) =>
      createEmptyData(prev.theme, {
        profile: options.resetOnboarding ? { name: '', grade: '' } : prev.profile,
        onboardingCompleted: !options.resetOnboarding,
      })
    );
    if (options.resetOnboarding) {
      setOnboardingCompleted(false);
      setOnboardingDone(false);
      setPreviewOnboarding(false);
      setActiveTab('dashboard');
    }
  };

  // Show onboarding when studyflow_onboarding_completed is missing/false, or when previewing from Settings
  if (!onboardingDone || previewOnboarding) {
    return (
      <>
        <OnboardingView
          initialProfile={data.profile}
          initialTheme={data.theme}
          initialSubjects={data.subjects}
          isPreview={previewOnboarding}
          onExitPreview={() => setPreviewOnboarding(false)}
          onThemeChange={handleChangeTheme}
          onComplete={handleCompleteOnboarding}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-200">
      {/* Desktop Sidebar Rail */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:start-0 bg-white dark:bg-[#0B1120] border-e border-slate-200 dark:border-slate-800/80 z-30">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
          <img
            src="/icon.svg"
            alt={t('appName')}
            className="w-8 h-8 rounded-lg shrink-0"
            referrerPolicy="no-referrer"
          />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap">
            {t('appName')}
          </span>
        </div>

        <nav aria-label={t('navPrimaryAria')} className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {DESKTOP_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
          {data.profile.name && (
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {data.profile.name}
              </p>
              {data.profile.grade && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {data.profile.grade}
                </p>
              )}
            </div>
          )}
          <PWAInstallButton variant="compact" />
        </div>
      </aside>

      {/* Mobile Sticky Top Header */}
      <header className="md:hidden sticky top-0 z-30 pt-safe bg-white/90 dark:bg-[#080D1A]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-2.5 min-[360px]:px-3.5">
        <div className="min-h-12 flex items-center justify-between gap-1.5 min-[360px]:gap-2">
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="flex items-center gap-1.5 min-[360px]:gap-2 min-h-[44px] min-w-0 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <img
              src="/icon.svg"
              alt={t('appName')}
              className="w-6 h-6 rounded-md shrink-0"
              referrerPolicy="no-referrer"
            />
            <span className="font-display text-[15px] min-[360px]:text-base font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {t('appName')}
            </span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <PWAInstallButton variant="compact" />
            <button
              type="button"
              onClick={() => handleNavigate('subjects')}
              aria-label={t('navSubjects')}
              aria-current={activeTab === 'subjects' ? 'page' : undefined}
              className={`min-h-[44px] min-w-[44px] px-2 min-[360px]:px-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'subjects'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="hidden min-[360px]:inline">{t('navSubjects')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate('settings')}
              aria-label={t('navSettings')}
              aria-current={activeTab === 'settings' ? 'page' : undefined}
              className={`min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 md:ps-64 min-w-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-12 space-y-5">
          {(corruptedWarning || storageError) && (
            <div
              role="alert"
              className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 space-y-2.5 text-xs sm:text-sm text-amber-800 dark:text-amber-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    {corruptedWarning ? t('corruptedBannerMsg') : t('storageSaveErrorMsg')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCorruptedWarning(false);
                    setStorageError(false);
                  }}
                  aria-label={t('dismissWarningAria')}
                  className="p-1 rounded-lg hover:bg-amber-500/20 shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {corruptedWarning && corruptedBackup && (
                <div className="flex flex-wrap items-center gap-2 ps-6">
                  <button
                    type="button"
                    onClick={handleDownloadCorruptedBackup}
                    className="min-h-[36px] px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {t('downloadPreservedData')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('settings')}
                    className="min-h-[36px] px-3 py-1 rounded-lg border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/15 transition-colors cursor-pointer"
                  >
                    {t('openBackupSettings')}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              profile={data.profile}
              subjects={data.subjects}
              tasks={data.tasks}
              sessions={data.sessions}
              exams={data.exams}
              onNavigate={handleNavigate}
              onQuickAddTask={openQuickAddTask}
              onToggleTask={handleToggleTask}
              onEditTask={openEditTask}
            />
          )}

          {activeTab === 'tasks' && (
            <TaskManagerView
              tasks={data.tasks}
              subjects={data.subjects}
              onAddTask={openQuickAddTask}
              onEditTask={openEditTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onOpenSubjects={() => handleNavigate('subjects')}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectManagerView
              subjects={data.subjects}
              tasks={data.tasks}
              sessions={data.sessions}
              onSaveSubject={handleSaveSubject}
              onDeleteSubject={handleDeleteSubject}
            />
          )}

          {activeTab === 'timetable' && (
            <TimetableView
              sessions={data.sessions}
              subjects={data.subjects}
              onSaveSession={handleSaveSession}
              onDeleteSession={handleDeleteSession}
              onNavigateToSubjects={() => handleNavigate('subjects')}
            />
          )}

          {activeTab === 'exams' && (
            <ExamCountdownView
              exams={data.exams}
              subjects={data.subjects}
              onSaveExam={handleSaveExam}
              onDeleteExam={handleDeleteExam}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressTrackerView
              tasks={data.tasks}
              subjects={data.subjects}
              sessions={data.sessions}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              data={data}
              preImportBackup={preImportBackup}
              corruptedBackup={corruptedBackup}
              onChangeTheme={handleChangeTheme}
              onUpdateProfile={handleUpdateProfile}
              onPreviewOnboarding={() => setPreviewOnboarding(true)}
              onImportData={handleImportData}
              onRestorePreImportBackup={handleRestorePreImportBackup}
              onDismissPreImportBackup={handleDismissPreImportBackup}
              onDownloadCorruptedBackup={handleDownloadCorruptedBackup}
              onDiscardCorruptedBackup={handleDiscardCorruptedBackup}
              onResetData={handleResetData}
            />
          )}
        </div>
      </main>

      {/* Android-style Mobile Bottom Navigation (60px + safe-area-inset-bottom) */}
      <nav
        aria-label={t('navMobileAria')}
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe bg-white/95 dark:bg-[#0B1120]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800/90"
      >
        <div className="grid grid-cols-5 h-[60px] max-w-lg mx-auto">
          {MOBILE_BOTTOM_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center min-h-[48px] transition-colors cursor-pointer ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.25]' : 'stroke-[1.75]'}`} />
                <span className="mt-0.5 text-[11px] font-semibold tracking-tight whitespace-nowrap">
                  {t(item.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Coordinated Bottom Notification Stack (Prevents Offline Banner & Undo Toast overlap) */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 start-3 end-3 sm:start-4 sm:end-4 md:start-[17rem] z-50 pointer-events-none flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div className="pointer-events-auto self-start">
          <OfflineIndicator inline />
        </div>

        {undoToast && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto w-full sm:w-80 sm:ms-auto rounded-xl bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 px-4 py-2.5 shadow-xl flex items-center justify-between gap-3"
          >
            <span className="text-xs font-medium truncate">{undoToast.label}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleUndoDelete}
                className="min-h-[36px] px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('undo')}</span>
              </button>
              <button
                type="button"
                onClick={() => setUndoToast(null)}
                aria-label={t('dismissNotificationAria')}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reusable Add/Edit Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        subjects={data.subjects}
        initialTask={editingTask}
        defaultDueDate={taskDefaultDate}
        onSave={handleSaveTask}
      />
    </div>
  );
}
