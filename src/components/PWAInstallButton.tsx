import React, { useState } from 'react';
import { Download, Share, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ModalSheet } from './ModalSheet';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'card';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Installed as standalone app</span>
        </div>
      );
    }
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2 min-[360px]:px-2.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Install App</span>
        <span className="sm:hidden">Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-2 min-[360px]:px-2.5 sm:px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Share className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Install on iOS</span>
          <span className="sm:hidden">Install</span>
        </button>

        <ModalSheet
          isOpen={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Install Study Flow on iPhone or iPad"
        >
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>
              Add Study Flow to your home screen for full-screen focus and offline access:
            </p>
            <ol className="space-y-3 list-decimal list-inside text-slate-800 dark:text-slate-200">
              <li>
                Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
              </li>
              <li>
                Scroll down and select <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> in the upper right corner.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </ModalSheet>
      </>
    );
  }

  if (variant === 'card') {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Open in Chrome or Edge on Android or desktop and choose &ldquo;Install app&rdquo; from the browser menu to pin Study Flow to your device.
      </p>
    );
  }

  return null;
};
