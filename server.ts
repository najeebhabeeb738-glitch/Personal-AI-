import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Content,
  type FunctionDeclaration,
  type Part,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

type AssistantModeId = 'auto' | 'fast' | 'balanced' | 'deep';

interface AssistantModeInfo {
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

const VALID_MODES = new Set<AssistantModeId>(['auto', 'fast', 'balanced', 'deep']);

// Short-lived cache of discovered backend model IDs so /api/modes & /api/chat/stream stay instant
let cachedDiscovery: { fetchedAt: number; models: Set<string>; ok: boolean } | null = null;
const DISCOVERY_TTL_MS = 60_000;

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function getDiscoveredModels(ai: GoogleGenAI): Promise<{ models: Set<string>; ok: boolean }> {
  const now = Date.now();
  if (cachedDiscovery && now - cachedDiscovery.fetchedAt < DISCOVERY_TTL_MS) {
    return { models: cachedDiscovery.models, ok: cachedDiscovery.ok };
  }

  try {
    const discovered = new Set<string>();
    const pager = await ai.models.list();
    for await (const m of pager) {
      if (m.name) {
        discovered.add(m.name.replace(/^models\//, ''));
      }
      if (discovered.size >= 250) break;
    }
    cachedDiscovery = { fetchedAt: now, models: discovered, ok: true };
    return { models: discovered, ok: true };
  } catch {
    return { models: new Set<string>(), ok: false };
  }
}

function resolveModeTarget(
  mode: AssistantModeId,
  discovered: Set<string>,
  discoveryOk: boolean
): {
  model: string;
  thinkingLevel: ThinkingLevel | undefined;
  available: boolean;
  unavailableReason?: string;
} {
  const has = (id: string) => (!discoveryOk || discovered.size === 0 ? true : discovered.has(id));

  const primaryFast = has('gemini-3.1-flash-lite')
    ? 'gemini-3.1-flash-lite'
    : has('gemini-4-hydrogen')
    ? 'gemini-4-hydrogen'
    : null;

  if (!primaryFast) {
    return {
      model: 'gemini-3.1-flash-lite',
      thinkingLevel: ThinkingLevel.LOW,
      available: false,
      unavailableReason: 'This mode is not currently provisioned for the active configuration.',
    };
  }

  switch (mode) {
    case 'fast':
      return {
        model: primaryFast,
        thinkingLevel: primaryFast === 'gemini-3.1-flash-lite' ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
        available: true,
      };
    case 'balanced':
      return {
        model: primaryFast,
        thinkingLevel: ThinkingLevel.MEDIUM,
        available: true,
      };
    case 'deep':
      return {
        model: primaryFast,
        thinkingLevel: ThinkingLevel.HIGH,
        available: true,
      };
    case 'auto':
    default:
      return {
        model: primaryFast,
        thinkingLevel: ThinkingLevel.LOW,
        available: true,
      };
  }
}

function buildModesPayload(
  configured: boolean,
  discovered: Set<string>,
  discoveryOk: boolean
): AssistantModeInfo[] {
  const specs: Array<{
    id: AssistantModeId;
    name: string;
    tagline: string;
    description: string;
    isDefault?: boolean;
  }> = [
    {
      id: 'auto',
      name: 'Auto',
      tagline: 'Adaptive speed & quality',
      description: 'Automatically selects the optimal engine for fast, reliable responses.',
      isDefault: true,
    },
    {
      id: 'fast',
      name: 'Fast',
      tagline: 'Lowest latency',
      description: 'Prioritizes instant first-token speed for quick answers and drafting.',
    },
    {
      id: 'balanced',
      name: 'Balanced',
      tagline: 'Depth & fluency',
      description: 'Balances thorough multi-step synthesis with responsive streaming.',
    },
    {
      id: 'deep',
      name: 'Deep Think',
      tagline: 'Complex reasoning',
      description: 'Allocates deeper reasoning for architecture, math, and root-cause analysis.',
    },
  ];

  return specs.map((spec) => {
    if (!configured) {
      return {
        ...spec,
        available: false,
        unavailableReason: 'Backend server credentials are not configured yet.',
        supportsSearch: true,
        supportsTools: true,
        supportsVision: true,
        supportsPdf: true,
      };
    }

    const target = resolveModeTarget(spec.id, discovered, discoveryOk);
    return {
      ...spec,
      available: target.available,
      unavailableReason: target.unavailableReason,
      supportsSearch: true,
      supportsTools: true,
      supportsVision: true,
      supportsPdf: true,
    };
  });
}

function sanitizeProviderText(text: string): string {
  return text
    .replace(/google\s+gemini/gi, 'assistant engine')
    .replace(/gemini\s+[0-9.]+\s*[a-z-]*/gi, 'selected engine')
    .replace(/gemini/gi, 'assistant engine');
}

function extractReadableErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  // Check if error message wraps JSON from SDK
  const jsonStart = raw.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { message?: string; status?: string; code?: number };
      };
      if (parsed?.error?.message) {
        return sanitizeProviderText(parsed.error.message);
      }
    } catch {
      // Ignore parse failure and use raw message
    }
  }
  return sanitizeProviderText(raw);
}

