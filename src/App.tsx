import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  Code2,
  Compass,
  FileSearch,
  FolderKanban,
  ListTodo,
} from 'lucide-react';
import { BrandLogo } from './components/BrandLogo';
import { ChatMessage } from './components/ChatMessage';
import { Composer } from './components/Composer';
import { LibraryView } from './components/LibraryView';
import { MemoriesView } from './components/MemoriesView';
import { ProjectsView } from './components/ProjectsView';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import {
  clearAllLocalData,
  DEFAULT_SETTINGS,
  exportAllLocalData,
  loadActiveConversationId,
  loadConversations,
  loadMemories,
  loadProjects,
  loadSettings,
  saveActiveConversationId,
  saveConversations,
  saveMemories,
  saveProjects,
  saveSettings,
} from './utils/storage';
import type {
  AssistantModeId,
  AssistantModeInfo,
  Attachment,
  ChatMessage as ChatMessageType,
  Conversation,
  MemoryItem,
  Project,
  SidebarTab,
  UserSettings,
} from './types';

const FALLBACK_MODES: AssistantModeInfo[] = [
  {
    id: 'auto',
    name: 'Auto',
    tagline: 'Adaptive speed & quality',
    description: 'Automatically selects the optimal engine for fast, reliable responses.',
    available: true,
    supportsSearch: true,
    supportsTools: true,
    supportsVision: true,
    supportsPdf: true,
    isDefault: true,
  },
  {
    id: 'fast',
    name: 'Fast',
    tagline: 'Lowest latency',
    description: 'Prioritizes instant first-token speed for quick answers and drafting.',
    available: true,
    supportsSearch: true,
    supportsTools: true,
    supportsVision: true,
    supportsPdf: true,
  },
  {
    id: 'balanced',
    name: 'Balanced',
    tagline: 'Depth & fluency',
    description: 'Balances thorough multi-step synthesis with responsive streaming.',
    available: true,
    supportsSearch: true,
    supportsTools: true,
    supportsVision: true,
    supportsPdf: true,
  },
  {
    id: 'deep',
    name: 'Deep Think',
    tagline: 'Complex reasoning',
    description: 'Allocates deeper reasoning for architecture, math, and root-cause analysis.',
    available: true,
    supportsSearch: true,
    supportsTools: true,
    supportsVision: true,
    supportsPdf: true,
  },
];

