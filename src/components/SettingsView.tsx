import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Eye,
  History,
  Moon,
  RotateCcw,
  Smartphone,
  Sun,
  Upload,
  User,
} from 'lucide-react';
import { StudentProfile, StudyFlowData, ThemeMode } from '../types/study';
import { toLocalISODate } from '../utils/date';
import {
  buildExportPayload,
  CorruptedStorageRecord,
  downloadTextFile,
  PreImportBackupRecord,
  validateImportPayload,
} from '../utils/storage';
import { ModalSheet } from './ModalSheet';
import { PWAInstallButton } from './PWAInstallButton';

interface PendingImportState {
  data: StudyFlowData;
  skippedCount: number;
  warnings: string[];
}

interface SettingsViewProps {
  data: StudyFlowData;
  preImportBackup: PreImportBackupRecord | null;
  corruptedBackup: CorruptedStorageRecord | null;
  onChangeTheme: (theme: ThemeMode) => void;
  onUpdateProfile: (profile: StudentProfile) => void;
  onPreviewOnboarding: () => void;
  onImportData: (imported: StudyFlowData) => { ok: boolean; error?: string };
  onRestorePreImportBackup: () => { ok: boolean; error?: string };
  onDismissPreImportBackup: () => void;
  onDownloadCorruptedBackup: () => void;
  onDiscardCorruptedBackup: () => void;
  onResetData: (options: { resetOnboarding: boolean }) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  data,
  preImportBackup,
  corruptedBackup,
  onChangeTheme,
  onUpdateProfile,
  onPreviewOnboarding,
  onImportData,
  onRestorePreImportBackup,
  onDismissPreImportBackup,
  onDownloadCorruptedBackup,
  onDiscardCorruptedBackup,
  onResetData,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [profileName, setProfileName] = useState(data.profile.name);
  const [profileGrade, setProfileGrade] = useState(data.profile.grade);
  const [profileError, setProfileError] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [pendingImport, setPendingImport] = useState<PendingImportState | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [resetOnboardingAlso, setResetOnboardingAlso] = useState(false);

  useEffect(() => {
    setProfileName(data.profile.name);
    setProfileGrade(data.profile.grade);
  }, [data.profile.name, data.profile.grade]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = profileName.trim();
    const trimmedGrade = profileGrade.trim();
    if (!trimmedName) {
      setProfileError('Student name cannot be empty.');
      return;
    }
    if (!trimmedGrade) {
      setProfileError('Class or grade cannot be empty.');
      return;
    }
    setProfileError('');
    onUpdateProfile({ name: trimmedName, grade: trimmedGrade });
    setFeedback({
      type: 'success',
      message: 'Student profile updated.',
    });
  };