function formatBackendError(error: unknown): { status: number; code: string; message: string } {
  const readable = extractReadableErrorMessage(error);
  const lower = readable.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('api key not valid') || lower.includes('api key')) {
    return {
      status: 400,
      code: 'API_KEY_INVALID',
      message:
        'Server credentials appear invalid. Verify your backend secret in AI Studio Settings > Secrets.',
    };
  }

  if (lower.includes('permission_denied') || lower.includes('403')) {
    return {
      status: 403,
      code: 'PERMISSION_DENIED',
      message:
        'Permission denied by the upstream AI service. Verify your configured server secret.',
    };
  }

  if (
    lower.includes('503') ||
    lower.includes('unavailable') ||
    lower.includes('high demand') ||
    lower.includes('overloaded')
  ) {
    return {
      status: 503,
      code: 'SERVICE_BUSY',
      message:
        'This mode is currently experiencing high demand. Retry in a moment or switch to Auto or Fast mode.',
    };
  }

  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      code: 'RATE_LIMITED',
      message:
        'Rate limit or quota reached. Please wait a brief moment and retry.',
    };
  }

  if (lower.includes('not_found') || lower.includes('404')) {
    return {
      status: 404,
      code: 'MODE_UNAVAILABLE',
      message:
        'The selected mode is unavailable for your current workspace configuration. Switch to Auto mode.',
    };
  }

  return {
    status: 500,
    code: 'ASSISTANT_ERROR',
    message: readable || 'An unexpected error occurred while generating the response.',
  };
}

