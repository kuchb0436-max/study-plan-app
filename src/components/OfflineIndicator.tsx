import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  inline?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ inline = false }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`${
        inline
          ? 'inline-flex max-w-full'
          : 'fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 right-4 sm:right-auto z-50 inline-flex'
      } items-center gap-2 rounded-xl bg-amber-600 dark:bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg`}
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">Offline mode · Local data active</span>
    </div>
  );
};
