import React, { useState } from 'react';
import { CheckCircle2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallGuideModal } from './PWAInstallGuideModal';

interface PWAInstallButtonProps {
  variant?: 'menu' | 'card';
  onActionComplete?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'card',
  onActionComplete,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      onActionComplete?.();
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  if (variant === 'menu') {
    if (isInstalled || (!isInstallable && !isIOS)) {
      return null;
    }

    return (
      <>
        <button
          type="button"
          onClick={() => void handleInstallClick()}
          className="w-full min-h-[42px] px-3 py-2 text-left text-sm rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors"
        >
          <Smartphone className="w-4 h-4 text-zinc-500" />
          <span>{isIOS ? 'Install on iPhone / iPad' : 'Install PERSONAL AI'}</span>
        </button>

        <PWAInstallGuideModal
          isOpen={showIOSGuide}
          onClose={() => {
            setShowIOSGuide(false);
            onActionComplete?.();
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
            Install as App
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
            {isInstalled
              ? 'PERSONAL AI is installed and running in standalone app mode.'
              : isIOS
              ? 'Add PERSONAL AI to your iPhone or iPad Home Screen via Safari.'
              : isInstallable
              ? 'Install PERSONAL AI on your device for a native full-screen experience.'
              : 'Install via your browser’s Share or Add to Home Screen menu when supported.'}
          </p>
        </div>

        {isInstalled ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            <span>Installed</span>
          </span>
        ) : isInstallable || isIOS ? (
          <button
            type="button"
            onClick={() => void handleInstallClick()}
            className="min-h-[38px] px-3.5 py-2 rounded-xl bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 text-xs font-medium flex items-center gap-1.5 hover:opacity-90 active:scale-[0.97] transition-all shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{isIOS ? 'How to Install' : 'Install App'}</span>
          </button>
        ) : null}
      </div>

      <PWAInstallGuideModal
        isOpen={showIOSGuide}
        onClose={() => setShowIOSGuide(false)}
      />
    </>
  );
};
