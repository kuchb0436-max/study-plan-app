import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  Moon,
  Plus,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import {
  StudentProfile,
  Subject,
  SUBJECT_COLORS,
  ThemeMode,
} from '../types/study';
import { generateId } from '../utils/storage';

interface OnboardingViewProps {
  initialProfile: StudentProfile;
  initialTheme: ThemeMode;
  initialSubjects: Subject[];
  isPreview?: boolean;
  onExitPreview?: () => void;
  onThemeChange: (theme: ThemeMode) => void;
  onComplete: (payload: {
    profile: StudentProfile;
    theme: ThemeMode;
    subjects: Subject[];
  }) => void;
}

type OnboardingStep = 'welcome' | 1 | 2 | 3;

const GRADE_SUGGESTIONS = [
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'Undergraduate',
  'Graduate',
];

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  initialProfile,
  initialTheme,
  initialSubjects,
  isPreview = false,
  onExitPreview,
  onThemeChange,
  onComplete,
}) => {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState(initialProfile.name);
  const [grade, setGrade] = useState(initialProfile.grade);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [profileError, setProfileError] = useState('');

  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');

  const initialUsedSet = useMemo(
    () => new Set(initialSubjects.map((s) => s.color.toLowerCase())),
    [initialSubjects]
  );
  const firstFreeColor =
    SUBJECT_COLORS.find((c) => !initialUsedSet.has(c.hex.toLowerCase()))?.hex ??
    SUBJECT_COLORS[initialSubjects.length % SUBJECT_COLORS.length].hex;

  const [subjectColor, setSubjectColor] = useState(firstFreeColor);
  const [subjectError, setSubjectError] = useState('');

  const existingSubjectIds = useMemo(
    () => new Set(initialSubjects.map((s) => s.id)),
    [initialSubjects]
  );

  const usedColors = useMemo(
    () => new Set(subjects.map((s) => s.color.toLowerCase())),
    [subjects]
  );
  const allColorsUsed = usedColors.size >= SUBJECT_COLORS.length;

  const handleSelectTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    onThemeChange(nextTheme);
  };

  const handleContinueFromProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedGrade = grade.trim();

    if (!trimmedName) {
      setProfileError('Please enter your name so we can personalize your planner.');
      return;
    }
    if (!trimmedGrade) {
      setProfileError('Please enter your class or grade.');
      return;
    }

    setProfileError('');
    setStep(2);
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = subjectName.trim();
    if (!trimmed) {
      setSubjectError('Enter a subject name to add it.');
      return;
    }
    if (trimmed.length > 60) {
      setSubjectError('Subject name must be 60 characters or fewer.');
      return;
    }
    const duplicate = subjects.some(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setSubjectError('You already added this subject.');
      return;
    }

    if (!allColorsUsed && usedColors.has(subjectColor.toLowerCase())) {
      setSubjectError('Choose a unique color that has not been assigned yet.');
      return;
    }

    const newSubject: Subject = {
      id: generateId('subj'),
      name: trimmed,
      code: subjectCode.trim() || undefined,
      color: subjectColor,
      createdAt: new Date().toISOString(),
    };

    const nextSubjects = [...subjects, newSubject];
    const nextUsed = new Set(nextSubjects.map((s) => s.color.toLowerCase()));
    const nextAvailableColor =
      SUBJECT_COLORS.find((c) => !nextUsed.has(c.hex.toLowerCase()))?.hex ??
      SUBJECT_COLORS[nextSubjects.length % SUBJECT_COLORS.length].hex;

    setSubjects(nextSubjects);
    setSubjectName('');
    setSubjectCode('');
    setSubjectColor(nextAvailableColor);
    setSubjectError('');
  };

  const handleRemoveSubject = (id: string) => {
    const remaining = subjects.filter((s) => s.id !== id);
    setSubjects(remaining);
    const remainingUsed = new Set(remaining.map((s) => s.color.toLowerCase()));
    if (remainingUsed.has(subjectColor.toLowerCase())) {
      const nextFree = SUBJECT_COLORS.find(
        (c) => !remainingUsed.has(c.hex.toLowerCase())
      );
      if (nextFree) setSubjectColor(nextFree.hex);
    }
  };

  const handleFinish = () => {
    onComplete({
      profile: {
        name: name.trim(),
        grade: grade.trim(),
      },
      theme,
      subjects,
    });
  };

  const numericStep = step === 'welcome' ? 0 : step;

  return (
    <div className="min-h-screen pt-safe pb-safe bg-[#F4F6FB] dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 flex flex-col justify-center px-4 py-6 sm:px-6 transition-colors duration-200">
      <div className="w-full max-w-xl mx-auto space-y-5">
        {/* Top Bar for Preview Exit or Step Indicator */}
        {(step !== 'welcome' || isPreview) && (
          <div className="flex items-center justify-between gap-4 px-1">
            {step !== 'welcome' ? (
              <div className="flex items-center gap-2.5">
                <img
                  src="/icon.svg"
                  alt="Study Flow emblem"
                  className="w-8 h-8 rounded-lg shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-50 block leading-none">
                    Study Flow
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block tabular-nums">
                    Step {numericStep} of 3
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Onboarding Preview
              </span>
            )}

            <div className="flex items-center gap-3">
              {step !== 'welcome' && (
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  {[1, 2, 3].map((idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 w-6 sm:w-7 rounded-full transition-colors ${
                        numericStep >= idx
                          ? 'bg-indigo-600'
                          : 'bg-slate-300 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              )}

              {isPreview && onExitPreview && (
                <button
                  type="button"
                  onClick={onExitPreview}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Exit Preview</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-3xl bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-8 shadow-sm">
          {/* WELCOME SCREEN */}
          {step === 'welcome' && (
            <div className="text-center space-y-6 py-2">
              <div className="mx-auto w-20 h-20 rounded-2xl bg-[#0B1120] border border-slate-800 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                <img
                  src="/icon.svg"
                  alt="Study Flow logo"
                  className="w-16 h-16 rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
                  Welcome to Study Flow
                </h1>
                <p className="text-base font-medium text-indigo-600 dark:text-indigo-400">
                  Your goals. Your schedule. Your success.
                </p>
              </div>

              <div className="text-left rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 divide-y divide-slate-200/80 dark:divide-slate-800/80">
                <div className="px-4 py-3 flex items-center gap-3">
                  <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    Organize subjects, homework, and revision priorities in one view.
                  </p>
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <CalendarClock className="w-4 h-4 text-indigo-500 shrink-0" />
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    Build your weekly study timetable and track exam countdowns.
                  </p>
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0" />
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    Works completely offline with private local device storage.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 1 — PERSONAL DETAILS */}
          {step === 1 && (
            <form onSubmit={handleContinueFromProfile} className="space-y-5" noValidate>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Personal Details
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Tell us who you are and choose your preferred study theme.
                </p>
              </div>

              {profileError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-600 dark:text-rose-300"
                >
                  {profileError}
                </div>
              )}

              <div>
                <label
                  htmlFor="onboarding-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Student Name
                </label>
                <input
                  id="onboarding-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (profileError) setProfileError('');
                  }}
                  placeholder="e.g., Alex Rivera"
                  maxLength={60}
                  autoFocus
                  className="w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="onboarding-grade"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Class or Grade
                </label>
                <input
                  id="onboarding-grade"
                  type="text"
                  value={grade}
                  onChange={(e) => {
                    setGrade(e.target.value);
                    if (profileError) setProfileError('');
                  }}
                  placeholder="e.g., Grade 11, Class 10-B, or Sophomore"
                  maxLength={40}
                  className="w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {GRADE_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setGrade(suggestion);
                        if (profileError) setProfileError('');
                      }}
                      className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        grade === suggestion
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Preferred Study Theme
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectTheme('dark')}
                    aria-pressed={theme === 'dark'}
                    className={`min-h-[52px] px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Moon className="w-4 h-4 shrink-0" />
                    <span>Dark Navy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTheme('light')}
                    aria-pressed={theme === 'light'}
                    className={`min-h-[52px] px-4 py-2.5 rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Sun className="w-4 h-4 shrink-0" />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('welcome')}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  className="flex-1 sm:flex-initial min-h-[46px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2 — SUBJECTS */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  Your Subjects
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {initialSubjects.length > 0
                    ? 'Keep your existing subjects or add new ones with a unique color.'
                    : 'Add your courses and pick a unique color for each subject.'}
                </p>
              </div>

              <form onSubmit={handleAddSubject} className="space-y-3.5" noValidate>
                {subjectError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-600 dark:text-rose-300"
                  >
                    {subjectError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label
                      htmlFor="onboarding-subject-name"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Subject Name
                    </label>
                    <input
                      id="onboarding-subject-name"
                      type="text"
                      value={subjectName}
                      onChange={(e) => {
                        setSubjectName(e.target.value);
                        if (subjectError) setSubjectError('');
                      }}
                      placeholder="e.g., Mathematics"
                      maxLength={60}
                      autoFocus
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label
                      htmlFor="onboarding-subject-code"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
                    >
                      Code (optional)
                    </label>
                    <input
                      id="onboarding-subject-code"
                      type="text"
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                      placeholder="e.g., MATH 101"
                      maxLength={20}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Unique Subject Color
                    </span>
                    {!allColorsUsed && (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {SUBJECT_COLORS.length - usedColors.size} unused left
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {SUBJECT_COLORS.map((option) => {
                      const isUsed = !allColorsUsed && usedColors.has(option.hex.toLowerCase());
                      const selected = subjectColor.toLowerCase() === option.hex.toLowerCase();
                      return (
                        <button
                          key={option.id}
                          type="button"
                          disabled={isUsed}
                          onClick={() => {
                            setSubjectColor(option.hex);
                            if (subjectError) setSubjectError('');
                          }}
                          aria-label={isUsed ? `${option.name} (already assigned)` : option.name}
                          aria-pressed={selected}
                          className={`min-h-[42px] min-w-[42px] rounded-xl flex items-center justify-center border transition-all ${
                            isUsed
                              ? 'opacity-30 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                              : selected
                              ? 'border-indigo-500 ring-2 ring-indigo-500/40 bg-slate-100 dark:bg-slate-800 cursor-pointer'
                              : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: option.hex }}
                          >
                            {selected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </span>
                        </button>
                      );
                    })}

                    <button
                      type="submit"
                      className="ml-auto min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Subject</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Added & Existing Subjects List */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                {subjects.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-4">
                    No subjects added yet. Add as many subjects as you need above, or continue and add them later.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
                    {subjects.map((subj) => {
                      const isExisting = existingSubjectIds.has(subj.id);
                      return (
                        <li
                          key={subj.id}
                          className="py-2.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: subj.color }}
                            />
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {subj.name}
                            </span>
                            {(subj.code || isExisting) && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                                {[subj.code, isExisting ? 'Saved' : null].filter(Boolean).join(' · ')}
                              </span>
                            )}
                          </div>
                          {!isExisting && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubject(subj.id)}
                              aria-label={`Remove ${subj.name}`}
                              className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 sm:flex-initial min-h-[46px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>
                    {subjects.length > 0 ? `Continue (${subjects.length})` : 'Skip & Continue'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — READY */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-2 pt-1">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-indigo-500" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 text-balance">
                  You&apos;re all set, {name.trim()}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your Study Flow workspace is ready on this device.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 divide-y divide-slate-200/80 dark:divide-slate-800/80">
                <div className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Student</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {name.trim()} · {grade.trim()}
                  </span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Theme</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {theme === 'dark' ? 'Dark Navy' : 'Light'}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-500 dark:text-slate-400">Subjects</span>
                    <span className="font-semibold font-mono-num text-slate-900 dark:text-slate-100">
                      {subjects.length}
                    </span>
                  </div>
                  {subjects.length > 0 && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-1">
                      {subjects.map((subj) => (
                        <span
                          key={subj.id}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: subj.color }}
                          />
                          <span>{subj.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <span>Start Studying</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
