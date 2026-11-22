import type {
  AssistantModeId,
  Conversation,
  MemoryItem,
  Project,
  UserSettings,
} from '../types';

const STORAGE_KEYS = {
  CONVERSATIONS: 'personal_ai_conversations_v1',
  PROJECTS: 'personal_ai_projects_v1',
  MEMORIES: 'personal_ai_memories_v1',
  SETTINGS: 'personal_ai_settings_v1',
  ACTIVE_CONVERSATION: 'personal_ai_active_conv_v1',
};

const VALID_MODES = new Set<AssistantModeId>(['auto', 'fast', 'balanced', 'deep']);

export const DEFAULT_SETTINGS: UserSettings = {
  userName: '',
  userRole: '',
  theme: 'system',
  language: 'English',
  defaultMode: 'auto',
  enableSearchByDefault: false,
  enableAgentTools: true,
  customInstruction: '',
  memoryEnabled: true,
  allowMemorySuggestions: true,
  voiceName: 'Kore',
  autoReadAloud: false,
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normalizeModeId(rawMode: unknown, legacyModelId?: unknown): AssistantModeId {
  if (typeof rawMode === 'string' && VALID_MODES.has(rawMode as AssistantModeId)) {
    return rawMode as AssistantModeId;
  }
  if (typeof legacyModelId === 'string') {
    if (legacyModelId.includes('flash-lite')) return 'fast';
    if (legacyModelId.includes('neon') || legacyModelId.includes('carbon')) return 'deep';
    if (legacyModelId.includes('hydrogen')) return 'balanced';
  }
  return 'auto';
}

export function loadConversations(): Conversation[] {
  const list = safeRead<Array<Record<string, unknown>>>(STORAGE_KEYS.CONVERSATIONS, []);
  if (!Array.isArray(list)) return [];
  return list.map((raw) => ({
    id: String(raw.id ?? ''),
    title: String(raw.title ?? 'Conversation'),
    createdAt: Number(raw.createdAt ?? Date.now()),
    updatedAt: Number(raw.updatedAt ?? Date.now()),
    projectId: typeof raw.projectId === 'string' ? raw.projectId : undefined,
    messages: Array.isArray(raw.messages) ? (raw.messages as Conversation['messages']) : [],
    modeId: normalizeModeId(raw.modeId, raw.modelId),
    archived: Boolean(raw.archived),
  }));
}

export function saveConversations(conversations: Conversation[]): boolean {
  const sanitized = conversations.map((conv) => ({
    ...conv,
    messages: conv.messages.map((msg) => ({
      ...msg,
      attachments: msg.attachments?.map((att) => ({
        ...att,
        previewUrl: undefined,
        dataBase64:
          att.dataBase64 && att.dataBase64.length <= 2_000_000 ? att.dataBase64 : undefined,
      })),
    })),
  }));
  return safeWrite(STORAGE_KEYS.CONVERSATIONS, sanitized);
}

export function loadProjects(): Project[] {
  const list = safeRead<Project[]>(STORAGE_KEYS.PROJECTS, []);
  return Array.isArray(list) ? list : [];
}

export function saveProjects(projects: Project[]): boolean {
  return safeWrite(STORAGE_KEYS.PROJECTS, projects);
}

export function loadMemories(): MemoryItem[] {
  const list = safeRead<MemoryItem[]>(STORAGE_KEYS.MEMORIES, []);
  return Array.isArray(list) ? list : [];
}

export function saveMemories(memories: MemoryItem[]): boolean {
  return safeWrite(STORAGE_KEYS.MEMORIES, memories);
}

export function loadSettings(): UserSettings {
  const saved = safeRead<Partial<UserSettings> & { defaultModel?: string }>(
    STORAGE_KEYS.SETTINGS,
    {}
  );
  const defaultMode = normalizeModeId(saved.defaultMode, saved.defaultModel);
  const merged = { ...DEFAULT_SETTINGS, ...saved, defaultMode };
  delete (merged as { defaultModel?: string }).defaultModel;
  delete (merged as { thinkingLevel?: string }).thinkingLevel;
  return merged;
}

export function saveSettings(settings: UserSettings): boolean {
  return safeWrite(STORAGE_KEYS.SETTINGS, settings);
}

export function loadActiveConversationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION);
  } catch {
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONVERSATION);
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function clearAllLocalData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore
  }
}

export function exportAllLocalData(): string {
  const payload = {
    app: 'PERSONAL AI',
    exportedAt: new Date().toISOString(),
    storageScope: 'local-browser-only',
    conversations: loadConversations(),
    projects: loadProjects(),
    memories: loadMemories(),
    settings: loadSettings(),
  };
  return JSON.stringify(payload, null, 2);
}
