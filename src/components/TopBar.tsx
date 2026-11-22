import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  BrainCircuit,
  Check,
  ChevronDown,
  Download,
  Eraser,
  Globe,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { AssistantModeId, AssistantModeInfo, Conversation } from '../types';

interface TopBarProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  modes: AssistantModeInfo[];
  selectedModeId: AssistantModeId;
  onSelectMode: (modeId: AssistantModeId) => void;
  enableSearch: boolean;
  onToggleSearch: () => void;
  activeConversation: Conversation | null;
  onRenameConversation: (id: string, title: string) => void;
  onArchiveConversation: (id: string, archived: boolean) => void;
  onClearConversation: (id: string) => void;
  onShareConversation: (conv: Conversation) => Promise<'shared' | 'copied' | 'failed'>;
  onExportConversation: (conv: Conversation) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
}

function getModeIcon(modeId: AssistantModeId) {
  switch (modeId) {
    case 'fast':
      return <Zap className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
    case 'balanced':
      return <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
    case 'deep':
      return <BrainCircuit className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
    case 'auto':
    default:
      return <Sparkles className="w-3.5 h-3.5 text-zinc-500 shrink-0" />;
  }
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  onNewChat,
  modes,
  selectedModeId,
  onSelectMode,
  enableSearch,
  onToggleSearch,
  activeConversation,
  onRenameConversation,
  onArchiveConversation,
  onClearConversation,
  onShareConversation,
  onExportConversation,
  onDeleteConversation,
  onOpenSettings,
}) => {
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [convMenuOpen, setConvMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmAction, setConfirmAction] = useState<'clear' | 'delete' | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const modeMenuRef = useRef<HTMLDivElement>(null);
  const convMenuRef = useRef<HTMLDivElement>(null);

  const selectedMode = modes.find((m) => m.id === selectedModeId) || modes[0];

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (modeMenuRef.current && !modeMenuRef.current.contains(e.target as Node)) {
        setModeMenuOpen(false);
      }
      if (convMenuRef.current && !convMenuRef.current.contains(e.target as Node)) {
        setConvMenuOpen(false);
        setIsRenaming(false);
        setConfirmAction(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleStartRename = () => {
    if (!activeConversation) return;
    setRenameValue(activeConversation.title);
    setConfirmAction(null);
    setIsRenaming(true);
  };

  const handleCommitRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeConversation && renameValue.trim()) {
      onRenameConversation(activeConversation.id, renameValue.trim());
    }
    setIsRenaming(false);
    setConvMenuOpen(false);
  };

  const handleShareClick = async () => {
    if (!activeConversation) return;
    const outcome = await onShareConversation(activeConversation);
    if (outcome === 'copied') {
      setShareCopied(true);
      setTimeout(() => {
        setShareCopied(false);
        setConvMenuOpen(false);
      }, 1000);
    } else if (outcome === 'shared') {
      setConvMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 h-14 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md pt-safe">
      {/* Zone 1: Drawer toggle & PERSONAL AI Brand */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="min-h-[44px] min-w-[44px] -ml-1.5 flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 transition-colors active:scale-[0.97]"
          aria-label="Toggle navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-2.5 py-1.5 pr-1 sm:pr-2 rounded-xl hover:opacity-85 transition-opacity shrink-0 active:scale-[0.97]"
          aria-label="PERSONAL AI Home"
        >
          <BrandLogo size={26} />
          <span className="font-display font-semibold text-sm tracking-tight text-zinc-950 dark:text-zinc-50 whitespace-nowrap">
            PERSONAL AI
          </span>
        </button>
      </div>

      {/* Zone 2: PERSONAL AI Experience Mode Selector */}
      <div className="relative" ref={modeMenuRef}>
        <button
          type="button"
          onClick={() => setModeMenuOpen((v) => !v)}
          className="min-h-[40px] px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs sm:text-[13px] font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 active:scale-[0.97]"
          aria-expanded={modeMenuOpen}
          aria-label="Select PERSONAL AI mode"
        >
          <span className="hidden sm:inline-flex">{getModeIcon(selectedMode?.id ?? 'auto')}</span>
          <span className="truncate">{selectedMode?.name ?? 'Auto'}</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
        </button>

        {modeMenuOpen && (
          <div className="animate-panel-pop absolute left-1/2 -translate-x-1/2 mt-2 w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-2 z-50">
            <div className="px-2.5 py-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              Assistant Mode
            </div>
            <div className="space-y-1">
              {modes.map((m) => {
                const isSelected = m.id === selectedModeId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!m.available}
                    onClick={() => {
                      if (!m.available) return;
                      onSelectMode(m.id);
                      setModeMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start justify-between gap-2.5 ${
                      !m.available
                        ? 'opacity-50 cursor-not-allowed text-zinc-500 dark:text-zinc-500'
                        : isSelected
                        ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="mt-0.5">{getModeIcon(m.id)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium flex items-center justify-between gap-2">
                        <span className="truncate">{m.name}</span>
                        {!m.available ? (
                          <span className="text-[11px] font-normal text-zinc-400 shrink-0">
                            Unavailable
                          </span>
                        ) : (
                          <span className="text-[11px] font-normal text-zinc-400 shrink-0">
                            {m.tagline}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        {!m.available && m.unavailableReason ? m.unavailableReason : m.description}
                      </p>
                    </div>
                    {isSelected && m.available && (
                      <Check className="w-4 h-4 text-zinc-950 dark:text-zinc-50 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
              <button
                type="button"
                onClick={onToggleSearch}
                className="w-full px-3 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 flex items-center justify-between text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Web Search</span>
                </span>
                <span
                  className={`text-xs font-medium ${
                    enableSearch ? 'text-zinc-950 dark:text-zinc-50' : 'text-zinc-400'
                  }`}
                >
                  {enableSearch ? 'On' : 'Off'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zone 3: New Chat & Three-Dot Conversation Menu */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <button
          type="button"
          onClick={onNewChat}
          className="min-h-[44px] min-w-[44px] sm:min-w-0 sm:px-3 flex items-center justify-center gap-1.5 rounded-xl text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 transition-colors text-xs font-medium whitespace-nowrap active:scale-[0.97]"
          aria-label="New conversation"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden md:inline">New Chat</span>
        </button>

        <div className="relative" ref={convMenuRef}>
          <button
            type="button"
            onClick={() => {
              setConvMenuOpen((v) => !v);
              setConfirmAction(null);
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 transition-colors active:scale-[0.97]"
            aria-label="Conversation menu"
            aria-expanded={convMenuOpen}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {convMenuOpen && (
            <div className="animate-panel-pop absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-1.5 z-50">
              {activeConversation ? (
                <>
                  {isRenaming ? (
                    <form onSubmit={handleCommitRename} className="p-1.5 space-y-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsRenaming(false)}
                          className="px-2.5 py-1 text-xs rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                        >
                          Save
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartRename}
                      className="w-full min-h-[42px] px-3 py-2 text-left text-sm rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-zinc-500" />
                      <span>Rename conversation</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onArchiveConversation(activeConversation.id, !activeConversation.archived);
                      setConvMenuOpen(false);
                    }}
                    className="w-full min-h-[42px] px-3 py-2 text-left text-sm rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors"
                  >
                    {activeConversation.archived ? (
                      <>
                        <ArchiveRestore className="w-4 h-4 text-zinc-500" />
                        <span>Unarchive conversation</span>
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4 text-zinc-500" />
                        <span>Archive conversation</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleShareClick()}
                    className="w-full min-h-[42px] px-3 py-2 text-left text-sm rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors"
                  >
                    {shareCopied ? (
                      <>
                        <Check className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
                        <span>Copied summary</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-zinc-500" />
                        <span>Share summary</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onExportConversation(activeConversation);
                      setConvMenuOpen(false);
                    }}
                    className="w-full min-h-[42px] px-3 py-2 text-left text-sm rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors"
                  >
                    <Download className="w-4 h-4 text-zinc-500" />
                    <span>Export conversation</span>
                  </button>

                  {confirmAction === 'clear' ? (
                    <div className="p-2 my-1 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <p className="text-xs text-zinc-600 dark:text-zinc-300">
                        Clear all messages in this chat?
                      </p>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmAction(null)}
                          className="px-2.5 py-1 text-xs rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onClearConversation(activeConversation.id);
                            setConfirmAction(null);
                            setConvMenuOpen(false);
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmAction('clear')}
                      className="w-full min-h-[42px] px-3 py-2 text-left text-sm rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors"
                    >
                      <Eraser className="w-4 h-4 text-zinc-500" />
                      <span>Clear conversation</span>
                    </button>
                  )}

                  {confirmAction === 'delete' ? (
                    <div className="p-2 my-1 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/70 space-y-2">
                      <p className="text-xs text-red-700 dark:text-red-300">
                        Delete this conversation permanently?
                      </p>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setConfirmAction(null)}
                          className="px-2.5 py-1 text-xs rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteConversation(activeConversation.id);
                            setConfirmAction(null);
                            setConvMenuOpen(false);
                          }}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-600 text-white"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmAction('delete')}
                      className="w-full min-h-[42px] px-3 py-2 text-left text-sm rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center gap-2.5 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete conversation</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-zinc-200/80 dark:border-zinc-800" />
                </>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setConvMenuOpen(false);
                  onOpenSettings();
                }}
                className="w-full min-h-[42px] px-3 py-2 text-left text-sm rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 transition-colors"
              >
                <Settings className="w-4 h-4 text-zinc-500" />
                <span>Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