  const handleExport = () => {
    try {
      const jsonString = buildExportPayload(data);
      const filename = `study-flow-backup-${toLocalISODate()}.json`;
      const started = downloadTextFile(filename, jsonString, 'application/json;charset=utf-8');
      if (!started) {
        setFeedback({
          type: 'error',
          message: 'Could not start JSON backup download in this browser.',
        });
        return;
      }
      setFeedback({
        type: 'success',
        message: `Your Study Flow backup (${filename}) has started downloading.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not export data. Please try again.',
      });
    }
  };

  const applyImport = (pending: PendingImportState) => {
    const result = onImportData(pending.data);
    setPendingImport(null);
    if (!result.ok) {
      setFeedback({
        type: 'error',
        message: result.error ?? 'Could not save imported backup. Your previous data was kept.',
      });
      return;
    }

    const baseMessage = `Imported ${pending.data.subjects.length} subjects, ${pending.data.tasks.length} tasks, ${pending.data.sessions.length} sessions, and ${pending.data.exams.length} exams.`;
    const extraNotes =
      pending.warnings.length > 0 ? ` ${pending.warnings.join(' ')}` : '';
    setFeedback({
      type: 'success',
      message: `${baseMessage}${extraNotes} A backup of your previous data was saved automatically.`,
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      if (!text.trim()) {
        setFeedback({
          type: 'error',
          message: 'The selected file is empty. Existing data was not changed.',
        });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setFeedback({
          type: 'error',
          message:
            'Malformed JSON file: unable to read backup contents. Your existing data was not changed.',
        });
        return;
      }

      const result = validateImportPayload(parsed, {
        profile: data.profile,
        theme: data.theme,
      });
      if (!result.ok || !result.data) {
        setFeedback({
          type: 'error',
          message: `${result.error ?? 'Invalid Study Flow backup file.'} Your existing data was not changed.`,
        });
        return;
      }

      const pending: PendingImportState = {
        data: result.data,
        skippedCount: result.skippedCount ?? 0,
        warnings: result.warnings ?? [],
      };

      const hasCurrentData =
        data.subjects.length > 0 ||
        data.tasks.length > 0 ||
        data.sessions.length > 0 ||
        data.exams.length > 0;

      if (hasCurrentData) {
        setPendingImport(pending);
      } else {
        applyImport(pending);
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Could not read the selected file. Your existing data was kept intact.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Update your profile, customize appearance, or back up your local study data.
        </p>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Student Profile Section */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <User className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Student Profile
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Saved locally on this device
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-3.5" noValidate>
          {profileError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-600 dark:text-rose-300"
            >
              {profileError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="settings-profile-name"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Student Name
              </label>
              <input
                id="settings-profile-name"
                type="text"
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value);
                  if (profileError) setProfileError('');
                }}
                placeholder="Your name"
                maxLength={60}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="settings-profile-grade"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Class or Grade
              </label>
              <input
                id="settings-profile-grade"
                type="text"
                value={profileGrade}
                onChange={(e) => {
                  setProfileGrade(e.target.value);
                  if (profileError) setProfileError('');
                }}
                placeholder="e.g., Grade 11"
                maxLength={40}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Save Profile
            </button>

            <button
              type="button"
              onClick={onPreviewOnboarding}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Preview Welcome Screen</span>
            </button>
          </div>
        </form>
      </section>

      {/* Theme Section */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Appearance</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Switch between Dark Navy and Light theme
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <button
            type="button"
            onClick={() => onChangeTheme('dark')}
            aria-pressed={data.theme === 'dark'}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
              data.theme === 'dark'
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTheme('light')}
            aria-pressed={data.theme === 'light'}
            className={`min-h-[48px] px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
              data.theme === 'light'
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>Light</span>
          </button>
        </div>
      </section>

      {/* PWA Installation Section */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Smartphone className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Install &amp; Offline Support
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Study Flow caches the app shell on your device and stores everything locally in your browser without accounts.
            </p>
          </div>
        </div>
        <div className="pt-1">
          <PWAInstallButton variant="card" />
        </div>
      </section>

      {/* Data Backup & Restore */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Personal Data Backup
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            Currently storing {data.subjects.length} subjects · {data.tasks.length} tasks ·{' '}
            {data.sessions.length} sessions · {data.exams.length} exams
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export JSON Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Import JSON Backup</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
            aria-label="Import Study Flow JSON backup"
          />
        </div>

        {preImportBackup && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <History className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Pre-Import Backup Available
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 tabular-nums">
                  Saved before your last import ({preImportBackup.data.subjects.length} subjects ·{' '}
                  {preImportBackup.data.tasks.length} tasks ·{' '}
                  {preImportBackup.data.sessions.length} sessions ·{' '}
                  {preImportBackup.data.exams.length} exams).
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const res = onRestorePreImportBackup();
                  if (res.ok) {
                    setFeedback({
                      type: 'success',
                      message: 'Your previous data from before the last import has been restored.',
                    });
                  } else {
                    setFeedback({
                      type: 'error',
                      message: res.error ?? 'Could not restore the pre-import backup.',
                    });
                  }
                }}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Restore Previous Data
              </button>
              <button
                type="button"
                onClick={onDismissPreImportBackup}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Dismiss Backup
              </button>
            </div>
          </div>
        )}

        {corruptedBackup && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Preserved Unreadable Storage Snapshot
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                  A copy of your previous unreadable browser storage is safely preserved so you can download it for recovery.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onDownloadCorruptedBackup}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Download Raw Snapshot
              </button>
              <button
                type="button"
                onClick={onDiscardCorruptedBackup}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-amber-500/40 text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-500/15 transition-colors cursor-pointer"
              >
                Discard Snapshot
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Reset Application Data */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A] border border-rose-200 dark:border-rose-900/50 p-5 space-y-3">
        <div>
          <h2 className="text-base font-bold text-rose-600 dark:text-rose-400">
            Reset Application Data
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Permanently remove all subjects, tasks, timetable sessions, and exam countdowns from this device.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setResetOnboardingAlso(false);
            setConfirmResetOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-sm font-semibold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset All Data</span>
        </button>
      </section>

      {/* Confirm Import Dialog (Prevents accidental data loss) */}
      <ModalSheet
        isOpen={Boolean(pendingImport)}
        onClose={() => setPendingImport(null)}
        title="Confirm Backup Import"
      >
        {pendingImport && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Importing this backup will automatically save a recovery copy of your current data, then load:
            </p>
            <ul className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 space-y-1 text-sm text-slate-800 dark:text-slate-200 tabular-nums">
              <li>{pendingImport.data.subjects.length} subjects</li>
              <li>{pendingImport.data.tasks.length} tasks</li>
              <li>{pendingImport.data.sessions.length} study sessions</li>
              <li>{pendingImport.data.exams.length} examinations</li>
              {pendingImport.data.profile.name && (
                <li className="pt-1 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  Profile: {pendingImport.data.profile.name}
                  {pendingImport.data.profile.grade ? ` (${pendingImport.data.profile.grade})` : ''}
                </li>
              )}
            </ul>
            {pendingImport.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                {pendingImport.warnings.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingImport(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyImport(pendingImport)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                Replace &amp; Import
              </button>
            </div>
          </div>
        )}
      </ModalSheet>

      {/* Confirm Reset Dialog */}
      <ModalSheet
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        title="Reset Study Flow Data?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            This will permanently delete all your subjects, tasks, study timetable sessions, and exam dates stored on this device. Consider exporting a JSON backup first.
          </p>

          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={resetOnboardingAlso}
              onChange={(e) => setResetOnboardingAlso(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Also clear student profile and restart setup
            </span>
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onResetData({ resetOnboarding: resetOnboardingAlso });
                setConfirmResetOpen(false);
                setFeedback({
                  type: 'success',
                  message: 'All application data has been reset.',
                });
              }}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white transition-colors cursor-pointer"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      </ModalSheet>
    </div>
  );
};
