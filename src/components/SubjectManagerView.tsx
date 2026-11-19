import React, { useState } from 'react';
import { BookOpen, Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { StudySession, StudyTask, Subject, SUBJECT_COLORS } from '../types/study';
import { formatDuration } from '../utils/date';
import { ModalSheet } from './ModalSheet';

interface SubjectManagerViewProps {
  subjects: Subject[];
  tasks: StudyTask[];
  sessions: StudySession[];
  onSaveSubject: (payload: { id?: string; name: string; code?: string; color: string }) => void;
  onDeleteSubject: (subjectId: string) => void;
}

export const SubjectManagerView: React.FC<SubjectManagerViewProps> = ({
  subjects,
  tasks,
  sessions,
  onSaveSubject,
  onDeleteSubject,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0].hex);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setColor(SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length].hex);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    setName(subject.name);
    setCode(subject.code ?? '');
    setColor(subject.color);
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Subject name is required.');
      return;
    }
    if (trimmed.length > 60) {
      setError('Subject name must be 60 characters or fewer.');
      return;
    }
    const duplicate = subjects.some(
      (s) => s.id !== editingSubject?.id && s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setError('A subject with this name already exists.');
      return;
    }

    onSaveSubject({
      id: editingSubject?.id,
      name: trimmed,
      code: code.trim() || undefined,
      color,
    });
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Subjects
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Organize courses, assign colors, and track per-subject task completion.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 px-6 py-14 text-center">
          <BookOpen className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No subjects added yet
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Create your courses so you can categorize tasks, timetable blocks, and exams by subject.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Subject</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const subjectTasks = tasks.filter((t) => t.subjectId === subject.id);
            const completedCount = subjectTasks.filter((t) => t.completed).length;
            const totalCount = subjectTasks.length;
            const pendingCount = totalCount - completedCount;
            const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

            const weeklyMinutes = sessions
              .filter((s) => s.subjectId === subject.id)
              .reduce((acc, s) => acc + s.durationMinutes, 0);

            return (
              <article
                key={subject.id}
                className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: subject.color }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {subject.name}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {subject.code ? `${subject.code} · ` : ''}
                        <span className="tabular-nums">{pendingCount}</span> pending
                        {weeklyMinutes > 0 ? ` · ${formatDuration(weeklyMinutes)}/wk` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center shrink-0 -mr-2 -mt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(subject)}
                      aria-label={`Edit ${subject.name}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(subject)}
                      aria-label={`Delete ${subject.name}`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-600 dark:text-slate-400">
                      {totalCount === 0
                        ? 'No tasks assigned'
                        : `${completedCount} of ${totalCount} tasks done`}
                    </span>
                    <span className="font-semibold font-mono-num text-slate-900 dark:text-slate-100">
                      {percent}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: subject.color,
                      }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Subject Modal */}
      <ModalSheet
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubject ? 'Edit Subject' : 'Add Subject'}
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
              htmlFor="subject-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Subject Name
            </label>
            <input
              id="subject-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g., Organic Chemistry"
              maxLength={60}
              autoFocus
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="subject-code"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Course Code <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="subject-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g., CHEM 210"
              maxLength={20}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Color Accent
            </span>
            <div className="grid grid-cols-4 gap-2">
              {SUBJECT_COLORS.map((option) => {
                const selected = color.toLowerCase() === option.hex.toLowerCase();
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setColor(option.hex)}
                    aria-label={option.name}
                    aria-pressed={selected}
                    className={`min-h-[44px] rounded-xl border flex items-center justify-center gap-2 px-2 transition-all cursor-pointer ${
                      selected
                        ? 'border-indigo-500 bg-slate-100 dark:bg-slate-800 ring-2 ring-indigo-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: option.hex }}
                    >
                      {selected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                    </span>
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                      {option.id.charAt(0).toUpperCase() + option.id.slice(1)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors cursor-pointer"
            >
              {editingSubject ? 'Save Changes' : 'Create Subject'}
            </button>
          </div>
        </form>
      </ModalSheet>

      {/* Delete Subject Confirmation */}
      <ModalSheet
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Subject"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Delete <strong>{deleteTarget.name}</strong>? Any timetable sessions for this subject will be removed, and linked tasks or exams will switch to General.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSubject(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                Delete Subject
              </button>
            </div>
          </div>
        )}
      </ModalSheet>
    </div>
  );
};
