import React from 'react';
import { PlusSquare, Share, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="animate-modal-in w-full max-w-sm rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo size={38} />
            <div>
              <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Install PERSONAL AI
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Add to your iPhone or iPad Home Screen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[36px] min-w-[36px] -mt-1 -mr-1 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            aria-label="Close install instructions"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ol className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <span className="leading-relaxed">
              Tap the <strong className="font-semibold text-zinc-950 dark:text-zinc-50 inline-flex items-center gap-1 align-middle"><Share className="w-3.5 h-3.5" /> Share</strong> button in Safari&apos;s toolbar.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <span className="leading-relaxed">
              Scroll down and tap <strong className="font-semibold text-zinc-950 dark:text-zinc-50 inline-flex items-center gap-1 align-middle"><PlusSquare className="w-3.5 h-3.5" /> Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <span className="leading-relaxed">
              Tap <strong className="font-semibold text-zinc-950 dark:text-zinc-50">Add</strong> to launch PERSONAL AI as a standalone app.
            </span>
          </li>
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[42px] rounded-xl bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Done
        </button>
      </div>
    </div>
  );
};
