import React, { useMemo, useState } from 'react';
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react';
import { StudySession, Subject } from '../types/study';
import {
  addMinutesToTime,
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  formatDuration,
  formatTimeDisplay,
  getTodayWeekdayIndex,
  isValidTime24,
} from '../utils/date';
import { ModalSheet } from './ModalSheet';

interface TimetableViewProps {
  sessions: StudySession[];
  subjects: Subject[];
  onSaveSession: (payload: {
    id?: string;
    subjectId: string;
    dayOfWeek: number;
    startTime: string;
    durationMinutes: number;
    topic?: string;
  }) => void;
  onDeleteSession: (sessionId: string) => void;
  onNavigateToSubjects: () => void;
}

const DURATION_PRESETS = [30, 45, 60, 90, 120];

export const TimetableView: React.FC<TimetableViewProps> = ({
  sessions,
  subjects,
  onSaveSession,
  onDeleteSession,
  onNavigateToSubjects,
}) => {
  const todayWeekday = getTodayWeekdayIndex();
  const [selectedDay, setSelectedDay] = useState<number>(todayWeekday);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState<number>(todayWeekday);
  const [startTime, setStartTime] = useState('16:00');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const daySessions = useMemo(() => {
    return sessions
      .filter((s) => s.dayOfWeek === selectedDay)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [sessions, selectedDay]);

  const dayTotalMinutes = useMemo(
    () => daySessions.reduce((acc, s) => acc + s.durationMinutes, 0),
    [daySessions]
  );

  const weekTotalMinutes = useMemo(
    () => sessions.reduce((acc, s) => acc + s.durationMinutes, 0),
    [sessions]
  );

  const openCreateModal = () => {
    setEditingSession(null);
    setSubjectId(subjects[0]?.id ?? '');
    setDayOfWeek(selectedDay);
    setStartTime('16:00');
    setDurationMinutes('60');
    setTopic('');
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (session: StudySession) => {
    setEditingSession(session);
    setSubjectId(session.subjectId);
    setDayOfWeek(session.dayOfWeek);
    setStartTime(session.startTime);
    setDurationMinutes(String(session.durationMinutes));
    setTopic(session.topic ?? '');
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !subjectMap.has(subjectId)) {
      setError('Please select a subject.');
      return;
    }
    if (!isValidTime24(startTime)) {
      setError('Please enter a valid start time.');
      return;
    }
    const parsedDuration = Number(durationMinutes);
    if (!Number.isFinite(parsedDuration) || parsedDuration < 5 || parsedDuration > 600) {
      setError('Duration must be between 5 and 600 minutes.');
      return;
    }

    onSaveSession({
      id: editingSession?.id,
      subjectId,
      dayOfWeek,
      startTime,
      durationMinutes: Math.round(parsedDuration),
      topic: topic.trim() || undefined,
    });
    setSelectedDay(dayOfWeek);
    setModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Study Timetable
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Weekly total:{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-200 tabular-nums">
              {weekTotalMinutes > 0 ? formatDuration(weekTotalMinutes) : '0m'}
            </span>{' '}
            across <span className="tabular-nums">{sessions.length}</span>{' '}
            {sessions.length === 1 ? 'session' : 'sessions'}
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Study Session</span>
        </button>
      </div>

      {/* Horizontal 7-Day Selector */}
      <div
        role="tablist"
        aria-label="Select day of week"
        className="grid grid-cols-7 gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90"
      >
        {DAY_NAMES_SHORT.map((shortName, index) => {
          const isSelected = selectedDay === index;
          const isToday = todayWeekday === index;
          const count = sessions.filter((s) => s.dayOfWeek === index).length;
          return (
            <button
              key={shortName}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setSelectedDay(index)}
              className={`min-h-[52px] rounded-xl flex flex-col items-center justify-center gap-0.5 px-1 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span className="text-xs font-semibold tracking-tight whitespace-nowrap">
                {shortName}
              </span>
              <span
                className={`text-[10px] font-mono-num ${
                  isSelected
                    ? 'text-indigo-100'
                    : isToday
                    ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {count > 0 ? `${count}x` : isToday ? 'Today' : '—'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Day Schedule */}
      <div className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {DAY_NAMES_FULL[selectedDay]}
              {selectedDay === todayWeekday ? ' · Today' : ''}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {daySessions.length === 0
                ? 'No sessions scheduled'
                : `${daySessions.length} ${daySessions.length === 1 ? 'session' : 'sessions'} · ${formatDuration(dayTotalMinutes)} total`}
            </p>
          </div>
        </div>

        {subjects.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarClock className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Create a subject first
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Add at least one subject in Subject Manager before scheduling study blocks.
            </p>
            <button
              type="button"
              onClick={onNavigateToSubjects}
              className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <span>Go to Subjects</span>
            </button>
          </div>
        ) : daySessions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CalendarClock className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              No study sessions on {DAY_NAMES_FULL[selectedDay]}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Block focused study time with a subject, start time, and duration.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Session</span>
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {daySessions.map((session) => {
              const subject = subjectMap.get(session.subjectId);
              const endTime = addMinutesToTime(session.startTime, session.durationMinutes);
              return (
                <li
                  key={session.id}
                  className="px-4 sm:px-5 py-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-20 sm:w-24 shrink-0 pt-0.5">
                      <p className="text-sm font-semibold font-mono-num text-slate-900 dark:text-slate-100">
                        {formatTimeDisplay(session.startTime)}
                      </p>
                      <p className="text-xs font-mono-num text-slate-500 dark:text-slate-400">
                        {formatTimeDisplay(endTime)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: subject?.color ?? '#6366F1' }}
                        />
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                          {subject?.name ?? 'Unknown Subject'}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="tabular-nums font-medium">{formatDuration(session.durationMinutes)}</span>
                        {session.topic ? ` · ${session.topic}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center shrink-0 -mr-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(session)}
                      aria-label={`Edit ${subject?.name ?? 'study'} session`}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSession(session.id)}
                      aria-label={`Delete ${subject?.name ?? 'study'} session`}
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

      {/* Add / Edit Session Modal */}
      <ModalSheet
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSession ? 'Edit Study Session' : 'Add Study Session'}
      >
        {subjects.length === 0 ? (
          <div className="space-y-4 text-center py-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              You need at least one subject before adding a study session.
            </p>
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                onNavigateToSubjects();
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Add a Subject
            </button>
          </div>
        ) : (
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
                htmlFor="session-subject"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Subject
              </label>
              <select
                id="session-subject"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  if (error) setError('');
                }}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="session-day"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Day of Week
                </label>
                <select
                  id="session-day"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DAY_NAMES_FULL.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="session-start"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Start Time
                </label>
                <input
                  id="session-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="session-duration"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Duration (minutes)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDurationMinutes(String(preset));
                      if (error) setError('');
                    }}
                    className={`min-h-[38px] px-3 rounded-lg text-xs font-semibold tabular-nums transition-colors cursor-pointer ${
                      Number(durationMinutes) === preset
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {preset}m
                  </button>
                ))}
              </div>
              <input
                id="session-duration"
                type="number"
                min={5}
                max={600}
                value={durationMinutes}
                onChange={(e) => {
                  setDurationMinutes(e.target.value);
                  if (error) setError('');
                }}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm font-mono-num text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="session-topic"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Focus Topic <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="session-topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Practice past paper questions"
                maxLength={120}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
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
                {editingSession ? 'Save Changes' : 'Save Session'}
              </button>
            </div>
          </form>
        )}
      </ModalSheet>
    </div>
  );
};
