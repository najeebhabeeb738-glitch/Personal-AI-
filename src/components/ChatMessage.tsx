import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileAudio,
  FileText,
  Globe,
  ListChecks,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Square,
  Volume2,
  Wrench,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { MarkdownRenderer } from './MarkdownRenderer';
import { formatFileSize, getAttachmentDataUrl } from '../utils/fileHelpers';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  isPlayingTts?: boolean;
  isLoadingTts?: boolean;
  canMutate?: boolean;
  onCopy: (text: string) => void;
  onRegenerate?: (messageId: string) => void;
  onEditResend?: (messageId: string, newContent: string) => void;
  onToggleTts?: (message: ChatMessageType) => void;
  onPermissionDecision?: (messageId: string, requestId: string, decision: 'approved' | 'declined') => void;
  onTogglePlanStep?: (messageId: string, planId: string, stepIndex: number) => void;
}

function formatTime(ts: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts));
}

const ChatMessageInner: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  isPlayingTts = false,
  isLoadingTts = false,
  canMutate = true,
  onCopy,
  onRegenerate,
  onEditResend,
  onToggleTts,
  onPermissionDecision,
  onTogglePlanStep,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(message.content);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const isUser = message.role === 'user';

  const handleCopyClick = () => {
    onCopy(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftContent.trim()) return;
    setIsEditing(false);
    onEditResend?.(message.id, draftContent.trim());
  };

  const hasActivity =
    Boolean(message.thoughtSummary) ||
    (message.toolCalls && message.toolCalls.length > 0) ||
    (message.groundingSources && message.groundingSources.length > 0);

  return (
    <article
      className={`animate-message-in group w-full py-4 sm:py-5 ${
        isUser ? 'flex justify-end' : 'flex justify-start'
      }`}
    >
      {isUser ? (
        <div className="max-w-[88%] sm:max-w-[78%] flex flex-col items-end gap-2">
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((att) => {
                const imgUrl = getAttachmentDataUrl(att);
                if (att.kind === 'image' && imgUrl) {
                  return (
                    <button
                      key={att.id}
                      type="button"
                      onClick={() => setLightboxSrc(imgUrl)}
                      className="block rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:opacity-95 active:scale-[0.98] transition-all"
                    >
                      <img
                        src={imgUrl}
                        alt={att.name}
                        referrerPolicy="no-referrer"
                        className="max-h-48 max-w-[220px] object-cover"
                      />
                    </button>
                  );
                }
                return (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-700 dark:text-zinc-300"
                  >
                    {att.kind === 'audio' ? (
                      <FileAudio className="w-4 h-4 text-zinc-500 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                    <span className="truncate max-w-[160px] font-medium">{att.name}</span>
                    <span className="text-zinc-400 font-mono tabular-nums">
                      {formatFileSize(att.size)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* User Message Body or Inline Editor */}
          {isEditing ? (
            <form
              onSubmit={handleSaveEdit}
              className="w-full min-w-[260px] sm:min-w-[380px] rounded-2xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 space-y-2.5"
            >
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={3}
                className="w-full resize-y bg-transparent text-base sm:text-[15px] text-zinc-950 dark:text-zinc-50 focus:outline-none"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDraftContent(message.content);
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 active:scale-[0.97] transition-transform"
                >
                  Save &amp; Resend
                </button>
              </div>
            </form>
          ) : (
            message.content.trim() && (
              <div className="px-4 py-3 rounded-2xl rounded-br-md bg-zinc-100 dark:bg-zinc-800/90 text-zinc-950 dark:text-zinc-50 text-[15px] leading-[1.6] whitespace-pre-wrap break-words">
                {message.content}
              </div>
            )
          )}

          {/* User Message Meta & Actions */}
          {!isEditing && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <span className="font-mono tabular-nums">{formatTime(message.createdAt)}</span>
              {canMutate && onEditResend && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftContent(message.content);
                    setIsEditing(true);
                  }}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                  aria-label="Edit and resend message"
                  title="Edit & resend"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleCopyClick}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                aria-label="Copy message"
                title="Copy"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Assistant Response */
        <div className="w-full flex items-start gap-3 sm:gap-4 min-w-0">
          <div className="shrink-0 mt-0.5">
            <BrandLogo size={28} />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            {/* Collapsible Agent Activity, Reasoning & Sources */}
            {hasActivity && (
              <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setActivityExpanded((v) => !v)}
                  className="w-full px-3 py-2 flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-zinc-500" />
                    <span>
                      Agent activity
                      {message.toolCalls && message.toolCalls.length > 0
                        ? ` · ${message.toolCalls.length} tool${message.toolCalls.length > 1 ? 's' : ''}`
                        : ''}
                      {message.groundingSources && message.groundingSources.length > 0
                        ? ` · ${message.groundingSources.length} source${message.groundingSources.length > 1 ? 's' : ''}`
                        : ''}
                    </span>
                  </span>
                  {activityExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                  )}
                </button>

                {activityExpanded && (
                  <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs">
                    {message.thoughtSummary && (
                      <div className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                        <div className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Reasoning trace
                        </div>
                        {message.thoughtSummary}
                      </div>
                    )}

                    {message.toolCalls && message.toolCalls.length > 0 && (
                      <div className="space-y-1.5">
                        {message.toolCalls.map((tc) => (
                          <div
                            key={tc.id}
                            className="p-2 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between gap-2"
                          >
                            <span className="font-mono text-[11px] text-zinc-800 dark:text-zinc-200 truncate">
                              {tc.name}
                            </span>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0">
                              {tc.status === 'completed' ? 'Completed' : 'Running'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {message.groundingSources && message.groundingSources.length > 0 && (
                      <div className="space-y-1">
                        <div className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5" />
                          <span>Verified web sources</span>
                        </div>
                        <ul className="space-y-1">
                          {message.groundingSources.map((src) => (
                            <li key={src.uri}>
                              <a
                                href={src.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline underline-offset-2 truncate block"
                              >
                                {src.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Structured Task Plans */}
            {message.taskPlans &&
              message.taskPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                    <ListChecks className="w-4 h-4 text-zinc-500 shrink-0" />
                    <span>{plan.goal}</span>
                  </div>
                  <div className="space-y-2">
                    {plan.steps.map((step, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onTogglePlanStep?.(message.id, plan.id, idx)}
                        className="w-full text-left p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex items-start gap-3"
                      >
                        <span
                          className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                            step.completed
                              ? 'bg-zinc-950 border-zinc-950 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950'
                              : 'border-zinc-300 dark:border-zinc-700'
                          }`}
                        >
                          {step.completed && <Check className="w-3 h-3" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div
                            className={`text-sm font-medium ${
                              step.completed
                                ? 'line-through text-zinc-400 dark:text-zinc-500'
                                : 'text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {idx + 1}. {step.title}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            {step.detail}
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 shrink-0">
                          {step.priority}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            {/* Permission Requests */}
            {message.permissionRequests &&
              message.permissionRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        Permission to remember preference
                      </div>
                      <p className="text-sm text-zinc-800 dark:text-zinc-200 mt-1">
                        “{req.fact}”
                      </p>
                      {req.reason && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {req.reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {req.decision === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onPermissionDecision?.(message.id, req.id, 'approved')}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 text-xs font-medium hover:opacity-90 active:scale-[0.97] transition-all"
                        >
                          Approve &amp; Save
                        </button>
                        <button
                          type="button"
                          onClick={() => onPermissionDecision?.(message.id, req.id, 'declined')}
                          className="min-h-[38px] px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-[0.97] transition-all"
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {req.decision === 'approved' ? 'Saved to local memories' : 'Declined'}
                      </span>
                    )}
                  </div>
                </div>
              ))}

            {/* Error State or Markdown Body */}
            {message.isError ? (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/70 bg-red-50/80 dark:bg-red-950/30 p-4 flex items-start gap-3 text-sm text-red-800 dark:text-red-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="leading-relaxed">{message.content}</p>
                  {canMutate && onRegenerate && (
                    <button
                      type="button"
                      onClick={() => onRegenerate(message.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900 text-white dark:bg-red-200 dark:text-red-950 text-xs font-medium hover:opacity-90 active:scale-[0.97] transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="min-h-[24px]">
                {message.content ? (
                  <MarkdownRenderer content={message.content} />
                ) : isStreaming ? (
                  <div className="flex items-center gap-2.5 text-sm text-zinc-500 dark:text-zinc-400 py-1">
                    <span className="flex items-center gap-1" aria-hidden="true">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-pulse [animation-delay:300ms]" />
                    </span>
                    <span className="text-xs font-medium tracking-wide">Thinking</span>
                  </div>
                ) : null}
                {isStreaming && message.content && (
                  <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-zinc-900 dark:bg-zinc-100 animate-pulse" />
                )}
              </div>
            )}

            {/* Quick Inline Sources Footer if grounding sources exist */}
            {!isStreaming && message.groundingSources && message.groundingSources.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                <span className="font-medium text-zinc-600 dark:text-zinc-300">Sources:</span>
                {message.groundingSources.slice(0, 4).map((src, i) => (
                  <a
                    key={src.uri}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-zinc-950 dark:hover:text-zinc-100 underline underline-offset-2 truncate max-w-[200px]"
                  >
                    {i + 1}. {src.title}
                  </a>
                ))}
              </div>
            )}

            {/* Assistant Actions Row */}
            {!isStreaming && !message.isError && message.content && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-zinc-400 dark:text-zinc-500">
                <button
                  type="button"
                  onClick={handleCopyClick}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 inline-flex items-center gap-1.5 active:scale-[0.97] transition-all"
                  aria-label="Copy response"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                {onToggleTts && (
                  <button
                    type="button"
                    onClick={() => onToggleTts(message)}
                    disabled={isLoadingTts}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 inline-flex items-center gap-1.5 active:scale-[0.97] transition-all disabled:opacity-50"
                    aria-label={isPlayingTts ? 'Stop reading aloud' : 'Read response aloud'}
                  >
                    {isPlayingTts ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop audio</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isLoadingTts ? 'Preparing audio...' : 'Read aloud'}</span>
                      </>
                    )}
                  </button>
                )}

                {canMutate && onRegenerate && (
                  <button
                    type="button"
                    onClick={() => onRegenerate(message.id)}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 inline-flex items-center gap-1.5 active:scale-[0.97] transition-all"
                    aria-label="Regenerate response"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                )}

                <span className="ml-auto font-mono text-[11px] tabular-nums">
                  {formatTime(message.createdAt)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Lightbox Modal */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxSrc}
            alt="Full preview"
            referrerPolicy="no-referrer"
            className="max-h-[90vh] max-w-[92vw] rounded-2xl object-contain"
          />
        </div>
      )}
    </article>
  );
};

export const ChatMessage = React.memo(ChatMessageInner);
