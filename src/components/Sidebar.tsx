import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Images,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { Conversation, SidebarTab } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  activeTab: SidebarTab;
  onChangeTab: (tab: SidebarTab) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameConversation: (id: string, title: string) => void;
  onArchiveConversation: (id: string, archived: boolean) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  userName: string;
  memoryCount: number;
  projectCount: number;
}

function groupConversationsByDate(list: Conversation[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;
  const startOfWeek = startOfToday - 7 * 86_400_000;

  const groups: Array<{ label: string; items: Conversation[] }> = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 Days', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const conv of list) {
    if (conv.updatedAt >= startOfToday) groups[0].items.push(conv);
    else if (conv.updatedAt >= startOfYesterday) groups[1].items.push(conv);
    else if (conv.updatedAt >= startOfWeek) groups[2].items.push(conv);
    else groups[3].items.push(conv);
  }

  return groups.filter((g) => g.items.length > 0);
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onCloseMobile,
  activeTab,
  onChangeTab,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onArchiveConversation,
  onDeleteConversation,
  onOpenSettings,
  userName,
  memoryCount,
  projectCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const { activeConversations, archivedConversations } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    const matching = !q
      ? sorted
      : sorted.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.messages.some((m) => m.content.toLowerCase().includes(q))
        );

    return {
      activeConversations: matching.filter((c) => !c.archived),
      archivedConversations: matching.filter((c) => Boolean(c.archived)),
    };
  }, [conversations, searchQuery]);

  const grouped = useMemo(
    () => groupConversationsByDate(activeConversations),
    [activeConversations]
  );

  const navItems: Array<{ id: SidebarTab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'chats', label: 'Chats', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'projects', label: 'Projects', icon: <FolderKanban className="w-4 h-4" />, count: projectCount },
    { id: 'library', label: 'Library', icon: <Images className="w-4 h-4" /> },
    { id: 'memories', label: 'Memories', icon: <Brain className="w-4 h-4" />, count: memoryCount },
  ];

  const handleStartEdit = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const renderConversationRow = (conv: Conversation) => {
    const isActive = activeTab === 'chats' && conv.id === activeConversationId;
    const isEditing = editingId === conv.id;

    if (isEditing) {
      return (
        <form
          key={conv.id}
          onSubmit={(e) => handleSaveEdit(e, conv.id)}
          className="flex items-center gap-1 px-1.5 py-1"
        >
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="flex-1 min-w-0 px-2 py-1 text-base sm:text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="p-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            aria-label="Save title"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </form>
      );
    }

    return (
      <div
        key={conv.id}
        className={`group relative flex items-center rounded-xl transition-colors ${
          isActive
            ? 'bg-zinc-200/75 dark:bg-zinc-800/90 text-zinc-950 dark:text-zinc-50'
            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/45 dark:hover:bg-zinc-900'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            onChangeTab('chats');
            onSelectConversation(conv.id);
            onCloseMobile();
          }}
          className="flex-1 min-w-0 text-left px-2.5 py-2.5 text-[13px] truncate"
          title={conv.title}
        >
          {conv.title}
        </button>
        <div className="flex items-center pr-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {!conv.archived && (
            <button
              type="button"
              onClick={(e) => handleStartEdit(e, conv)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              aria-label={`Rename ${conv.title}`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onArchiveConversation(conv.id, !conv.archived);
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            aria-label={conv.archived ? `Unarchive ${conv.title}` : `Archive ${conv.title}`}
            title={conv.archived ? 'Unarchive' : 'Archive'}
          >
            {conv.archived ? (
              <ArchiveRestore className="w-3.5 h-3.5" />
            ) : (
              <Archive className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteConversation(conv.id);
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
            aria-label={`Delete ${conv.title}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full w-[280px] bg-zinc-50/95 dark:bg-zinc-950 border-r border-zinc-200/80 dark:border-zinc-800/80 select-none">
      {/* Drawer Header */}
      <div className="p-3.5 pt-safe flex items-center justify-between gap-2 border-b border-zinc-200/60 dark:border-zinc-800/60 lg:border-b-0">
        <div className="flex items-center gap-2 lg:hidden">
          <BrandLogo size={24} />
          <span className="font-display font-semibold text-sm tracking-tight text-zinc-950 dark:text-zinc-50">
            PERSONAL AI
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            onNewChat();
            onChangeTab('chats');
            onCloseMobile();
          }}
          className="flex-1 hidden lg:flex items-center justify-center gap-2 min-h-[42px] px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950 text-sm font-medium active:scale-[0.98] transition-all whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 active:scale-[0.97] transition-all"
          aria-label="Close navigation drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile New Chat */}
      <div className="px-3.5 pt-3 lg:hidden">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onChangeTab('chats');
            onCloseMobile();
          }}
          className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 text-sm font-medium active:scale-[0.98] transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-3.5 pt-3 pb-2">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations"
            className="w-full min-h-[40px] pl-9 pr-3 text-base sm:text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 dark:focus:ring-zinc-100/15"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="px-2.5 py-1.5 space-y-0.5" aria-label="Workspace sections">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChangeTab(item.id);
                if (item.id !== 'chats') {
                  onCloseMobile();
                }
              }}
              className={`w-full min-h-[42px] px-3 rounded-xl flex items-center justify-between text-sm font-medium active:scale-[0.98] transition-all ${
                active
                  ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {item.icon}
                <span>{item.label}</span>
              </span>
              {typeof item.count === 'number' && item.count > 0 && (
                <span className="text-xs font-mono tabular-nums text-zinc-400 dark:text-zinc-500">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Conversations List + Collapsible Archive */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2 mt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
        {grouped.length === 0 && archivedConversations.length === 0 ? (
          <div className="px-3 py-6 text-xs text-zinc-400 dark:text-zinc-500 text-center">
            {searchQuery ? 'No matching conversations' : 'No conversations yet'}
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="px-2.5 pb-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                  {group.label}
                </div>
                <div className="space-y-0.5">{group.items.map(renderConversationRow)}</div>
              </div>
            ))}

            {archivedConversations.length > 0 && (
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setShowArchived((v) => !v)}
                  className="w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11px] font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archived ({archivedConversations.length})</span>
                  </span>
                  {showArchived ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                {showArchived && (
                  <div className="mt-1 space-y-0.5">
                    {archivedConversations.map(renderConversationRow)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Settings Bar */}
      <div className="p-2.5 pb-safe border-t border-zinc-200/80 dark:border-zinc-800/80">
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            onCloseMobile();
          }}
          className="w-full min-h-[44px] px-3 rounded-xl flex items-center justify-between hover:bg-zinc-200/60 dark:hover:bg-zinc-900 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center text-xs font-semibold shrink-0">
              {userName ? userName.trim().charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {userName || 'Personal Workspace'}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                Local private storage
              </div>
            </div>
          </div>
          <Settings className="w-4 h-4 text-zinc-500 shrink-0" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 transition-[width] duration-200 ease-out overflow-hidden ${
          isOpen ? 'w-[280px]' : 'w-0'
        }`}
      >
        <div className="h-full w-[280px]">{sidebarContent}</div>
      </aside>

      {/* Mobile Slide-Out Glass Drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden flex transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isOpen}
      >
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
        <div
          className={`relative z-10 h-full shadow-2xl transition-transform duration-200 ease-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    </>
  );
};
