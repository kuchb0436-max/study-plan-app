import React, { useMemo, useState } from 'react';
import { Check, CheckSquare, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { StudyTask, Subject } from '../types/study';
import { formatCompactDate, toLocalISODate } from '../utils/date';

type TaskFilter = 'all' | 'pending' | 'completed';

interface TaskManagerViewProps {
  tasks: StudyTask[];
  subjects: Subject[];
  onAddTask: () => void;
  onEditTask: (task: StudyTask) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenSubjects: () => void;
}

export const TaskManagerView: React.FC<TaskManagerViewProps> = ({
  tasks,
  subjects,
  onAddTask,
  onEditTask,
  onToggleTask,
  onDeleteTask,
  onOpenSubjects,
}) => {
  const { t, language, formatNum } = useI18n();
  const intlLocale = language.intlLocale;

  const [filter, setFilter] = useState<TaskFilter>('pending');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const todayISO = toLocalISODate();
  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const counts = useMemo(() => {
    const pending = tasks.filter((taskItem) => !taskItem.completed).length;
    const completed = tasks.length - pending;
    return { all: tasks.length, pending, completed };
  }, [tasks]);

  const compactDateLabels = {
    today: t('today'),
    tomorrow: t('tomorrow'),
    yesterday: t('yesterday'),
  };

  const filteredTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((taskItem) => {
        if (filter === 'pending' && taskItem.completed) return false;
        if (filter === 'completed' && !taskItem.completed) return false;
        if (subjectFilter === 'general' && taskItem.subjectId !== null) return false;
        if (
          subjectFilter !== 'all' &&
          subjectFilter !== 'general' &&
          taskItem.subjectId !== subjectFilter
        ) {
          return false;
        }
        if (q) {
          const subjectName = taskItem.subjectId
            ? subjectMap.get(taskItem.subjectId)?.name.toLowerCase() ?? ''
            : '';
          return (
            taskItem.title.toLowerCase().includes(q) ||
            (taskItem.notes ?? '').toLowerCase().includes(q) ||
            subjectName.includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        const priorityRank = { high: 0, medium: 1, low: 2 };
        return priorityRank[a.priority] - priorityRank[b.priority];
      });
  }, [tasks, filter, subjectFilter, searchQuery, subjectMap]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t('navTasks')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('tasksSub')}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSubjects}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            {t('subjectsCountBtn', { count: formatNum(subjects.length) })}
          </button>
          <button
            type="button"
            onClick={onAddTask}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addTask')}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div
          role="tablist"
          aria-label={t('filterBySubjectAria')}
          className="grid grid-cols-3 p-1 rounded-xl bg-slate-200/70 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shrink-0"
        >
          {(
            [
              {
                id: 'pending',
                label: t('filterPendingCount', { count: formatNum(counts.pending) }),
              },
              {
                id: 'completed',
                label: t('filterCompletedCount', { count: formatNum(counts.completed) }),
              },
              {
                id: 'all',
                label: t('filterAllCount', { count: formatNum(counts.all) }),
              },
            ] as { id: TaskFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`min-h-[38px] px-2 sm:px-3 rounded-lg text-[11px] sm:text-xs font-semibold transition-colors whitespace-nowrap tabular-nums cursor-pointer ${
                filter === tab.id
                  ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-1 gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchTasksPlaceholder')}
              aria-label={t('searchTasksAria')}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] ps-9 pe-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            aria-label={t('filterBySubjectAria')}
            className="min-h-[44px] max-w-[132px] sm:max-w-[160px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{t('allSubjects')}</option>
            <option value="general">{t('general')}</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <CheckSquare className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {tasks.length === 0
                ? t('noTasksCreatedTitle')
                : filter === 'pending' && counts.pending === 0
                ? t('noPendingTasksTitle')
                : t('noMatchingTasksTitle')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {tasks.length === 0 ? t('noTasksCreatedSub') : t('noMatchingTasksSub')}
            </p>
            <button
              type="button"
              onClick={onAddTask}
              className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addTask')}</span>
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredTasks.map((task) => {
              const subject = task.subjectId ? subjectMap.get(task.subjectId) : undefined;
              const isOverdue = !task.completed && task.dueDate < todayISO;
              const priorityLabel =
                task.priority === 'high'
                  ? t('priorityLabelHigh')
                  : task.priority === 'medium'
                  ? t('priorityLabelMedium')
                  : t('priorityLabelLow');
              const categoryLabel =
                task.category === 'homework' ? t('categoryHomework') : t('categoryStudy');
              const formattedDate = formatCompactDate(
                task.dueDate,
                intlLocale,
                compactDateLabels
              );

              return (
                <li
                  key={task.id}
                  className="px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
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

                    <div className="min-w-0 flex-1 py-0.5">
                      <p
                        className={`text-sm font-semibold leading-snug ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>

                      {task.notes && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {task.notes}
                        </p>
                      )}

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
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
                        <span>{categoryLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            task.priority === 'high' && !task.completed
                              ? 'font-medium text-rose-600 dark:text-rose-400'
                              : ''
                          }
                        >
                          {priorityLabel}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`tabular-nums ${
                            isOverdue ? 'font-semibold text-rose-600 dark:text-rose-400' : ''
                          }`}
                        >
                          {isOverdue
                            ? t('overdueLabel', { date: formattedDate })
                            : t('dueDateLabel', { date: formattedDate })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center shrink-0 -me-2">
                    <button
                      type="button"
                      onClick={() => onEditTask(task)}
                      aria-label={t('editItemAria', { name: task.title })}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      aria-label={t('deleteItemAria', { name: task.title })}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