function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const prefix =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name?.trim() ? `${prefix}, ${name.trim()}` : 'How can I help today?';
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [memories, setMemories] = useState<MemoryItem[]>(() => loadMemories());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() =>
    loadActiveConversationId()
  );
  const [draftProjectId, setDraftProjectId] = useState<string | undefined>(undefined);

  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [activeTab, setActiveTab] = useState<SidebarTab>('chats');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [modes, setModes] = useState<AssistantModeInfo[]>(FALLBACK_MODES);
  const [selectedModeId, setSelectedModeId] = useState<AssistantModeId>(settings.defaultMode);
  const [enableSearch, setEnableSearch] = useState<boolean>(settings.enableSearchByDefault);
  const [enableAgentTools, setEnableAgentTools] = useState<boolean>(settings.enableAgentTools);
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingConvId, setStreamingConvId] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Audio playback for Read Aloud
  const [ttsMessageId, setTtsMessageId] = useState<string | null>(null);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);

  // Refs for stable memoized message callbacks
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const activeConvIdRef = useRef(activeConversationId);
  activeConvIdRef.current = activeConversationId;

  // Sync theme to <html> element
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark =
        settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
      root.classList.toggle('dark', shouldBeDark);
    };
    applyTheme();

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', applyTheme);
    return () => mq.removeEventListener('change', applyTheme);
  }, [settings.theme]);

  // Persist local state
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    saveProjects(projects);
  }, [projects]);

  useEffect(() => {
    saveMemories(memories);
  }, [memories]);

  useEffect(() => {
    saveActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  // Cleanup active speech synthesis or audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Check backend health & mode availability
  useEffect(() => {
    let cancelled = false;
    async function initBackend() {
      try {
        const [healthRes, modesRes] = await Promise.all([
          fetch('/api/health'),
          fetch('/api/modes'),
        ]);
        if (cancelled) return;
        if (healthRes.ok) {
          const health = await healthRes.json();
          setApiConfigured(Boolean(health.configured));
        }
        if (modesRes.ok) {
          const data = await modesRes.json();
          if (Array.isArray(data.modes) && data.modes.length > 0) {
            setModes(data.modes);
            setSelectedModeId((prev) => {
              const found = data.modes.find((m: AssistantModeInfo) => m.id === prev);
              if (found && found.available) return prev;
              const firstAvailable = data.modes.find((m: AssistantModeInfo) => m.available);
              return firstAvailable ? firstAvailable.id : prev;
            });
          }
        }
      } catch {
        if (!cancelled) setApiConfigured(false);
      }
    }
    void initBackend();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  // Sync mode selector when switching conversations
  useEffect(() => {
    if (activeConversation?.modeId) {
      setSelectedModeId(activeConversation.modeId);
    }
  }, [activeConversation?.id, activeConversation?.modeId]);

  const activeProject = useMemo(() => {
    const pid = activeConversation?.projectId ?? draftProjectId;
    return pid ? projects.find((p) => p.id === pid) ?? null : null;
  }, [activeConversation, draftProjectId, projects]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
    isUserScrolledUpRef.current = false;
    setShowScrollToBottom(false);
  }, []);

  const handleChatScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distanceFromBottom > 90;
    isUserScrolledUpRef.current = scrolledUp;
    setShowScrollToBottom(scrolledUp);
  }, []);

  useEffect(() => {
    isUserScrolledUpRef.current = false;
    setShowScrollToBottom(false);
    if (activeConversation?.messages.length) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [activeConversationId, scrollToBottom]);

  const handleNewChat = useCallback(
    (projectId?: string) => {
      if (isStreamingRef.current) {
        abortControllerRef.current?.abort();
      }
      setActiveConversationId(null);
      setDraftProjectId(projectId);
      setActiveTab('chats');
      setSelectedModeId(settings.defaultMode);
      isUserScrolledUpRef.current = false;
      setShowScrollToBottom(false);
    },
    [settings.defaultMode]
  );

  const updateConversationMessages = useCallback(
    (convId: string, updater: (msgs: ChatMessageType[]) => ChatMessageType[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? { ...c, messages: updater(c.messages), updatedAt: Date.now() }
            : c
        )
      );
    },
    []
  );

  const generateAutoTitle = useCallback(async (convId: string, firstPrompt: string) => {
    try {
      const resp = await fetch('/api/generate-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: firstPrompt }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.title && typeof data.title === 'string') {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title: data.title } : c))
        );
      }
    } catch {
      // Non-blocking
    }
  }, []);

  const streamAssistantReply = useCallback(
    async (
      convId: string,
      historyForApi: ChatMessageType[],
      modeToUse: AssistantModeId,
      projectId?: string
    ) => {
      if (isStreamingRef.current) return;
      isStreamingRef.current = true;

      const assistantMsgId = createId('msg');
      const placeholderAssistant: ChatMessageType = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
        modeUsed: modeToUse,
      };

      updateConversationMessages(convId, (msgs) => [...msgs, placeholderAssistant]);
      setIsStreaming(true);
      setStreamingConvId(convId);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Safety connection timeout (90s) in case upstream stalls silently
      const timeoutId = window.setTimeout(() => {
        controller.abort(new DOMException('Request timed out', 'TimeoutError'));
      }, 90_000);

      const projectObj = projectId ? projects.find((p) => p.id === projectId) : undefined;

      isUserScrolledUpRef.current = false;
      requestAnimationFrame(() => scrollToBottom(true));

      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            mode: modeToUse,
            enableSearch,
            enableAgentTools,
            memories: settings.memoryEnabled ? memories.filter((m) => m.enabled) : [],
            projectInstructions: projectObj?.instructions,
            customInstruction: settings.customInstruction,
            userName: settings.userName,
            language: settings.language,
            allowMemorySuggestions: settings.allowMemorySuggestions,
            messages: historyForApi.map((m) => ({
              role: m.role,
              content: m.content,
              attachments: m.attachments?.map((a) => ({
                id: a.id,
                name: a.name,
                mimeType: a.mimeType,
                size: a.size,
                kind: a.kind,
                dataBase64: a.dataBase64,
                textContent: a.textContent,
              })),
            })),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Request failed (${response.status})`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Streaming response unavailable.');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() ?? '';

          let appendedText = '';
          let appendedThought = '';

          for (const block of blocks) {
            const trimmed = block.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.replace(/^data:\s*/, '');
            if (!jsonStr) continue;

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            if (event.type === 'text' && typeof event.text === 'string') {
              appendedText += event.text;
            } else if (event.type === 'thought' && typeof event.text === 'string') {
              appendedThought += event.text;
            } else if (event.type === 'tool_call') {
              updateConversationMessages(convId, (msgs) =>
                msgs.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        toolCalls: [
                          ...(m.toolCalls ?? []),
                          {
                            id: String(event.id),
                            name: String(event.name),
                            args: (event.args as Record<string, unknown>) ?? {},
                            status: 'running',
                          },
                        ],
                      }
                    : m
                )
              );
            } else if (event.type === 'tool_result') {
              updateConversationMessages(convId, (msgs) =>
                msgs.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        toolCalls: (m.toolCalls ?? []).map((tc) =>
                          tc.id === String(event.id)
                            ? {
                                ...tc,
                                result: (event.result as Record<string, unknown>) ?? {},
                                status: 'completed',
                              }
                            : tc
                        ),
                      }
                    : m
                )
              );
            } else if (event.type === 'task_plan') {
              updateConversationMessages(convId, (msgs) =>
                msgs.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        taskPlans: [
                          ...(m.taskPlans ?? []),
                          {
                            id: String(event.id),
                            goal: String(event.goal ?? 'Task Plan'),
                            steps: Array.isArray(event.steps)
                              ? event.steps.map((s: Record<string, unknown>) => ({
                                  title: String(s.title ?? ''),
                                  detail: String(s.detail ?? ''),
                                  priority: String(s.priority ?? 'medium'),
                                  completed: false,
                                }))
                              : [],
                          },
                        ],
                      }
                    : m
                )
              );
            } else if (event.type === 'permission_request') {
              updateConversationMessages(convId, (msgs) =>
                msgs.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        permissionRequests: [
                          ...(m.permissionRequests ?? []),
                          {
                            id: String(event.id),
                            action: 'save_memory',
                            fact: String(event.fact ?? ''),
                            category: String(event.category ?? 'preference'),
                            reason: String(event.reason ?? ''),
                            decision: 'pending',
                          },
                        ],
                      }
                    : m
                )
              );
            } else if (event.type === 'grounding' && Array.isArray(event.sources)) {
              const incoming = event.sources as Array<{ title: string; uri: string }>;
              updateConversationMessages(convId, (msgs) =>
                msgs.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        groundingSources: [...(m.groundingSources ?? []), ...incoming],
                      }
                    : m
                )
              );
            } else if (event.type === 'error') {
              updateConversationMessages(convId, (msgs) =>
                msgs.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        isError: true,
                        errorCode: typeof event.code === 'string' ? event.code : 'ERROR',
                        content: String(event.message ?? 'An error occurred.'),
                      }
                    : m
                )
              );
            }
          }

          // Batch all text/thought tokens arrived in one network chunk into a single state update
          if (appendedText || appendedThought) {
            updateConversationMessages(convId, (msgs) =>
              msgs.map((m) =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: appendedText ? m.content + appendedText : m.content,
                      thoughtSummary: appendedThought
                        ? (m.thoughtSummary ?? '') + appendedThought
                        : m.thoughtSummary,
                    }
                  : m
              )
            );
            if (!isUserScrolledUpRef.current) {
              requestAnimationFrame(() => {
                const el = scrollContainerRef.current;
                if (el && !isUserScrolledUpRef.current) {
                  el.scrollTop = el.scrollHeight;
                }
              });
            }
          }
        }
      } catch (err) {
        const errorName = (err as Error)?.name;
        if (errorName === 'AbortError') {
          updateConversationMessages(convId, (msgs) =>
            msgs.map((m) =>
              m.id === assistantMsgId && !m.content.trim()
                ? { ...m, content: '*Generation stopped.*' }
                : m
            )
          );
        } else if (errorName === 'TimeoutError') {
          updateConversationMessages(convId, (msgs) =>
            msgs.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    isError: true,
                    content:
                      'The response timed out before completing. Retry or switch to Fast mode.',
                  }
                : m
            )
          );
        } else {
          updateConversationMessages(convId, (msgs) =>
            msgs.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    isError: true,
                    content:
                      err instanceof Error
                        ? err.message
                        : 'Network error while generating response. Please retry.',
                  }
                : m
            )
          );
        }
      } finally {
        window.clearTimeout(timeoutId);
        isStreamingRef.current = false;
        setIsStreaming(false);
        setStreamingConvId(null);
        abortControllerRef.current = null;
      }
    },
    [
      enableSearch,
      enableAgentTools,
      settings.memoryEnabled,
      settings.customInstruction,
      settings.userName,
      settings.language,
      settings.allowMemorySuggestions,
      memories,
      projects,
      updateConversationMessages,
      scrollToBottom,
    ]
  );

  const handleSendMessage = useCallback(
    async (text: string, attachments: Attachment[]) => {
      if (isStreamingRef.current) return;
      const trimmed = text.trim();
      if (!trimmed && attachments.length === 0) return;

      const userMessage: ChatMessageType = {
        id: createId('msg'),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const currentConv = conversationsRef.current.find((c) => c.id === activeConvIdRef.current);

      if (!currentConv) {
        const newId = createId('conv');
        const fallbackTitle =
          trimmed.slice(0, 42) || attachments[0]?.name || 'New Conversation';
        const newConv: Conversation = {
          id: newId,
          title: fallbackTitle,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          projectId: draftProjectId,
          messages: [userMessage],
          modeId: selectedModeId,
        };
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newId);
        setDraftProjectId(undefined);
        setActiveTab('chats');

        if (trimmed) {
          void generateAutoTitle(newId, trimmed);
        }
        await streamAssistantReply(newId, [userMessage], selectedModeId, newConv.projectId);
      } else {
        const updatedMessages = [...currentConv.messages, userMessage];
        updateConversationMessages(currentConv.id, () => updatedMessages);
        await streamAssistantReply(
          currentConv.id,
          updatedMessages,
          selectedModeId,
          currentConv.projectId
        );
      }
    },
    [
      draftProjectId,
      selectedModeId,
      generateAutoTitle,
      streamAssistantReply,
      updateConversationMessages,
    ]
  );

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const handleCopyMessage = useCallback((t: string) => {
    void navigator.clipboard?.writeText(t);
  }, []);

  const handleRegenerate = useCallback(
    async (assistantMessageId: string) => {
      if (isStreamingRef.current) return;
      const currentConv = conversationsRef.current.find((c) => c.id === activeConvIdRef.current);
      if (!currentConv) return;
      const idx = currentConv.messages.findIndex((m) => m.id === assistantMessageId);
      if (idx <= 0) return;
      const truncated = currentConv.messages.slice(0, idx);
      updateConversationMessages(currentConv.id, () => truncated);
      await streamAssistantReply(
        currentConv.id,
        truncated,
        selectedModeId,
        currentConv.projectId
      );
    },
    [selectedModeId, updateConversationMessages, streamAssistantReply]
  );

  const handleEditResend = useCallback(
    async (messageId: string, newContent: string) => {
      if (isStreamingRef.current) return;
      const currentConv = conversationsRef.current.find((c) => c.id === activeConvIdRef.current);
      if (!currentConv) return;
      const idx = currentConv.messages.findIndex((m) => m.id === messageId);
      if (idx < 0) return;

      const updatedUserMsg: ChatMessageType = {
        ...currentConv.messages[idx],
        content: newContent,
        createdAt: Date.now(),
      };
      const truncated = [...currentConv.messages.slice(0, idx), updatedUserMsg];
      updateConversationMessages(currentConv.id, () => truncated);
      await streamAssistantReply(
        currentConv.id,
        truncated,
        selectedModeId,
        currentConv.projectId
      );
    },
    [selectedModeId, updateConversationMessages, streamAssistantReply]
  );

  const handleToggleTts = useCallback(
    async (message: ChatMessageType) => {
      const stopPlayback = () => {
        audioRef.current?.pause();
        audioRef.current = null;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        setTtsMessageId(null);
      };

      if (ttsMessageId === message.id) {
        stopPlayback();
        return;
      }

      stopPlayback();
      setTtsLoadingId(message.id);

      try {
        const resp = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: message.content,
            voiceName: settings.voiceName,
          }),
        });
        const data = await resp.json();

        if (resp.ok && data.audioBase64) {
          const audio = new Audio(
            `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`
          );
          audioRef.current = audio;
          setTtsMessageId(message.id);
          audio.onended = () => {
            setTtsMessageId(null);
            audioRef.current = null;
          };
          audio.onerror = () => {
            setTtsMessageId(null);
            audioRef.current = null;
          };
          await audio.play();
          return;
        }

        // Smooth client fallback to native Web Speech API
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const clean = message.content
            .replace(/```[\s\S]*?```/g, 'Code block.')
            .replace(/[#*_~`>\[\]]/g, '')
            .slice(0, 2500);
          const utter = new SpeechSynthesisUtterance(clean);
          utter.onend = () => setTtsMessageId(null);
          utter.onerror = () => setTtsMessageId(null);
          setTtsMessageId(message.id);
          window.speechSynthesis.speak(utter);
        }
      } catch {
        setTtsMessageId(null);
      } finally {
        setTtsLoadingId(null);
      }
    },
    [ttsMessageId, settings.voiceName]
  );

  const handlePermissionDecision = useCallback(
    (messageId: string, requestId: string, decision: 'approved' | 'declined') => {
      const convId = activeConvIdRef.current;
      if (!convId) return;
      let approvedFact: { fact: string; category: MemoryItem['category'] } | null = null;

      updateConversationMessages(convId, (msgs) =>
        msgs.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            permissionRequests: m.permissionRequests?.map((req) => {
              if (req.id !== requestId) return req;
              if (decision === 'approved' && req.decision === 'pending') {
                const validCat = ['preference', 'context', 'workflow', 'goal'].includes(
                  req.category
                )
                  ? (req.category as MemoryItem['category'])
                  : 'preference';
                approvedFact = { fact: req.fact, category: validCat };
              }
              return { ...req, decision };
            }),
          };
        })
      );

      if (approvedFact) {
        const item = approvedFact as { fact: string; category: MemoryItem['category'] };
        setMemories((prev) => [
          {
            id: createId('mem'),
            fact: item.fact,
            category: item.category,
            enabled: true,
            createdAt: Date.now(),
          },
          ...prev,
        ]);
      }
    },
    [updateConversationMessages]
  );

  const handleTogglePlanStep = useCallback(
    (messageId: string, planId: string, stepIndex: number) => {
      const convId = activeConvIdRef.current;
      if (!convId) return;
      updateConversationMessages(convId, (msgs) =>
        msgs.map((m) =>
          m.id === messageId
            ? {
                ...m,
                taskPlans: m.taskPlans?.map((plan) =>
                  plan.id === planId
                    ? {
                        ...plan,
                        steps: plan.steps.map((s, idx) =>
                          idx === stepIndex ? { ...s, completed: !s.completed } : s
                        ),
                      }
                    : plan
                ),
              }
            : m
        )
      );
    },
    [updateConversationMessages]
  );

  const formatConversationMarkdown = (conv: Conversation): string => {
    const mdLines = [`# ${conv.title}`, `_Exported from PERSONAL AI · ${new Date().toLocaleString()}_`, ''];
    for (const m of conv.messages) {
      mdLines.push(`## ${m.role === 'user' ? 'You' : 'PERSONAL AI'}`);
      mdLines.push(m.content);
      mdLines.push('');
    }
    return mdLines.join('\n');
  };

  const handleExportConversation = useCallback((conv: Conversation) => {
    const markdown = formatConversationMarkdown(conv);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conv.title.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase() || 'chat'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleShareConversation = useCallback(
    async (conv: Conversation): Promise<'shared' | 'copied' | 'failed'> => {
      const summary = formatConversationMarkdown(conv);
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          await navigator.share({
            title: conv.title,
            text: summary.slice(0, 12000),
          });
          return 'shared';
        }
      } catch {
        // Fall through to clipboard copy if share sheet dismissed or unsupported
      }
      try {
        await navigator.clipboard.writeText(summary);
        return 'copied';
      } catch {
        return 'failed';
      }
    },
    []
  );

  const handleArchiveConversation = useCallback((id: string, archived: boolean) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived, updatedAt: Date.now() } : c))
    );
  }, []);

  const handleClearConversation = useCallback((id: string) => {
    if (isStreamingRef.current && streamingConvId === id) {
      abortControllerRef.current?.abort();
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, messages: [], updatedAt: Date.now() } : c))
    );
  }, [streamingConvId]);

  const handleDeleteConversation = useCallback(
    (id: string) => {
      if (isStreamingRef.current && streamingConvId === id) {
        abortControllerRef.current?.abort();
      }
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvIdRef.current === id) setActiveConversationId(null);
    },
    [streamingConvId]
  );

  const handleExportAllData = useCallback(() => {
    const json = exportAllLocalData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `personal-ai-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleClearAllData = useCallback(() => {
    clearAllLocalData();
    setConversations([]);
    setProjects([]);
    setMemories([]);
    setSettings(DEFAULT_SETTINGS);
    setActiveConversationId(null);
    setDraftProjectId(undefined);
  }, []);

  const starterPrompts = [
    {
      icon: <ListTodo className="w-4 h-4 text-zinc-500" />,
      title: 'Plan a complex project',
      prompt: 'Break down a 4-week product launch checklist with clear milestones and owners.',
    },
    {
      icon: <FileSearch className="w-4 h-4 text-zinc-500" />,
      title: 'Analyze documents & images',
      prompt: 'What file types can I attach for analysis, and how should I structure a technical review?',
    },
    {
      icon: <Code2 className="w-4 h-4 text-zinc-500" />,
      title: 'Write & debug code',
      prompt: 'Design a clean TypeScript rate-limiter utility using a token bucket algorithm with unit test cases.',
    },
    {
      icon: <Compass className="w-4 h-4 text-zinc-500" />,
      title: 'Research & synthesize',
      prompt: 'Compare event-driven microservices vs modular monoliths with a clear decision matrix table.',
    },
  ];

  return (
    <div className="h-[100dvh] w-full flex overflow-hidden bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50">
      <Sidebar
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setDraftProjectId(undefined);
          setActiveTab('chats');
        }}
        onNewChat={() => handleNewChat()}
        onRenameConversation={(id, title) =>
          setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
        }
        onArchiveConversation={handleArchiveConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenSettings={() => setSettingsOpen(true)}
        userName={settings.userName}
        memoryCount={memories.filter((m) => m.enabled).length}
        projectCount={projects.length}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <TopBar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          onNewChat={() => handleNewChat()}
          modes={modes}
          selectedModeId={selectedModeId}
          onSelectMode={(modeId) => {
            setSelectedModeId(modeId);
            if (activeConversation) {
              setConversations((prev) =>
                prev.map((c) =>
                  c.id === activeConversation.id ? { ...c, modeId } : c
                )
              );
            }
          }}
          enableSearch={enableSearch}
          onToggleSearch={() => setEnableSearch((v) => !v)}
          activeConversation={activeTab === 'chats' ? activeConversation : null}
          onRenameConversation={(id, title) =>
            setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
          }
          onArchiveConversation={handleArchiveConversation}
          onShareConversation={handleShareConversation}
          onExportConversation={handleExportConversation}
          onClearConversation={handleClearConversation}
          onDeleteConversation={handleDeleteConversation}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {activeTab === 'projects' ? (
          <ProjectsView
            projects={projects}
            conversations={conversations}
            onCreateProject={(data) =>
              setProjects((prev) => [
                {
                  ...data,
                  id: createId('proj'),
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                },
                ...prev,
              ])
            }
            onUpdateProject={(id, updates) =>
              setProjects((prev) =>
                prev.map((p) =>
                  p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
                )
              )
            }
            onDeleteProject={(id) => {
              setProjects((prev) => prev.filter((p) => p.id !== id));
              setConversations((prev) =>
                prev.map((c) => (c.projectId === id ? { ...c, projectId: undefined } : c))
              );
            }}
            onStartChatInProject={(projectId) => handleNewChat(projectId)}
            onSelectConversation={(convId) => {
              setActiveConversationId(convId);
              setActiveTab('chats');
            }}
          />
        ) : activeTab === 'library' ? (
          <LibraryView
            conversations={conversations}
            onOpenConversation={(convId) => {
              setActiveConversationId(convId);
              setActiveTab('chats');
            }}
          />
        ) : activeTab === 'memories' ? (
          <MemoriesView
            memories={memories}
            memoryEnabled={settings.memoryEnabled}
            onToggleGlobalMemory={() =>
              setSettings((prev) => ({ ...prev, memoryEnabled: !prev.memoryEnabled }))
            }
            onAddMemory={(fact, category) =>
              setMemories((prev) => [
                {
                  id: createId('mem'),
                  fact,
                  category,
                  enabled: true,
                  createdAt: Date.now(),
                },
                ...prev,
              ])
            }
            onUpdateMemory={(id, updates) =>
              setMemories((prev) =>
                prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
              )
            }
            onDeleteMemory={(id) =>
              setMemories((prev) => prev.filter((m) => m.id !== id))
            }
          />
        ) : (
          /* Main Chat Viewport */
          <main className="relative flex-1 flex flex-col min-h-0">
            {apiConfigured === false && (
              <div className="px-4 pt-3">
                <div className="max-w-3xl mx-auto rounded-2xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Server credentials not configured:</strong> Add the backend API secret in AI Studio under{' '}
                    <strong>Settings &gt; Secrets</strong> so PERSONAL AI can connect securely from the server.
                  </p>
                </div>
              </div>
            )}

            {/* Active Project Context Banner */}
            {activeProject && (
              <div className="px-4 pt-2.5">
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-900/60 text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="flex items-center gap-2 truncate">
                    <FolderKanban className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {activeProject.name}
                    </span>
                    {activeProject.description && (
                      <span className="hidden sm:inline text-zinc-400 truncate">
                        · {activeProject.description}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('projects')}
                    className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 shrink-0 font-medium"
                  >
                    Manage
                  </button>
                </div>
              </div>
            )}

            {/* Message Thread or Welcome Screen */}
            <div
              ref={scrollContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 overflow-y-auto px-3 sm:px-6"
            >
              {!activeConversation || activeConversation.messages.length === 0 ? (
                <div className="min-h-full max-w-3xl mx-auto flex flex-col items-center justify-center py-8 sm:py-12">
                  <div className="text-center space-y-3 mb-8">
                    <div className="flex justify-center">
                      <BrandLogo size={48} />
                    </div>
                    <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 text-balance">
                      {getGreeting(settings.userName)}
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                      Ask anything, upload images or PDFs, speak naturally, or plan multi-step work with agent tools.
                    </p>
                  </div>

                  <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {starterPrompts.map((item) => (
                      <button
                        key={item.title}
                        type="button"
                        onClick={() => void handleSendMessage(item.prompt, [])}
                        className="text-left p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.985] transition-all space-y-1.5"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {item.icon}
                          <span>{item.title}</span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                          {item.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto pb-4 divide-y divide-zinc-100/70 dark:divide-zinc-900/70">
                  {activeConversation.messages.map((msg, index) => {
                    const isLast = index === activeConversation.messages.length - 1;
                    const msgStreaming =
                      isStreaming &&
                      streamingConvId === activeConversation.id &&
                      isLast &&
                      msg.role === 'assistant';

                    return (
                      <ChatMessage
                        key={msg.id}
                        message={msg}
                        isStreaming={msgStreaming}
                        isPlayingTts={ttsMessageId === msg.id}
                        isLoadingTts={ttsLoadingId === msg.id}
                        canMutate={!isStreaming}
                        onCopy={handleCopyMessage}
                        onRegenerate={msg.role === 'assistant' ? handleRegenerate : undefined}
                        onEditResend={msg.role === 'user' ? handleEditResend : undefined}
                        onToggleTts={msg.role === 'assistant' ? handleToggleTts : undefined}
                        onPermissionDecision={handlePermissionDecision}
                        onTogglePlanStep={handleTogglePlanStep}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Non-intrusive Jump to Latest Button */}
            {showScrollToBottom && activeConversation && activeConversation.messages.length > 0 && (
              <div className="absolute bottom-[132px] sm:bottom-[124px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <button
                  type="button"
                  onClick={() => scrollToBottom(true)}
                  className="pointer-events-auto animate-panel-pop w-9 h-9 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-md flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.95] transition-all"
                  aria-label="Jump to latest message"
                  title="Jump to latest"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Sticky Bottom Composer */}
            <div className="shrink-0 bg-gradient-to-t from-white via-white to-white/80 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950/80">
              <Composer
                onSend={(t, atts) => void handleSendMessage(t, atts)}
                onStop={handleStopGeneration}
                isStreaming={isStreaming}
                enableSearch={enableSearch}
                onToggleSearch={() => setEnableSearch((v) => !v)}
                enableAgentTools={enableAgentTools}
                onToggleAgentTools={() => setEnableAgentTools((v) => !v)}
              />
            </div>
          </main>
        )}
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(updates) =>
          setSettings((prev) => ({ ...prev, ...updates }))
        }
        modes={modes}
        onExportAll={handleExportAllData}
        onClearHistory={handleClearAllData}
        apiConfigured={apiConfigured}
      />
    </div>
  );
}
