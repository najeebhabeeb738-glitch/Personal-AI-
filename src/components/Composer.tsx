import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  FileAudio,
  FileText,
  Globe,
  ImagePlus,
  Mic,
  Paperclip,
  Square,
  Wrench,
  X,
} from 'lucide-react';
import { formatFileSize, processUploadedFile, readFileAsBase64 } from '../utils/fileHelpers';
import type { Attachment } from '../types';

interface ComposerProps {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  enableSearch: boolean;
  onToggleSearch: () => void;
  enableAgentTools: boolean;
  onToggleAgentTools: () => void;
  disabled?: boolean;
}

export const Composer: React.FC<ComposerProps> = ({
  onSend,
  onStop,
  isStreaming,
  enableSearch,
  onToggleSearch,
  enableAgentTools,
  onToggleAgentTools,
  disabled = false,
}) => {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Auto-resize textarea cleanly
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [text]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleFilesAdded = async (files: FileList | File[]) => {
    setErrorMsg(null);
    const list = Array.from(files);
    if (list.length === 0) return;

    const processed: Attachment[] = [];
    for (const f of list.slice(0, 8)) {
      try {
        const att = await processUploadedFile(f);
        processed.push(att);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to attach file.');
      }
    }
    if (processed.length > 0) {
      setAttachments((prev) => [...prev, ...processed].slice(0, 8));
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      void handleFilesAdded(files);
    }
  };

  const handleSubmit = () => {
    if (isStreaming || disabled) return;
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    onSend(trimmed, attachments);
    setText('');
    setAttachments([]);
    setErrorMsg(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const startRecording = async () => {
    setErrorMsg(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg('Microphone recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsRecording(false);
        setRecordSeconds(0);

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 200) return;

        setIsTranscribing(true);
        try {
          const base64 = await readFileAsBase64(blob);
          const resp = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64,
              mimeType: recorder.mimeType || 'audio/webm',
            }),
          });
          const data = await resp.json();
          if (!resp.ok) {
            throw new Error(data.message || 'Audio transcription failed.');
          }
          if (data.text) {
            setText((prev) => (prev ? `${prev.trim()} ${data.text}` : data.text));
            textareaRef.current?.focus();
          }
        } catch (err) {
          setErrorMsg(err instanceof Error ? err.message : 'Unable to transcribe audio.');
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMsg(
          'Microphone permission was denied. Allow microphone access in your browser site settings to use voice input.'
        );
      } else if (name === 'NotFoundError') {
        setErrorMsg('No microphone device was found on this system.');
      } else {
        setErrorMsg('Could not start voice recording. Check microphone permissions.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isStreaming && !disabled;

  return (
    <div
      className="w-full max-w-3xl mx-auto px-3 sm:px-5 pb-safe pt-2"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
          void handleFilesAdded(e.dataTransfer.files);
        }
      }}
    >
      {errorMsg && (
        <div className="animate-panel-pop mb-2 px-3.5 py-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300 flex items-center justify-between gap-2">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="p-1 hover:opacity-75"
            aria-label="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div
        className={`rounded-3xl border transition-all duration-150 bg-zinc-50/90 dark:bg-zinc-900/90 backdrop-blur-md ${
          isDragging
            ? 'border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900/10 dark:ring-zinc-100/10'
            : 'border-zinc-200 dark:border-zinc-800 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 focus-within:bg-white dark:focus-within:bg-zinc-900'
        }`}
      >
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="px-3.5 pt-3 flex flex-wrap gap-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="animate-panel-pop relative group flex items-center gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-1.5 pr-7 max-w-[220px]"
              >
                {att.kind === 'image' && att.previewUrl ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0">
                    {att.kind === 'audio' ? (
                      <FileAudio className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                    {att.name}
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-zinc-400">
                    {formatFileSize(att.size)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center hover:opacity-80 active:scale-[0.92]"
                  aria-label={`Remove ${att.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea — always stays interactive during streaming so users can compose follow-ups */}
        <div className="px-4 pt-3 pb-1.5">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isRecording
                ? `Listening (${recordSeconds}s)... tap stop to transcribe`
                : isTranscribing
                ? 'Transcribing voice input...'
                : 'Message PERSONAL AI...'
            }
            rows={1}
            disabled={isRecording || isTranscribing}
            className="w-full resize-none bg-transparent text-[16px] sm:text-[15px] leading-relaxed text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none max-h-[200px]"
          />
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFilesAdded(e.target.files);
            e.target.value = '';
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,audio/*,.txt,.md,.csv,.json,.ts,.tsx,.js,.jsx,.py,.html,.css,.sql,.yaml,.yml"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void handleFilesAdded(e.target.files);
            e.target.value = '';
          }}
        />

        {/* Composer Toolbar */}
        <div className="px-2.5 pb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-[0.95]"
              aria-label="Attach images"
              title="Attach images"
            >
              <ImagePlus className="w-[18px] h-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800 transition-all active:scale-[0.95]"
              aria-label="Attach files or PDF"
              title="Attach PDF, document, or file"
            >
              <Paperclip className="w-[18px] h-[18px]" />
            </button>

            <button
              type="button"
              onClick={onToggleSearch}
              className={`min-h-[36px] px-2.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-all active:scale-[0.96] whitespace-nowrap ${
                enableSearch
                  ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800'
              }`}
              aria-pressed={enableSearch}
              title="Toggle web search"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </button>

            <button
              type="button"
              onClick={onToggleAgentTools}
              className={`min-h-[36px] px-2.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-all active:scale-[0.96] whitespace-nowrap ${
                enableAgentTools
                  ? 'bg-zinc-200/90 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-500 hover:text-zinc-950 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800'
              }`}
              aria-pressed={enableAgentTools}
              title="Toggle agent planning & tools"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Agent</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Voice Input */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing || isStreaming}
              className={`min-h-[42px] min-w-[42px] px-2.5 flex items-center justify-center gap-1.5 rounded-full transition-all active:scale-[0.95] ${
                isRecording
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/70 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800'
              } disabled:opacity-40`}
              aria-label={isRecording ? 'Stop voice recording' : 'Start voice input'}
              title={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs font-mono tabular-nums">{recordSeconds}s</span>
                </>
              ) : (
                <Mic className="w-[18px] h-[18px]" />
              )}
            </button>

            {/* Send / Stop Generation */}
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 transition-all active:scale-[0.94]"
                aria-label="Stop generation"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSend}
                className="min-h-[42px] min-w-[42px] flex items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 hover:opacity-90 transition-all active:scale-[0.94] disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Send message"
                title="Send message"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        Conversations and memories stay privately in this browser. AI responses can make mistakes.
      </p>
    </div>
  );
};
