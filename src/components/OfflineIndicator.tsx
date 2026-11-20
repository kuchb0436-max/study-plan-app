import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useI18n } from '../i18n';

interface OfflineIndicatorProps {
  inline?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ inline = false }) => {
  const isOnline = useOnlineStatus();
  const { t } = useI18n();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${
        inline
          ? 'inline-flex max-w-full'
          : 'fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] start-4 end-4 sm:end-auto z-50 inline-flex'
      } items-center gap-2 rounded-xl bg-amber-600 dark:bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg`}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{t('offlineBanner')}</span>
    </div>
  );
};
