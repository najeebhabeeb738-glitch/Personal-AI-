import React, { useMemo, useState } from 'react';
import { FileAudio, FileText, Images, ArrowUpRight, Search } from 'lucide-react';
import { formatFileSize, getAttachmentDataUrl } from '../utils/fileHelpers';
import type { Attachment, Conversation } from '../types';

interface LibraryViewProps {
  conversations: Conversation[];
  onOpenConversation: (id: string) => void;
}

interface LibraryItem {
  attachment: Attachment;
  conversationId: string;
  conversationTitle: string;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ conversations, onOpenConversation }) => {
  const [filter, setFilter] = useState<'all' | 'image' | 'document'>('all');
  const [query, setQuery] = useState('');

  const items = useMemo<LibraryItem[]>(() => {
    const collected: LibraryItem[] = [];
    for (const conv of conversations) {
      for (const msg of conv.messages) {
        if (!msg.attachments) continue;
        for (const att of msg.attachments) {
          collected.push({
            attachment: att,
            conversationId: conv.id,
            conversationTitle: conv.title,
          });
        }
      }
    }
    return collected.sort((a, b) => b.attachment.createdAt - a.attachment.createdAt);
  }, [conversations]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(({ attachment, conversationTitle }) => {
      if (filter === 'image' && attachment.kind !== 'image') return false;
      if (filter === 'document' && attachment.kind === 'image') return false;
      if (!q) return true;
      return (
        attachment.name.toLowerCase().includes(q) ||
        conversationTitle.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Library
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Images, PDFs, audio recordings, and documents shared across your conversations.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 self-start">
            {(['all', 'image', 'document'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                  filter === tab
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {tab === 'all' ? 'All Files' : tab === 'image' ? 'Images' : 'Documents & Audio'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter files..."
              className="w-full min-h-[38px] pl-9 pr-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 mx-auto flex items-center justify-center text-zinc-500">
              <Images className="w-5 h-5" />
            </div>
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {items.length === 0 ? 'Your library is empty' : 'No matching files'}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Upload images, PDFs, or code files in any chat to inspect and organize them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map(({ attachment, conversationId, conversationTitle }) => {
              const imgUrl = getAttachmentDataUrl(attachment);
              return (
                <button
                  key={attachment.id}
                  type="button"
                  onClick={() => onOpenConversation(conversationId)}
                  className="text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex flex-col"
                >
                  {attachment.kind === 'image' && imgUrl ? (
                    <div className="h-40 w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                      <img
                        src={imgUrl}
                        alt={attachment.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-28 w-full bg-zinc-50 dark:bg-zinc-900/70 flex items-center justify-center text-zinc-400">
                      {attachment.kind === 'audio' ? (
                        <FileAudio className="w-8 h-8" />
                      ) : (
                        <FileText className="w-8 h-8" />
                      )}
                    </div>
                  )}

                  <div className="p-3.5 space-y-1 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {attachment.name}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5 font-mono tabular-nums">
                        <span>{formatFileSize(attachment.size)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="uppercase">{attachment.kind}</span>
                      </div>
                    </div>
                    <div className="pt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="truncate">{conversationTitle}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
