import React, { useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Clock, Target } from 'lucide-react';
import { useI18n } from '../i18n';
import { StudySession, StudyTask, Subject } from '../types/study';
import { formatDuration, getLast7Days, toLocalISODate } from '../utils/date';

interface ProgressTrackerViewProps {
  tasks: StudyTask[];
  subjects: Subject[];
  sessions: StudySession[];
}

export const ProgressTrackerView: React.FC<ProgressTrackerViewProps> = ({
  tasks,
  subjects,
  sessions,
}) => {
  const { t, language, formatNum } = useI18n();
  const intlLocale = language.intlLocale;
  const todayLabel = t('today');

  const todayISO = toLocalISODate();
  const last7Days = useMemo(
    () => getLast7Days(intlLocale, todayLabel),
    [intlLocale, todayLabel]
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6); // Today by default

  const durationFormatters = {
    min: (n: number) => t('durationMin', { n: formatNum(n) }),
    hrs: (h: number) => t('durationHrs', { h: formatNum(h) }),
    hrsMin: (h: number, m: number) => t('durationHrsMin', { h: formatNum(h), m: formatNum(m) }),
  };

  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((taskItem) => taskItem.completed).length;
    const overallRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const dueToday = tasks.filter((taskItem) => taskItem.dueDate === todayISO);
    const dueTodayCompleted = dueToday.filter((taskItem) => taskItem.completed).length;
    const dailyRate = dueToday.length > 0 ? Math.round((dueTodayCompleted / dueToday.length) * 100) : 0;

    const completedPerDay = last7Days.map((bucket) => {
      const count = tasks.filter((taskItem) => {
        if (!taskItem.completed) return false;
        const completedDay = taskItem.completedAt
          ? toLocalISODate(new Date(taskItem.completedAt))
          : taskItem.dueDate;
        return completedDay === bucket.isoDate;
      }).length;
      return { ...bucket, count };
    });

    const weeklyCompleted = completedPerDay.reduce((sum, d) => sum + d.count, 0);
    const maxDayCount = Math.max(1, ...completedPerDay.map((d) => d.count));

    const weeklyMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

    const priorityStats = (['high', 'medium', 'low'] as const).map((level) => {
      const matching = tasks.filter((taskItem) => taskItem.priority === level);
      const done = matching.filter((taskItem) => taskItem.completed).length;
      return {
        level,
        total: matching.length,
        done,
        percent: matching.length > 0 ? Math.round((done / matching.length) * 100) : 0,
      };
    });

    return {
      totalTasks,
      completedTasks,
      overallRate,
      dueTodayCount: dueToday.length,
      dueTodayCompleted,
      dailyRate,
      completedPerDay,
      weeklyCompleted,
      maxDayCount,
      weeklyMinutes,
      priorityStats,
    };
  }, [tasks, sessions, todayISO, last7Days]);

  const activeDay = stats.completedPerDay[selectedDayIndex] ?? stats.completedPerDay[6];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t('progressTitle')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('progressSub')}</p>
      </div>

      {/* Top 4 KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">{t('todaysFocus')}</span>
            <Target className="w-4 h-4 text-blue-500 shrink-0" />
          </div>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold font-mono-num text-slate-900 dark:text-slate-50">
            {formatNum(stats.dailyRate)}%
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {stats.dueTodayCount > 0
              ? t('ofDueToday', {
                  done: formatNum(stats.dueTodayCompleted),
                  total: formatNum(stats.dueTodayCount),
                })
              : t('noTasksDueToday')}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">{t('last7Days')}</span>
            <BarChart3 className="w-4 h-4 text-indigo-500 shrink-0" />
          </div>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold font-mono-num text-slate-900 dark:text-slate-50">
            {formatNum(stats.weeklyCompleted)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {stats.weeklyCompleted === 1 ? t('taskCompletedOne') : t('tasksCompletedMany')}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">{t('overallRate')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          </div>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold font-mono-num text-slate-900 dark:text-slate-50">
            {formatNum(stats.overallRate)}%
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {t('ofTotalTasks', {
              done: formatNum(stats.completedTasks),
              total: formatNum(stats.totalTasks),
            })}
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold">{t('weeklyPlan')}</span>
            <Clock className="w-4 h-4 text-violet-500 shrink-0" />
          </div>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold font-mono-num text-slate-900 dark:text-slate-50">
            {formatDuration(stats.weeklyMinutes, durationFormatters)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {t(sessions.length === 1 ? 'scheduledBlockOne' : 'scheduledBlockMany', {
              count: formatNum(sessions.length),
            })}
          </p>
        </div>
      </section>

      {/* Charts Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Weekly Completed Tasks Chart */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('weeklyCompletionChart')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('weeklyCompletionSub')}
              </p>
            </div>
            {activeDay && (
              <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 tabular-nums">
                {t('dayCompletedCount', {
                  day: activeDay.fullLabel,
                  count: formatNum(activeDay.count),
                  unit: activeDay.count === 1 ? t('taskWordOne') : t('taskWordMany'),
                })}
              </div>
            )}
          </div>

          <div className="h-52 flex items-end justify-between gap-2 sm:gap-3 pt-4 pb-1 border-b border-slate-100 dark:border-slate-800">
            {stats.completedPerDay.map((day, idx) => {
              const heightPercent =
                day.count === 0
                  ? 6
                  : Math.max(14, Math.round((day.count / stats.maxDayCount) * 100));
              const isSelected = idx === selectedDayIndex;
              const unit = day.count === 1 ? t('taskWordOne') : t('taskWordMany');
              return (
                <button
                  key={day.isoDate}
                  type="button"
                  onClick={() => setSelectedDayIndex(idx)}
                  aria-label={t('dayCompletedCount', {
                    day: day.fullLabel,
                    count: formatNum(day.count),
                    unit,
                  })}
                  className="flex-1 h-full flex flex-col items-center justify-end gap-2 group cursor-pointer focus:outline-none"
                >
                  <span
                    className={`text-xs font-mono-num font-semibold transition-colors ${
                      day.count > 0
                        ? isSelected
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-700 dark:text-slate-300'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {formatNum(day.count)}
                  </span>
                  <div className="w-full max-w-[40px] flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        day.count === 0
                          ? 'bg-slate-100 dark:bg-slate-800/80'
                          : isSelected
                          ? 'bg-gradient-to-t from-indigo-600 to-blue-500'
                          : 'bg-indigo-500/75 dark:bg-indigo-500/60 group-hover:bg-indigo-500'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2.5">
            {stats.completedPerDay.map((day, idx) => (
              <button
                key={day.isoDate}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex-1 text-center text-[11px] font-medium truncate cursor-pointer ${
                  idx === selectedDayIndex
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority & Daily Distribution */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 flex flex-col justify-between gap-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {t('completionByPriority')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('completionByPrioritySub')}
            </p>
          </div>

          {tasks.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('addTasksPriorityEmpty')}
            </div>
          ) : (
            <div className="space-y-4">
              {stats.priorityStats.map((item) => {
                const barColor =
                  item.level === 'high'
                    ? 'bg-rose-500'
                    : item.level === 'medium'
                    ? 'bg-indigo-500'
                    : 'bg-blue-500';
                const levelLabel =
                  item.level === 'high'
                    ? t('priorityHigh')
                    : item.level === 'medium'
                    ? t('priorityMedium')
                    : t('priorityLow');
                return (
                  <div key={item.level}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {t('priorityHeading', { level: levelLabel })}
                      </span>
                      <span className="font-mono-num text-slate-600 dark:text-slate-400">
                        {formatNum(item.done)}/{formatNum(item.total)} ({formatNum(item.percent)}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t('pendingTasksRemaining')}</span>
            <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
              {formatNum(stats.totalTasks - stats.completedTasks)}
            </span>
          </div>
        </div>
      </section>

      {/* Subject Progress Breakdown */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t('subjectProgressBreakdown')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('subjectProgressSub')}
          </p>
        </div>

        {subjects.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4">
            {t('noSubjectsProgressEmpty')}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((subject) => {
              const subTasks = tasks.filter((taskItem) => taskItem.subjectId === subject.id);
              const done = subTasks.filter((taskItem) => taskItem.completed).length;
              const total = subTasks.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <div key={subject.id} className="py-2">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {subject.name}
                      </span>
                    </div>
                    <span className="text-xs font-mono-num text-slate-600 dark:text-slate-400 shrink-0 ms-2">
                      {formatNum(done)}/{formatNum(total)} · {formatNum(pct)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: subject.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
