import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckSquare,
  GraduationCap,
  Plus,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { Exam, StudentProfile, StudySession, StudyTask, Subject, TabId } from '../types/study';
import {
  addMinutesToTime,
  daysUntil,
  formatCompactDate,
  formatDuration,
  formatLongDate,
  formatTimeDisplay,
  getGreetingKey,
  getTodayWeekdayIndex,
  toLocalISODate,
} from '../utils/date';

interface DashboardViewProps {
  profile: StudentProfile;
  subjects: Subject[];
  tasks: StudyTask[];
  sessions: StudySession[];
  exams: Exam[];
  onNavigate: (tab: TabId) => void;
  onQuickAddTask: () => void;
  onToggleTask: (taskId: string) => void;
  onEditTask: (task: StudyTask) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  subjects,
  tasks,
  sessions,
  exams,
  onNavigate,
  onQuickAddTask,
  onToggleTask,
  onEditTask,
}) => {
  const { t, language, formatNum } = useI18n();
  const intlLocale = language.intlLocale;

  const now = new Date();
  const todayISO = toLocalISODate(now);
  const todayWeekday = getTodayWeekdayIndex(now);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Today's tasks: due today OR overdue pending tasks
  const todayTasks = tasks
    .filter((t) => t.dueDate === todayISO || (!t.completed && t.dueDate < todayISO))
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityRank = { high: 0, medium: 1, low: 2 };
      if (priorityRank[a.priority] !== priorityRank[b.priority]) {
        return priorityRank[a.priority] - priorityRank[b.priority];
      }
      return a.dueDate.localeCompare(b.dueDate);
    });

  const dueTodayOnly = tasks.filter((t) => t.dueDate === todayISO);
  const completedTodayCount = tasks.filter(
    (t) =>
      t.completed &&
      ((t.completedAt && toLocalISODate(new Date(t.completedAt)) === todayISO) ||
        t.dueDate === todayISO)
  ).length;

  const progressDenominator = dueTodayOnly.length > 0 ? dueTodayOnly.length : tasks.length;
  const progressNumerator =
    dueTodayOnly.length > 0
      ? dueTodayOnly.filter((t) => t.completed).length
      : tasks.filter((t) => t.completed).length;

  const dailyPercent =
    progressDenominator > 0 ? Math.round((progressNumerator / progressDenominator) * 100) : 0;

  const totalPending = tasks.filter((t) => !t.completed).length;

  const todaySessions = sessions
    .filter((s) => s.dayOfWeek === todayWeekday)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingExams = exams
    .filter((ex) => daysUntil(ex.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextExam = upcomingExams[0] ?? null;
  const nextExamDays = nextExam ? daysUntil(nextExam.date) : null;

  const compactDateLabels = {
    today: t('today'),
    tomorrow: t('tomorrow'),
    yesterday: t('yesterday'),
  };

  const durationFormatters = {
    min: (n: number) => t('durationMin', { n: formatNum(n) }),
    hrs: (h: number) => t('durationHrs', { h: formatNum(h) }),
    hrsMin: (h: number, m: number) => t('durationHrsMin', { h: formatNum(h), m: formatNum(m) }),
  };

  // SVG Ring math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (dailyPercent / 100) * circumference;

  return (
    <div className="space-y-6">
      {/* Greeting & Quick Action Header */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
            {profile.grade ? `${profile.grade} · ` : ''}
            {formatLongDate(now, intlLocale)}
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance break-words">
            {t(getGreetingKey(now))}
            {profile.name ? `, ${profile.name}` : ''}
          </h1>
        </div>

        <button
          type="button"
          onClick={onQuickAddTask}
          className="inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98] text-white text-sm font-semibold shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{t('quickAddTask')}</span>
        </button>
      </section>

      {/* Primary Focus: Daily Progress Indicator + Core Counters */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Daily Progress Ring Card */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 flex items-center gap-5">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96" aria-hidden="true">
              <defs>
                <linearGradient id="dailyRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-100 dark:text-slate-800"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="none"
                stroke="url(#dailyRingGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 ease-out"
              />
            </svg>
            <span className="absolute text-xl font-bold font-mono-num text-slate-900 dark:text-slate-50">
              {formatNum(dailyPercent)}%
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('dailyProgress')}
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {dueTodayOnly.length > 0
                ? t(progressDenominator === 1 ? 'dailyTasksDoneSingle' : 'dailyTasksDone', {
                    done: formatNum(progressNumerator),
                    total: formatNum(progressDenominator),
                  })
                : tasks.length > 0
                ? t('noTasksDueTodaySummary', { count: formatNum(completedTodayCount) })
                : t('dailyProgressEmpty')}
            </p>
          </div>
        </div>

        {/* 3 Summary Stat Cards */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => onNavigate('subjects')}
            className="text-start rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 p-4 sm:p-5 transition-colors flex flex-col justify-between min-h-[112px] cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold tracking-wide">{t('navSubjects')}</span>
              <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono-num text-slate-900 dark:text-slate-50">
                {formatNum(subjects.length)}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
                {t('manageCourses')}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('tasks')}
            className="text-start rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 p-4 sm:p-5 transition-colors flex flex-col justify-between min-h-[112px] cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold tracking-wide">{t('pendingTasks')}</span>
              <CheckSquare className="w-4 h-4 text-violet-500 shrink-0" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-bold font-mono-num text-slate-900 dark:text-slate-50">
                {formatNum(totalPending)}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
                {totalPending === 0 ? t('allCaughtUp') : t('viewTaskQueue')}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('exams')}
            className="col-span-2 sm:col-span-1 text-start rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 p-4 sm:p-5 transition-colors flex flex-col justify-between min-h-[112px] cursor-pointer group"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold tracking-wide">{t('nextExam')}</span>
              <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />
            </div>
            <div className="mt-3">
              {nextExam && nextExamDays !== null ? (
                <>
                  <div className="text-2xl sm:text-3xl font-bold font-mono-num text-slate-900 dark:text-slate-50">
                    {nextExamDays === 0
                      ? t('today')
                      : nextExamDays === 1
                      ? t('oneDay')
                      : t('daysShort', { count: formatNum(nextExamDays) })}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {nextExam.name}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold font-mono-num text-slate-400 dark:text-slate-600">
                    —
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 transition-colors">
                    {t('addExamDate')}
                  </p>
                </>
              )}
            </div>
          </button>
        </div>
      </section>

      {/* Main Content Split: Today's Study Tasks + Today's Timetable */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Today's Study Tasks */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('todaysStudyTasks')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('todaysStudyTasksSub')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('tasks')}
              className="inline-flex items-center gap-1 min-h-[40px] px-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors shrink-0 cursor-pointer"
            >
              <span>{t('allTasksLink')}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>

          {todayTasks.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('noTasksTodayTitle')}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {t('noTasksTodaySub')}
              </p>
              <button
                type="button"
                onClick={onQuickAddTask}
                className="mt-4 inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('addTaskForToday')}</span>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {todayTasks.map((task) => {
                const subject = task.subjectId ? subjectMap.get(task.subjectId) : undefined;
                const isOverdue = !task.completed && task.dueDate < todayISO;
                const priorityText =
                  task.priority === 'high'
                    ? t('priorityLabelHigh')
                    : task.priority === 'medium'
                    ? t('priorityLabelMedium')
                    : t('priorityLabelLow');

                return (
                  <li
                    key={task.id}
                    className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onToggleTask(task.id)}
                      aria-label={
                        task.completed
                          ? t('markTaskPendingAria', { title: task.title })
                          : t('markTaskCompletedAria', { title: task.title })
                      }
                      className="min-h-[44px] min-w-[44px] -ms-2 -my-1.5 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          task.completed
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500'
                        }`}
                      >
                        {task.completed && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="flex-1 min-w-0 text-start py-0.5 cursor-pointer"
                    >
                      <p
                        className={`text-sm font-medium leading-snug ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {subject ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: subject.color }}
                            />
                            <span>{subject.name}</span>
                          </span>
                        ) : (
                          <span>{t('general')}</span>
                        )}
                        <span aria-hidden="true">·</span>
                        <span>{priorityText}</span>
                        {isOverdue && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-rose-600 dark:text-rose-400">
                              {t('overdueLabel', {
                                date: formatCompactDate(task.dueDate, intlLocale, compactDateLabels),
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Today's Study Timetable Preview */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('todaysTimetable')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {todaySessions.length === 0
                  ? t('noSessionsBooked')
                  : t(todaySessions.length === 1 ? 'sessionsPlannedOne' : 'sessionsPlannedMany', {
                      count: formatNum(todaySessions.length),
                    })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="inline-flex items-center gap-1 min-h-[40px] px-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors shrink-0 cursor-pointer"
            >
              <span>{t('navSchedule')}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
            </button>
          </div>

          {todaySessions.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CalendarClock className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2.5" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t('openStudyBlocksTitle')}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('openStudyBlocksSub')}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('timetable')}
                className="mt-4 inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors cursor-pointer"
              >
                <span>{t('openTimetable')}</span>
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {todaySessions.map((session) => {
                const subject = subjectMap.get(session.subjectId);
                const endTime = addMinutesToTime(session.startTime, session.durationMinutes);
                return (
                  <li key={session.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: subject?.color ?? '#6366F1' }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {subject?.name ?? t('studySessionFallback')}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {session.topic ||
                            formatDuration(session.durationMinutes, durationFormatters)}
                        </p>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-xs font-semibold font-mono-num text-slate-800 dark:text-slate-200">
                        {formatTimeDisplay(session.startTime, intlLocale)}
                      </p>
                      <p className="text-[11px] font-mono-num text-slate-500 dark:text-slate-400">
                        {t('toTime', { time: formatTimeDisplay(endTime, intlLocale) })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
};
