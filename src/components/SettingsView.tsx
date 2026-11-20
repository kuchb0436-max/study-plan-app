import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  Eye,
  Globe,
  History,
  Languages,
  Moon,
  RotateCcw,
  Search,
  Sun,
  Upload,
  User,
} from 'lucide-react';
import { useI18n } from '../i18n';
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

interface PendingImportState {
  data: StudyFlowData;
  skippedCount: number;
  profilePreserved: boolean;
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
  const {
    t,
    language,
    languageCode,
    isAutoDetected,
    supportedLanguages,
    setLanguage,
    setAutoLanguage,
    formatNum,
  } = useI18n();

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

  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState('');

  useEffect(() => {
    setProfileName(data.profile.name);
    setProfileGrade(data.profile.grade);
  }, [data.profile.name, data.profile.grade]);

  const filteredLanguages = useMemo(() => {
    const query = languageSearch.trim().toLowerCase();
    if (!query) return supportedLanguages;
    return supportedLanguages.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.nativeName.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query)
    );
  }, [supportedLanguages, languageSearch]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = profileName.trim();
    const trimmedGrade = profileGrade.trim();
    if (!trimmedName) {
      setProfileError(t('errProfileNameEmpty'));
      return;
    }
    if (!trimmedGrade) {
      setProfileError(t('errProfileGradeEmpty'));
      return;
    }
    setProfileError('');
    onUpdateProfile({ name: trimmedName, grade: trimmedGrade });
    setFeedback({
      type: 'success',
      message: t('profileUpdatedMsg'),
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
          message: t('exportFailedBrowser'),
        });
        return;
      }
      setFeedback({
        type: 'success',
        message: t('exportStartedMsg', { filename }),
      });
    } catch {
      setFeedback({
        type: 'error',
        message: t('exportErrorMsg'),
      });
    }
  };

  const buildImportWarnings = (skippedCount: number, profilePreserved: boolean): string[] => {
    const notes: string[] = [];
    if (skippedCount > 0) {
      notes.push(t('skippedEntriesNote', { count: formatNum(skippedCount) }));
    }
    if (profilePreserved) {
      notes.push(t('profilePreservedNote'));
    }
    return notes;
  };

  const applyImport = (pending: PendingImportState) => {
    const result = onImportData(pending.data);
    setPendingImport(null);
    if (!result.ok) {
      setFeedback({
        type: 'error',
        message: result.error ?? t('importSaveFailedError'),
      });
      return;
    }

    const baseMessage = t('importSuccessMsg', {
      subjects: formatNum(pending.data.subjects.length),
      tasks: formatNum(pending.data.tasks.length),
      sessions: formatNum(pending.data.sessions.length),
      exams: formatNum(pending.data.exams.length),
    });
    const extraNotes = buildImportWarnings(pending.skippedCount, pending.profilePreserved);
    setFeedback({
      type: 'success',
      message: extraNotes.length > 0 ? `${baseMessage} ${extraNotes.join(' ')}` : baseMessage,
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
          message: t('importEmptyFileError'),
        });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setFeedback({
          type: 'error',
          message: t('importMalformedJsonError'),
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
          message: t('invalidBackupGeneric'),
        });
        return;
      }

      const pending: PendingImportState = {
        data: result.data,
        skippedCount: result.skippedCount ?? 0,
        profilePreserved: Boolean(result.profilePreserved),
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
        message: t('importReadError'),
      });
    }
  };

  const pendingWarnings = pendingImport
    ? buildImportWarnings(pendingImport.skippedCount, pendingImport.profilePreserved)
    : [];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t('navSettings')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('settingsSub')}</p>
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
              {t('studentProfileTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('savedLocallyDevice')}
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
                {t('studentNameLabel')}
              </label>
              <input
                id="settings-profile-name"
                type="text"
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value);
                  if (profileError) setProfileError('');
                }}
                placeholder={t('yourNamePlaceholder')}
                maxLength={60}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="settings-profile-grade"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                {t('classGradeLabel')}
              </label>
              <input
                id="settings-profile-grade"
                type="text"
                value={profileGrade}
                onChange={(e) => {
                  setProfileGrade(e.target.value);
                  if (profileError) setProfileError('');
                }}
                placeholder={t('classGradePlaceholder')}
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
              {t('saveProfile')}
            </button>

            <button
              type="button"
              onClick={onPreviewOnboarding}
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 shrink-0" />
              <span>{t('previewWelcomeScreen')}</span>
            </button>
          </div>
        </form>
      </section>

      {/* Theme Section */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t('appearanceTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('appearanceSub')}
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
            <Moon className="w-4 h-4 shrink-0" />
            <span>{t('themeDark')}</span>
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
            <Sun className="w-4 h-4 shrink-0" />
            <span>{t('themeLight')}</span>
          </button>
        </div>
      </section>

      {/* Language Section */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <Languages className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t('languageTitle')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('languageSub')}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
            {t('languageCountLabel', { count: formatNum(supportedLanguages.length) })}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {language.nativeName}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({language.name})
              </span>
              {isAutoDetected && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold">
                  {t('languageAutoBadge')}
                </span>
              )}
              {language.dir === 'rtl' && (
                <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px] font-bold uppercase">
                  {t('rtlBadge')}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setLanguageSearch('');
              setLanguageModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-colors shrink-0 cursor-pointer"
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>{t('languageChangeBtn')}</span>
          </button>
        </div>
      </section>

      {/* Data Backup & Restore */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {t('personalDataBackupTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
            {t('currentlyStoring', {
              subjects: formatNum(data.subjects.length),
              tasks: formatNum(data.tasks.length),
              sessions: formatNum(data.sessions.length),
              exams: formatNum(data.exams.length),
            })}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>{t('exportJsonBackup')}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>{t('importJsonBackup')}</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
            aria-label={t('importFileAria')}
          />
        </div>

        {preImportBackup && (
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <History className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {t('preImportBackupTitle')}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 tabular-nums">
                  {t('preImportBackupDesc', {
                    subjects: formatNum(preImportBackup.data.subjects.length),
                    tasks: formatNum(preImportBackup.data.tasks.length),
                    sessions: formatNum(preImportBackup.data.sessions.length),
                    exams: formatNum(preImportBackup.data.exams.length),
                  })}
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
                      message: t('restoredPreImportMsg'),
                    });
                  } else {
                    setFeedback({
                      type: 'error',
                      message: res.error ?? t('restorePreImportErr'),
                    });
                  }
                }}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('restorePreviousData')}
              </button>
              <button
                type="button"
                onClick={onDismissPreImportBackup}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t('dismissBackup')}
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
                  {t('preservedCorruptedTitle')}
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300/90 mt-0.5">
                  {t('preservedCorruptedDesc')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onDownloadCorruptedBackup}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                {t('downloadRawSnapshot')}
              </button>
              <button
                type="button"
                onClick={onDiscardCorruptedBackup}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-amber-500/40 text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-500/15 transition-colors cursor-pointer"
              >
                {t('discardSnapshot')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Reset Application Data */}
      <section className="rounded-2xl bg-white dark:bg-[#0F172A] border border-rose-200 dark:border-rose-900/50 p-5 space-y-3">
        <div>
          <h2 className="text-base font-bold text-rose-600 dark:text-rose-400">
            {t('resetDataTitle')}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            {t('resetDataSub')}
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
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>{t('resetAllData')}</span>
        </button>
      </section>

      {/* Language Selector Modal */}
      <ModalSheet
        isOpen={languageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
        title={t('languageSelectorTitle')}
      >
        <div className="space-y-3.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={languageSearch}
              onChange={(e) => setLanguageSearch(e.target.value)}
              placeholder={t('languageSearchPlaceholder')}
              aria-label={t('languageSearchAria')}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 ps-9 pe-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setAutoLanguage();
              setLanguageModalOpen(false);
            }}
            className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 text-start transition-colors cursor-pointer ${
              isAutoDetected
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Globe className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-sm font-semibold truncate">{t('languageMatchDevice')}</span>
            </div>
            {isAutoDetected && <Check className="w-4 h-4 text-indigo-500 shrink-0" />}
          </button>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pe-0.5">
            {filteredLanguages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center space-y-2.5">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('languageNoResults')}
                </p>
                <button
                  type="button"
                  onClick={() => setLanguageSearch('')}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t('languageClearSearch')}
                </button>
              </div>
            ) : (
              filteredLanguages.map((item) => {
                const isSelected = !isAutoDetected && item.code === languageCode;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => {
                      setLanguage(item.code);
                      setLanguageModalOpen(false);
                    }}
                    className={`w-full min-h-[48px] px-3.5 py-2 rounded-xl border flex items-center justify-between gap-3 text-start transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.nativeName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {item.name} · {item.code}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.dir === 'rtl' && (
                        <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-700 dark:text-violet-300 text-[10px] font-bold uppercase">
                          {t('rtlBadge')}
                        </span>
                      )}
                      {isSelected && <Check className="w-4 h-4 text-indigo-500" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </ModalSheet>

      {/* Confirm Import Dialog (Prevents accidental data loss) */}
      <ModalSheet
        isOpen={Boolean(pendingImport)}
        onClose={() => setPendingImport(null)}
        title={t('confirmImportTitle')}
      >
        {pendingImport && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('confirmImportBody')}
            </p>
            <ul className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 space-y-1 text-sm text-slate-800 dark:text-slate-200 tabular-nums">
              <li>{t('countSubjects', { count: formatNum(pendingImport.data.subjects.length) })}</li>
              <li>{t('countTasks', { count: formatNum(pendingImport.data.tasks.length) })}</li>
              <li>{t('countSessions', { count: formatNum(pendingImport.data.sessions.length) })}</li>
              <li>{t('countExams', { count: formatNum(pendingImport.data.exams.length) })}</li>
              {pendingImport.data.profile.name && (
                <li className="pt-1 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  {t('profileSummary', {
                    profile: `${pendingImport.data.profile.name}${
                      pendingImport.data.profile.grade
                        ? ` (${pendingImport.data.profile.grade})`
                        : ''
                    }`,
                  })}
                </li>
              )}
            </ul>
            {pendingWarnings.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                {pendingWarnings.map((note) => (
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
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => applyImport(pendingImport)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                {t('replaceAndImport')}
              </button>
            </div>
          </div>
        )}
      </ModalSheet>

      {/* Confirm Reset Dialog */}
      <ModalSheet
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        title={t('resetModalTitle')}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('resetModalBody')}</p>

          <label className="flex items-center gap-3 min-h-[44px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={resetOnboardingAlso}
              onChange={(e) => setResetOnboardingAlso(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {t('resetAlsoOnboarding')}
            </span>
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onResetData({ resetOnboarding: resetOnboardingAlso });
                setConfirmResetOpen(false);
                setFeedback({
                  type: 'success',
                  message: t('resetSuccessMsg'),
                });
              }}
              className="min-h-[44px] px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold text-white transition-colors cursor-pointer"
            >
              {t('confirmReset')}
            </button>
          </div>
        </div>
      </ModalSheet>
    </div>
  );
};