// Safe recursive-descent math evaluator (no eval / Function constructor)
function evaluateMathExpression(expr: string): number {
  const tokens: string[] = [];
  let i = 0;
  const clean = expr.replace(/\s+/g, '');

  while (i < clean.length) {
    const ch = clean[i];
    if ('+-*/^(),'.includes(ch)) {
      tokens.push(ch);
      i++;
    } else if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < clean.length && /[0-9.eE]/.test(clean[i])) {
        if (
          (clean[i] === 'e' || clean[i] === 'E') &&
          i + 1 < clean.length &&
          (clean[i + 1] === '+' || clean[i + 1] === '-')
        ) {
          num += clean[i] + clean[i + 1];
          i += 2;
        } else {
          num += clean[i];
          i++;
        }
      }
      tokens.push(num);
    } else if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < clean.length && /[a-zA-Z0-9_]/.test(clean[i])) {
        ident += clean[i];
        i++;
      }
      tokens.push(ident.toLowerCase());
    } else {
      throw new Error(`Unsupported character in math expression: "${ch}"`);
    }
  }

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpression(): number {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parsePower();
      if (op === '/' && right === 0) throw new Error('Division by zero');
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek() === '^') {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === '-') {
      consume();
      return -parseUnary();
    }
    if (peek() === '+') {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const token = peek();
    if (token === undefined) throw new Error('Unexpected end of expression');

    if (token === '(') {
      consume();
      const val = parseExpression();
      if (consume() !== ')') throw new Error('Missing closing parenthesis');
      return val;
    }

    if (/^[0-9.]/.test(token)) {
      consume();
      const num = Number(token);
      if (!Number.isFinite(num)) throw new Error(`Invalid number: ${token}`);
      return num;
    }

    if (/^[a-z_]+$/.test(token)) {
      consume();
      if (token === 'pi') return Math.PI;
      if (token === 'e') return Math.E;

      if (consume() !== '(') throw new Error(`Expected "(" after function "${token}"`);
      const args: number[] = [parseExpression()];
      while (peek() === ',') {
        consume();
        args.push(parseExpression());
      }
      if (consume() !== ')') throw new Error(`Expected ")" after "${token}" arguments`);

      switch (token) {
        case 'sqrt':
          return Math.sqrt(args[0]);
        case 'abs':
          return Math.abs(args[0]);
        case 'sin':
          return Math.sin(args[0]);
        case 'cos':
          return Math.cos(args[0]);
        case 'tan':
          return Math.tan(args[0]);
        case 'log':
          return args.length === 2 ? Math.log(args[0]) / Math.log(args[1]) : Math.log10(args[0]);
        case 'ln':
          return Math.log(args[0]);
        case 'round':
          return Math.round(args[0]);
        case 'floor':
          return Math.floor(args[0]);
        case 'ceil':
          return Math.ceil(args[0]);
        case 'min':
          return Math.min(...args);
        case 'max':
          return Math.max(...args);
        case 'pow':
          return Math.pow(args[0], args[1] ?? 1);
        default:
          throw new Error(`Unknown math function: ${token}`);
      }
    }

    throw new Error(`Unexpected token: ${token}`);
  }

  const result = parseExpression();
  if (pos < tokens.length) throw new Error(`Unexpected trailing token: ${tokens[pos]}`);
  if (!Number.isFinite(result)) throw new Error('Result is not a finite number');
  return result;
}

// Agent Tool Declarations
const agentFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: 'plan_task_steps',
    description:
      'Break a complex user goal, research project, or engineering task into a clear, ordered list of actionable steps with priority and estimated effort.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        goal: {
          type: Type.STRING,
          description: 'Concise title of the overall goal or task.',
        },
        steps: {
          type: Type.ARRAY,
          description: 'Ordered actionable steps to complete the goal.',
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Short step headline.' },
              detail: { type: Type.STRING, description: 'Specific action or deliverable.' },
              priority: {
                type: Type.STRING,
                description: 'Priority level: high, medium, or low.',
              },
            },
            required: ['title', 'detail', 'priority'],
          },
        },
      },
      required: ['goal', 'steps'],
    },
  },
  {
    name: 'propose_save_memory',
    description:
      'Propose saving an important, enduring user preference, personal detail, or recurring workflow rule to local private memory. The user will be prompted to approve or decline before it is stored.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: {
          type: Type.STRING,
          description: 'Clear, concise statement of the preference or fact to remember.',
        },
        category: {
          type: Type.STRING,
          description: 'One of: preference, context, workflow, goal.',
        },
        reason: {
          type: Type.STRING,
          description: 'Brief explanation of why remembering this will improve future assistance.',
        },
      },
      required: ['fact', 'category', 'reason'],
    },
  },
  {
    name: 'search_local_memories',
    description:
      'Search the user’s currently enabled private memories for preferences or facts matching a keyword or topic.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: 'Keyword or topic to search within saved memories.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_current_datetime',
    description: 'Retrieve the current date, time, day of week, and UTC offset.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        timezone: {
          type: Type.STRING,
          description: 'Optional IANA timezone name (e.g. America/New_York, Asia/Dubai, UTC).',
        },
      },
    },
  },
  {
    name: 'calculate_math',
    description:
      'Evaluate a mathematical expression accurately (supports +, -, *, /, ^, parentheses, sqrt, sin, cos, tan, log, ln, abs, round, min, max, pi, e).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        expression: {
          type: Type.STRING,
          description: 'Mathematical expression to evaluate, e.g. "(1450 * 1.085) / 12".',
        },
      },
      required: ['expression'],
    },
  },
];

interface IncomingAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'pdf' | 'audio' | 'text';
  dataBase64?: string;
  textContent?: string;
}

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: IncomingAttachment[];
}

interface MemoryInput {
  id: string;
  fact: string;
  category: string;
  enabled: boolean;
}

