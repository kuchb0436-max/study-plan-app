import React, { useEffect, useState } from 'react';
import { StudyTask, Subject, TaskCategory, TaskPriority } from '../types/study';
import { isValidDateISO, toLocalISODate } from '../utils/date';
import { ModalSheet } from './ModalSheet';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialTask?: StudyTask | null;
  defaultDueDate?: string;
  onSave: (payload: {
    id?: string;
    title: string;
    notes?: string;
    category: TaskCategory;
    subjectId: string | null;
    priority: TaskPriority;
    dueDate: string;
  }) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  subjects,
  initialTask,
  defaultDueDate,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<TaskCategory>('homework');
  const [subjectId, setSubjectId] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState(toLocalISODate());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialTask) {
      setTitle(initialTask.title);
      setNotes(initialTask.notes ?? '');
      setCategory(initialTask.category);
      setSubjectId(initialTask.subjectId ?? '');
      setPriority(initialTask.priority);
      setDueDate(initialTask.dueDate);
    } else {
      setTitle('');
      setNotes('');
      setCategory('homework');
      setSubjectId(subjects[0]?.id ?? '');
      setPriority('medium');
      setDueDate(defaultDueDate ?? toLocalISODate());
    }
    setError('');
  }, [isOpen, initialTask, subjects, defaultDueDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Please enter a task title.');
      return;
    }
    if (trimmed.length > 120) {
      setError('Task title must be 120 characters or fewer.');
      return;
    }
    if (!isValidDateISO(dueDate)) {
      setError('Please select a valid due date.');
      return;
    }

    onSave({
      id: initialTask?.id,
      title: trimmed,
      notes: notes.trim() || undefined,
      category,
      subjectId: subjectId || null,
      priority,
      dueDate,
    });
    onClose();
  };

  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title={initialTask ? 'Edit Task' : 'New Study Task'}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-600 dark:text-rose-300"
          >
            {error}
          </div>
        )}

        <div>
          <label
            htmlFor="task-title"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Task Title
          </label>
          <input
            id="task-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g., Complete calculus worksheet 3"
            maxLength={120}
            autoFocus
            className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Type
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {(['homework', 'study'] as TaskCategory[]).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`min-h-[38px] rounded-lg text-sm font-medium capitalize transition-colors cursor-pointer ${
                    category === cat
                      ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="task-subject"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Subject
            </label>
            <select
              id="task-subject"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">General (No Subject)</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Priority
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                    priority === p
                      ? p === 'high'
                        ? 'bg-rose-600 text-white'
                        : p === 'medium'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="task-due-date"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Due Date
            </label>
            <input
              id="task-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                if (error) setError('');
              }}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="task-notes"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="task-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Chapters, page numbers, or study focus..."
            maxLength={500}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-sm font-semibold text-white transition-all cursor-pointer"
          >
            {initialTask ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </form>
    </ModalSheet>
  );
};
