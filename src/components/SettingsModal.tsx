import React, { useState } from 'react';
import {
  Brain,
  Download,
  Globe,
  Info,
  Monitor,
  Moon,
  Palette,
  Shield,
  SlidersHorizontal,
  Sun,
  Trash2,
  User,
  Volume2,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { AssistantModeId, AssistantModeInfo, ThemeMode, UserSettings } from '../types';

type SettingsSection =
  | 'profile'
  | 'appearance'
  | 'language'
  | 'voice'
  | 'memory'
  | 'mode'
  | 'privacy'
  | 'about';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (updates: Partial<UserSettings>) => void;
  modes: AssistantModeInfo[];
  onExportAll: () => void;
  onClearHistory: () => void;
  apiConfigured: boolean | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  modes,
  onExportAll,
  onClearHistory,
  apiConfigured,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  const navItems: Array<{ id: SettingsSection; label: string; icon: React.ReactNode }> = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance & Theme', icon: <Palette className="w-4 h-4" /> },
    { id: 'language', label: 'Language', icon: <Globe className="w-4 h-4" /> },
    { id: 'voice', label: 'Voice Settings', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'memory', label: 'Memory Settings', icon: <Brain className="w-4 h-4" /> },
    { id: 'mode', label: 'Assistant Mode', icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'privacy', label: 'Privacy & Data', icon: <Shield className="w-4 h-4" /> },
    { id: 'about', label: 'About PERSONAL AI', icon: <Info className="w-4 h-4" /> },
  ];

  const themeOptions: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
  ];

  const voices: Array<{ id: UserSettings['voiceName']; desc: string }> = [
    { id: 'Kore', desc: 'Clear, balanced, natural studio tone' },
    { id: 'Puck', desc: 'Bright, energetic conversational delivery' },
    { id: 'Charon', desc: 'Deep, calm, authoritative voice' },
    { id: 'Fenrir', desc: 'Warm, grounded narrative register' },
    { id: 'Zephyr', desc: 'Light, crisp, effortless clarity' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="animate-modal-in w-full h-full sm:h-[620px] sm:max-w-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 pt-safe border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:hover:text-zinc-50 dark:hover:bg-zinc-900 active:scale-[0.95]"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col sm:flex-row min-h-0">
          {/* Section Nav */}
          <nav className="sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-zinc-800 p-2 sm:p-3 flex sm:flex-col gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`min-h-[40px] px-3 py-2 rounded-xl text-left text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-all active:scale-[0.97] whitespace-nowrap shrink-0 ${
                  activeSection === item.id
                    ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Section Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {activeSection === 'profile' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    Profile
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Personalize how PERSONAL AI addresses you and tailors responses.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={settings.userName}
                      onChange={(e) => onUpdateSettings({ userName: e.target.value })}
                      placeholder="Your name"
                      className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Role or Focus
                    </label>
                    <input
                      type="text"
                      value={settings.userRole}
                      onChange={(e) => onUpdateSettings({ userRole: e.target.value })}
                      placeholder="e.g., Software Architect, Researcher, Founder"
                      className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Global Custom Instructions
                    </label>
                    <textarea
                      rows={4}
                      value={settings.customInstruction}
                      onChange={(e) => onUpdateSettings({ customInstruction: e.target.value })}
                      placeholder="Specify tone, formatting preferences, or recurring guidance for every conversation..."
                      className="w-full px-3.5 py-2.5 text-base sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    Appearance &amp; Theme
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Choose a crisp monochrome light canvas, deep dark obsidian mode, or match your system.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {themeOptions.map((opt) => {
                    const active = settings.theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onUpdateSettings({ theme: opt.value })}
                        className={`p-4 rounded-2xl border flex flex-col items-center gap-2 text-xs font-medium transition-all active:scale-[0.97] ${
                          active
                            ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        {opt.icon}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection === 'language' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    Language
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Preferred response language when not specified in the conversation.
                  </p>
                </div>

                <select
                  value={settings.language}
                  onChange={(e) => onUpdateSettings({ language: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 text-base sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 focus:outline-none"
                >
                  {[
                    'English',
                    'Spanish',
                    'French',
                    'German',
                    'Arabic',
                    'Japanese',
                    'Chinese (Simplified)',
                    'Portuguese',
                    'Hindi',
                  ].map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeSection === 'voice' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    Voice Settings
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Natural speech playback and high-accuracy microphone voice transcription.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Read-Aloud Voice Persona
                  </div>
                  {voices.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onUpdateSettings({ voiceName: v.id })}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                        settings.voiceName === v.id
                          ? 'border-zinc-950 dark:border-zinc-50 bg-zinc-50 dark:bg-zinc-900'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {v.id}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{v.desc}</div>
                      </div>
                      <span className="text-xs font-medium text-zinc-500">
                        {settings.voiceName === v.id ? 'Selected' : 'Select'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'memory' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    Memory Settings
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Control whether saved local memories are shared as conversation context.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                    <div className="pr-4">
                      <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                        Use Saved Memories
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Include active browser-local memories in conversation prompts.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.memoryEnabled}
                      onChange={(e) => onUpdateSettings({ memoryEnabled: e.target.checked })}
                      className="w-4 h-4 accent-zinc-950 dark:accent-zinc-50"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                    <div className="pr-4">
                      <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                        Allow Memory Proposals
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Let the AI ask permission before saving preferences you share.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.allowMemorySuggestions}
                      onChange={(e) =>
                        onUpdateSettings({ allowMemorySuggestions: e.target.checked })
                      }
                      className="w-4 h-4 accent-zinc-950 dark:accent-zinc-50"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'mode' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    PERSONAL AI Mode &amp; Agent Defaults
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Choose your default intelligence mode and agent capabilities for new conversations.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Default Experience Mode
                    </div>
                    {modes.map((m) => {
                      const active = settings.defaultMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={!m.available}
                          onClick={() =>
                            onUpdateSettings({ defaultMode: m.id as AssistantModeId })
                          }
                          className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                            !m.available
                              ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800'
                              : active
                              ? 'border-zinc-950 dark:border-zinc-50 bg-zinc-50 dark:bg-zinc-900'
                              : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 active:scale-[0.98]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                              <span>{m.name}</span>
                              <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                                {!m.available ? 'Unavailable' : m.tagline}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {!m.available && m.unavailableReason
                                ? m.unavailableReason
                                : m.description}
                            </p>
                          </div>
                          <span className="text-xs font-medium text-zinc-500 shrink-0">
                            {active ? 'Selected' : m.available ? 'Select' : 'Unavailable'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <label className="flex items-center justify-between p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 cursor-pointer">
                    <div className="pr-4">
                      <div className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                        Enable Agent Planning &amp; Tools
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Allows task breakdown, exact math evaluation, memory lookup, and date tools.
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enableAgentTools}
                      onChange={(e) => onUpdateSettings({ enableAgentTools: e.target.checked })}
                      className="w-4 h-4 accent-zinc-950 dark:accent-zinc-50"
                    />
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                    Privacy &amp; Local Storage
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Your conversations, projects, and memories are stored privately on this device in browser local storage. Nothing is synchronized to an external cloud database.
                  </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-1 text-xs">
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    Private Server Boundary
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    AI requests are processed securely through the private backend runtime. Status:{' '}
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {apiConfigured === null
                        ? 'Checking...'
                        : apiConfigured
                        ? 'Connected and ready'
                        : 'Credentials missing (configure in AI Studio Settings > Secrets)'}
                    </span>
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={onExportAll}
                    className="w-full min-h-[44px] px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export All Local Data (JSON)</span>
                  </button>

                  {!confirmClear ? (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="w-full min-h-[44px] px-4 rounded-xl border border-red-200 dark:border-red-900/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear All Conversation History &amp; Data</span>
                    </button>
                  ) : (
                    <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/30 space-y-3">
                      <p className="text-xs text-red-800 dark:text-red-200">
                        This permanently deletes all local conversations, projects, and saved memories in this browser.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClearHistory();
                            setConfirmClear(false);
                            onClose();
                          }}
                          className="px-3.5 py-2 rounded-xl bg-red-600 text-white text-xs font-medium active:scale-[0.97]"
                        >
                          Yes, Clear Everything
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClear(false)}
                          className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'about' && (
              <div className="space-y-5">
                <div className="flex items-center gap-3.5">
                  <BrandLogo size={44} />
                  <div>
                    <h3 className="font-display text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                      PERSONAL AI
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Intelligent Multimodal Personal Assistant &amp; Agent
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <p>
                    PERSONAL AI combines focused conversational clarity with structured agent planning, multimodal document and image understanding, voice transcription, read-aloud speech, and private browser-local memory.
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    All chats, projects, and memories remain stored privately on this device.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
