import React, { useMemo, useState } from 'react';
import { GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { Exam, Subject } from '../types/study';
import {
  addDaysToISO,
  daysUntil,
  formatShortDate,
  isValidDateISO,
  toLocalISODate,
} from '../utils/date';
import { ModalSheet } from './ModalSheet';

interface ExamCountdownViewProps {
  exams: Exam[];
  subjects: Subject[];
  onSaveExam: (payload: {
    id?: string;
    name: string;
    date: string;
    subjectId: string | null;
    notes?: string;
  }) => void;
  onDeleteExam: (examId: string) => void;
}

export const ExamCountdownView: React.FC<ExamCountdownViewProps> = ({
  exams,
  subjects,
  onSaveExam,
  onDeleteExam,
}) => {
  const { t, language, formatNum } = useI18n();
  const intlLocale = language.intlLocale;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState(addDaysToISO(toLocalISODate(), 7));
  const [subjectId, setSubjectId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const { upcoming, past } = useMemo(() => {
    const up: Exam[] = [];
    const pa: Exam[] = [];
    for (const exam of exams) {
      if (daysUntil(exam.date) >= 0) {
        up.push(exam);
      } else {
        pa.push(exam);
      }
    }
    up.sort((a, b) => a.date.localeCompare(b.date));
    pa.sort((a, b) => b.date.localeCompare(a.date));
    return { upcoming: up, past: pa };
  }, [exams]);

  const openCreateModal = () => {
    setEditingExam(null);
    setName('');
    setDate(addDaysToISO(toLocalISODate(), 7));
    setSubjectId(subjects[0]?.id ?? '');
    setNotes('');
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (exam: Exam) => {
    setEditingExam(exam);
    setName(exam.name);
    setDate(exam.date);
    setSubjectId(exam.subjectId ?? '');
    setNotes(exam.notes ?? '');
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t('errExamNameRequired'));
      return;
    }
    if (trimmed.length > 100) {
      setError(t('errExamNameMax'));
      return;
    }
    if (!isValidDateISO(date)) {
      setError(t('errExamDateInvalid'));
      return;
    }

    onSaveExam({
      id: editingExam?.id,
      name: trimmed,
      date,
      subjectId: subjectId || null,
      notes: notes.trim() || undefined,
    });
    setModalOpen(false);
  };

  const renderExamCard = (exam: Exam) => {
    const remaining = daysUntil(exam.date);
    const subject = exam.subjectId ? subjectMap.get(exam.subjectId) : undefined;

    let countdownMain = '';
    let countdownSub = '';
    let statusClass = 'text-indigo-600 dark:text-indigo-400';

    if (remaining === 0) {
      countdownMain = t('today');
      countdownSub = t('examDaySub');
      statusClass = 'text-rose-600 dark:text-rose-400';
    } else if (remaining === 1) {
      countdownMain = formatNum(1);
      countdownSub = t('dayLeftTomorrow');
      statusClass = 'text-amber-600 dark:text-amber-400';
    } else if (remaining > 1 && remaining <= 7) {
      countdownMain = formatNum(remaining);
      countdownSub = t('daysLeftSoon');
      statusClass = 'text-amber-600 dark:text-amber-400';
    } else if (remaining > 7) {
      countdownMain = formatNum(remaining);
      countdownSub = t('daysLeft');
      statusClass = 'text-indigo-600 dark:text-indigo-400';
    } else {
      const ago = Math.abs(remaining);
      countdownMain = formatNum(ago);
      countdownSub = ago === 1 ? t('dayAgoPast') : t('daysAgoPast');
      statusClass = 'text-slate-400 dark:text-slate-500';
    }

    return (
      <article
        key={exam.id}
        className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 flex items-center justify-between gap-4"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {subject && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: subject.color }}
              />
            )}
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
              {exam.name}
            </h2>
          </div>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatShortDate(exam.date, intlLocale)}</span>
            {subject ? ` · ${subject.name}` : ''}
          </p>

          {exam.notes && (
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
              {exam.notes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-end">
            <div className={`text-2xl sm:text-3xl font-bold font-mono-num leading-none ${statusClass}`}>
              {countdownMain}
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {countdownSub}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center -me-2">
            <button
              type="button"
              onClick={() => openEditModal(exam)}
              aria-label={t('editItemAria', { name: exam.name })}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDeleteExam(exam.id)}
              aria-label={t('deleteItemAria', { name: exam.name })}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {t('examCountdownTitle')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('examCountdownSub')}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addExam')}</span>
        </button>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 px-6 py-14 text-center">
          <GraduationCap className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t('noExamsTitle')}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t('noExamsSub')}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addFirstExam')}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 tabular-nums">
                {t('upcomingCount', { count: formatNum(upcoming.length) })}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {upcoming.map(renderExamCard)}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 tabular-nums">
                {t('pastExamsCount', { count: formatNum(past.length) })}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-80">
                {past.map(renderExamCard)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Add / Edit Exam Modal */}
      <ModalSheet
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExam ? t('editExam') : t('addExamTitle')}
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
              htmlFor="exam-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {t('examNameLabel')}
            </label>
            <input
              id="exam-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder={t('examNamePlaceholder')}
              maxLength={100}
              autoFocus
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="exam-date"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {t('examDateLabel')}
              </label>
              <input
                id="exam-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (error) setError('');
                }}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="exam-subject"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                {t('subjectLabel')}{' '}
                <span className="text-slate-400 font-normal">{t('optionalTag')}</span>
              </label>
              <select
                id="exam-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">{t('general')}</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="exam-notes"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              {t('roomTopicsLabel')}{' '}
              <span className="text-slate-400 font-normal">{t('optionalTag')}</span>
            </label>
            <textarea
              id="exam-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('roomTopicsPlaceholder')}
              maxLength={300}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors cursor-pointer"
            >
              {editingExam ? t('saveChanges') : t('addExam')}
            </button>
          </div>
        </form>
      </ModalSheet>
    </div>
  );
};
