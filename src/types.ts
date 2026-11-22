export type ThemeMode = 'light' | 'dark' | 'system';

export type SidebarTab = 'chats' | 'projects' | 'library' | 'memories';

export type AssistantModeId = 'auto' | 'fast' | 'balanced' | 'deep';

export interface AssistantModeInfo {
  id: AssistantModeId;
  name: string;
  tagline: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
  supportsSearch: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsPdf: boolean;
  isDefault?: boolean;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'pdf' | 'audio' | 'text';
  dataBase64?: string;
  textContent?: string;
  previewUrl?: string;
  createdAt: number;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface TaskPlanStep {
  title: string;
  detail: string;
  priority: string;
  completed?: boolean;
}

export interface TaskPlan {
  id: string;
  goal: string;
  steps: TaskPlanStep[];
}

export interface AgentToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'running' | 'completed';
}

export interface PermissionRequest {
  id: string;
  action: 'save_memory';
  fact: string;
  category: 'preference' | 'context' | 'workflow' | 'goal' | string;
  reason: string;
  decision: 'pending' | 'approved' | 'declined';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thoughtSummary?: string;
  createdAt: number;
  attachments?: Attachment[];
  toolCalls?: AgentToolCall[];
  taskPlans?: TaskPlan[];
  permissionRequests?: PermissionRequest[];
  groundingSources?: GroundingSource[];
  isError?: boolean;
  errorCode?: string;
  modeUsed?: AssistantModeId;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  projectId?: string;
  messages: ChatMessage[];
  modeId: AssistantModeId;
  archived?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  instructions: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemoryItem {
  id: string;
  fact: string;
  category: 'preference' | 'context' | 'workflow' | 'goal';
  enabled: boolean;
  createdAt: number;
}

export interface UserSettings {
  userName: string;
  userRole: string;
  theme: ThemeMode;
  language: string;
  defaultMode: AssistantModeId;
  enableSearchByDefault: boolean;
  enableAgentTools: boolean;
  customInstruction: string;
  memoryEnabled: boolean;
  allowMemorySuggestions: boolean;
  voiceName: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  autoReadAloud: boolean;
}