function buildConversationContents(messages: IncomingMessage[]): Content[] {
  const contents: Content[] = [];
  for (const msg of messages) {
    const parts: Part[] = [];
    if (msg.attachments && Array.isArray(msg.attachments)) {
      for (const att of msg.attachments) {
        if (att.kind === 'text' && typeof att.textContent === 'string') {
          parts.push({
            text: `[Attached file: ${att.name} (${att.mimeType})]\n\`\`\`\n${att.textContent.slice(0, 120000)}\n\`\`\``,
          });
        } else if (att.dataBase64 && att.mimeType) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.dataBase64,
            },
          });
        }
      }
    }
    if (msg.content && msg.content.trim().length > 0) {
      parts.push({ text: msg.content });
    }
    if (parts.length === 0) {
      parts.push({ text: ' ' });
    }
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts,
    });
  }
  return contents;
}

function buildSystemInstruction(opts: {
  customInstruction?: string;
  projectInstructions?: string;
  memories?: MemoryInput[];
  userName?: string;
  language?: string;
  allowMemorySuggestions?: boolean;
}): string {
  const lines: string[] = [
    'You are PERSONAL AI, an independent, intelligent, private personal AI assistant and agent.',
    'Start answering directly and clearly without unnecessary preamble.',
    'Be thoughtful, accurate, concise when brevity helps, and thorough when depth is needed.',
    'When tackling multi-step or complex requests, break them down cleanly and use available agent tools when genuinely helpful.',
    'Format responses in clean Markdown with clear headings, lists, tables, and fenced code blocks with language tags.',
    'For mathematical formulas, use standard LaTeX delimiters ($...$ for inline, $$...$$ for display blocks).',
    'Never fabricate citations, file contents, or tool outputs. If you are uncertain, state what you know clearly.',
    'Always ask for explicit user confirmation before external actions that affect user accounts, files, or other people.',
  ];

  if (opts.userName && opts.userName.trim()) {
    lines.push(`The user's preferred name is "${opts.userName.trim()}".`);
  }

  if (opts.language && opts.language !== 'English') {
    lines.push(`Respond in ${opts.language} unless the user writes in another language or asks otherwise.`);
  }

  if (opts.allowMemorySuggestions !== false) {
    lines.push(
      'If the user shares an enduring preference, constraint, or personal workflow rule, you may call `propose_save_memory` so the user can approve saving it to their local memory. Never claim something is saved until approved.'
    );
  } else {
    lines.push('Memory suggestions are currently disabled by user settings; do not call `propose_save_memory`.');
  }

  const activeMemories = (opts.memories ?? []).filter((m) => m.enabled && m.fact.trim());
  if (activeMemories.length > 0) {
    lines.push('\nEnabled private user memories (local to this browser):');
    for (const mem of activeMemories.slice(0, 40)) {
      lines.push(`- [${mem.category}] ${mem.fact}`);
    }
  }

  if (opts.projectInstructions && opts.projectInstructions.trim()) {
    lines.push(`\nActive Project Instructions:\n${opts.projectInstructions.trim()}`);
  }

  if (opts.customInstruction && opts.customInstruction.trim()) {
    lines.push(`\nCustom User Instructions:\n${opts.customInstruction.trim()}`);
  }

  return lines.join('\n');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableTransientError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  // Health & API key presence check (never exposes any secret value or provider branding)
  app.get('/api/health', (_req: Request, res: Response) => {
    const configured = Boolean(process.env.GEMINI_API_KEY?.trim());
    res.json({
      ok: true,
      configured,
      timestamp: new Date().toISOString(),
    });
  });

  // Expose PERSONAL AI experience modes with honest backend availability checks
  const handleModesRequest = async (_req: Request, res: Response) => {
    const ai = getAIClient();
    if (!ai) {
      return res.json({
        configured: false,
        modes: buildModesPayload(false, new Set(), false),
        capabilities: { transcription: false, tts: false },
      });
    }

    const { models: discovered, ok: discoveryOk } = await getDiscoveredModels(ai);
    return res.json({
      configured: true,
      modes: buildModesPayload(true, discovered, discoveryOk),
      capabilities: {
        transcription: true,
        tts: !discoveryOk || discovered.size === 0 || discovered.has('gemini-3.8-flash-lite-tts'),
      },
    });
  };

  app.get('/api/modes', handleModesRequest);
  app.get('/api/models', handleModesRequest);

  // Streaming SSE Chat & Agent Execution Endpoint
  app.post('/api/chat/stream', async (req: Request, res: Response) => {
    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({
        code: 'CREDENTIALS_MISSING',
        message:
          'Server AI credentials are not configured yet. Configure the server secret in AI Studio Settings > Secrets, then retry.',
      });
    }

    const body = req.body ?? {};
    const messages = Array.isArray(body.messages) ? (body.messages as IncomingMessage[]) : [];
    if (messages.length === 0) {
      return res.status(400).json({ code: 'INVALID_REQUEST', message: 'Messages array is required.' });
    }

    const requestedModeRaw = typeof body.mode === 'string' ? body.mode.toLowerCase() : 'auto';
    const modeId: AssistantModeId = VALID_MODES.has(requestedModeRaw as AssistantModeId)
      ? (requestedModeRaw as AssistantModeId)
      : 'auto';

    const { models: discovered, ok: discoveryOk } = await getDiscoveredModels(ai);
    const target = resolveModeTarget(modeId, discovered, discoveryOk);

    if (!target.available) {
      return res.status(404).json({
        code: 'MODE_UNAVAILABLE',
        message: target.unavailableReason || 'Selected mode is currently unavailable.',
      });
    }

    const enableSearch = Boolean(body.enableSearch);
    const enableAgentTools = body.enableAgentTools !== false;
    const memories = Array.isArray(body.memories) ? (body.memories as MemoryInput[]) : [];

    const systemInstruction = buildSystemInstruction({
      customInstruction: typeof body.customInstruction === 'string' ? body.customInstruction : undefined,
      projectInstructions: typeof body.projectInstructions === 'string' ? body.projectInstructions : undefined,
      memories,
      userName: typeof body.userName === 'string' ? body.userName : undefined,
      language: typeof body.language === 'string' ? body.language : undefined,
      allowMemorySuggestions: body.allowMemorySuggestions !== false,
    });

    // Set SSE headers & flush immediately so TTFB is instant
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(': ok\n\n');

    let clientAborted = false;
    // IMPORTANT: listen on res.on('close'), NOT req.on('close') (Node fires req close when POST body finishes)
    res.on('close', () => {
      if (!res.writableEnded) {
        clientAborted = true;
      }
    });

    const sendEvent = (payload: Record<string, unknown>) => {
      if (clientAborted || res.writableEnded) return;
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const heartbeat = setInterval(() => {
      if (!clientAborted && !res.writableEnded) {
        res.write(': keepalive\n\n');
      }
    }, 10_000);

    try {
      const contents: Content[] = buildConversationContents(messages);

      const tools: Array<Record<string, unknown>> = [];
      if (enableSearch) {
        tools.push({ googleSearch: {} });
      }
      if (enableAgentTools) {
        tools.push({ functionDeclarations: agentFunctionDeclarations });
      }

      const config: Record<string, unknown> = {
        systemInstruction,
      };
      if (target.thinkingLevel) {
        config.thinkingConfig = { thinkingLevel: target.thinkingLevel };
      }
      if (tools.length > 0) {
        config.tools = tools;
      }
      if (enableSearch && enableAgentTools) {
        config.toolConfig = { includeServerSideToolInvocations: true };
      }

      const seenSourceUris = new Set<string>();
      const MAX_AGENT_TURNS = 4;

      for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
        if (clientAborted) break;

        let stream: AsyncIterable<{
          candidates?: Array<{
            content?: { parts?: Part[] };
            groundingMetadata?: {
              groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
            };
          }>;
        }> | null = null;

        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            stream = await ai.models.generateContentStream({
              model: target.model,
              contents,
              config,
            });
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
            if (attempt === 0 && isRetryableTransientError(err) && !clientAborted) {
              await sleep(500);
              continue;
            }
            throw err;
          }
        }

        if (!stream) {
          throw lastErr ?? new Error('Unable to open response stream.');
        }

        const collectedModelParts: Part[] = [];
        const pendingFunctionCalls: Array<{ id?: string; name: string; args: Record<string, unknown> }> = [];

        for await (const chunk of stream) {
          if (clientAborted) break;

          const candidate = chunk.candidates?.[0];
          const parts = candidate?.content?.parts ?? [];

          for (const part of parts) {
            collectedModelParts.push(part);

            const pAny = part as Part & { thought?: boolean };
            if (pAny.thought && typeof part.text === 'string' && part.text.length > 0) {
              sendEvent({ type: 'thought', text: part.text });
            } else if (typeof part.text === 'string' && part.text.length > 0) {
              sendEvent({ type: 'text', text: part.text });
            }

            if (part.functionCall && part.functionCall.name) {
              pendingFunctionCalls.push({
                id: part.functionCall.id,
                name: part.functionCall.name,
                args: (part.functionCall.args as Record<string, unknown>) ?? {},
              });
            }
          }

          const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
          if (Array.isArray(groundingChunks) && groundingChunks.length > 0) {
            const newSources: Array<{ title: string; uri: string }> = [];
            for (const gc of groundingChunks) {
              const uri = gc.web?.uri;
              if (uri && !seenSourceUris.has(uri)) {
                seenSourceUris.add(uri);
                newSources.push({
                  title: gc.web?.title || uri,
                  uri,
                });
              }
            }
            if (newSources.length > 0) {
              sendEvent({ type: 'grounding', sources: newSources });
            }
          }
        }

        if (clientAborted || pendingFunctionCalls.length === 0) {
          break;
        }

        contents.push({
          role: 'model',
          parts: collectedModelParts,
        });

        const functionResponseParts: Part[] = [];

        for (const call of pendingFunctionCalls) {
          const toolId = call.id || `${call.name}-${Date.now()}`;
          sendEvent({
            type: 'tool_call',
            id: toolId,
            name: call.name,
            args: call.args,
          });

          let toolOutput: Record<string, unknown>;

          if (call.name === 'plan_task_steps') {
            const goal = String(call.args.goal ?? 'Task Plan');
            const steps = Array.isArray(call.args.steps) ? call.args.steps : [];
            toolOutput = { status: 'presented_to_user', goal, stepCount: steps.length };
            sendEvent({
              type: 'task_plan',
              id: toolId,
              goal,
              steps,
            });
          } else if (call.name === 'propose_save_memory') {
            const fact = String(call.args.fact ?? '').trim();
            const category = String(call.args.category ?? 'preference');
            const reason = String(call.args.reason ?? '');
            sendEvent({
              type: 'permission_request',
              id: toolId,
              action: 'save_memory',
              fact,
              category,
              reason,
            });
            toolOutput = {
              status: 'awaiting_user_approval',
              message:
                'A permission prompt was shown to the user. Tell them briefly what you offered to remember and let them approve or decline it.',
            };
          } else if (call.name === 'search_local_memories') {
            const q = String(call.args.query ?? '').toLowerCase().trim();
            const matches = memories
              .filter(
                (m) =>
                  m.enabled &&
                  (!q || m.fact.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
              )
              .map((m) => ({ category: m.category, fact: m.fact }));
            toolOutput = { matches, count: matches.length };
          } else if (call.name === 'get_current_datetime') {
            const tz =
              typeof call.args.timezone === 'string' && call.args.timezone
                ? call.args.timezone
                : undefined;
            try {
              const now = new Date();
              const formatted = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                dateStyle: 'full',
                timeStyle: 'long',
              }).format(now);
              toolOutput = {
                iso: now.toISOString(),
                formatted,
                timezone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
              };
            } catch {
              const now = new Date();
              toolOutput = { iso: now.toISOString(), formatted: now.toUTCString(), timezone: 'UTC' };
            }
          } else if (call.name === 'calculate_math') {
            const expr = String(call.args.expression ?? '');
            try {
              const value = evaluateMathExpression(expr);
              toolOutput = { expression: expr, result: value };
            } catch (err) {
              toolOutput = {
                expression: expr,
                error: err instanceof Error ? err.message : 'Unable to evaluate expression',
              };
            }
          } else {
            toolOutput = { error: `Unknown tool: ${call.name}` };
          }

          sendEvent({
            type: 'tool_result',
            id: toolId,
            name: call.name,
            result: toolOutput,
          });

          functionResponseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name,
              response: toolOutput,
            },
          });
        }

        contents.push({
          role: 'user',
          parts: functionResponseParts,
        });
      }

      sendEvent({ type: 'done' });
      res.end();
    } catch (err) {
      const formatted = formatBackendError(err);
      sendEvent({
        type: 'error',
        code: formatted.code,
        message: formatted.message,
      });
      if (!res.writableEnded) {
        res.end();
      }
    } finally {
      clearInterval(heartbeat);
    }
  });

  // Audio Transcription Endpoint (Voice Input)
  app.post('/api/transcribe', async (req: Request, res: Response) => {
    const ai = getAIClient();
    if (!ai) {
      return res.status(503).json({
        code: 'CREDENTIALS_MISSING',
        message: 'Server AI credentials are not configured in Settings > Secrets.',
      });
    }

    const { audioBase64, mimeType } = req.body ?? {};
    if (typeof audioBase64 !== 'string' || !audioBase64) {
      return res.status(400).json({ code: 'INVALID_REQUEST', message: 'Audio data is required.' });
    }

    const safeMime =
      typeof mimeType === 'string' && mimeType.startsWith('audio/')
        ? mimeType.split(';')[0]
        : 'audio/webm';

    const transcribeWithModel = async (modelId: string) =>
      ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: safeMime,
                data: audioBase64,
              },
            },
            {
              text: 'Transcribe the spoken audio accurately into plain text. Return only the transcription without extra commentary.',
            },
          ],
        },
      });

    try {
      let response;
      try {
        response = await transcribeWithModel('gemini-3.5-transcribe');
      } catch (err) {
        const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
        if (msg.includes('404') || msg.includes('not_found')) {
          response = await transcribeWithModel('gemini-3.1-flash-lite');
        } else {
          throw err;
        }
      }

      return res.json({ text: (response.text ?? '').trim() });
    } catch (err) {
      const formatted = formatBackendError(err);
      return res.status(formatted.status).json(formatted);
    }
  });

  // Text-to-Speech Endpoint (Read Aloud — cleanly signals fallback if speech model unavailable)
  app.post('/api/tts', async (req: Request, res: Response) => {
    const ai = getAIClient();
    if (!ai) {
      return res.json({ available: false, reason: 'Credentials not configured.' });
    }

    const { text, voiceName } = req.body ?? {};
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ code: 'INVALID_REQUEST', message: 'Text is required for speech generation.' });
    }

    const allowedVoices = new Set(['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr']);
    const selectedVoice = typeof voiceName === 'string' && allowedVoices.has(voiceName) ? voiceName : 'Kore';

    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[#*_~>\[\]]/g, '')
      .slice(0, 3000)
      .trim();

    if (!cleanText) {
      return res.status(400).json({ code: 'EMPTY_TEXT', message: 'No speakable text found.' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text: cleanText }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.json({ available: false, reason: 'No audio stream returned.' });
      }

      return res.json({
        available: true,
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch {
      // Allow seamless client-side Web Speech API fallback
      return res.json({ available: false, reason: 'Using device speech synthesis.' });
    }
  });

  // Auto-title generator for new conversations
  app.post('/api/generate-title', async (req: Request, res: Response) => {
    const ai = getAIClient();
    if (!ai) {
      return res.json({ title: '' });
    }

    const { prompt } = req.body ?? {};
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.json({ title: '' });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: `Generate a crisp 3 to 5 word title summarizing this request. Return ONLY the title text, no quotes or punctuation at the end.\n\nRequest: ${prompt.slice(0, 400)}`,
      });
      const title = (response.text ?? '').replace(/["'*#]/g, '').trim().slice(0, 60);
      return res.json({ title });
    } catch {
      return res.json({ title: '' });
    }
  });

  if (!IS_PRODUCTION) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`PERSONAL AI server listening on http://0.0.0.0:${PORT}`);
  });
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 70_000;
  server.requestTimeout = 120_000;
}

startServer().catch((err) => {
  console.error('Failed to start PERSONAL AI server:', err);
  process.exit(1);
});
