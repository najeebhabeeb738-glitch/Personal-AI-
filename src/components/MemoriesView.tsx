import React, { useMemo, useState } from 'react';
import { Brain, Check, Pencil, Plus, Search, Shield, Trash2, X } from 'lucide-react';
import type { MemoryItem } from '../types';

interface MemoriesViewProps {
  memories: MemoryItem[];
  memoryEnabled: boolean;
  onToggleGlobalMemory: () => void;
  onAddMemory: (fact: string, category: MemoryItem['category']) => void;
  onUpdateMemory: (id: string, updates: Partial<MemoryItem>) => void;
  onDeleteMemory: (id: string) => void;
}

export const MemoriesView: React.FC<MemoriesViewProps> = ({
  memories,
  memoryEnabled,
  onToggleGlobalMemory,
  onAddMemory,
  onUpdateMemory,
  onDeleteMemory,
}) => {
  const [query, setQuery] = useState('');
  const [newFact, setNewFact] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('preference');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFact, setEditFact] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...memories].sort((a, b) => b.createdAt - a.createdAt);
    if (!q) return sorted;
    return sorted.filter(
      (m) => m.fact.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    );
  }, [memories, query]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    onAddMemory(newFact.trim(), newCategory);
    setNewFact('');
  };

  const handleSaveEdit = (id: string) => {
    if (editFact.trim()) {
      onUpdateMemory(id, { fact: editFact.trim() });
    }
    setEditingId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Saved Memories
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Private preferences and context stored locally in this browser—never synced externally.
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleGlobalMemory}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap ${
              memoryEnabled
                ? 'border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950'
                : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Memory Context: {memoryEnabled ? 'Active' : 'Paused'}
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-4 flex items-start gap-3 text-xs text-zinc-600 dark:text-zinc-400">
          <Shield className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            PERSONAL AI always asks for your permission before saving new memories from a conversation. You can edit, pause, or delete any entry below at any time.
          </p>
        </div>

        {/* Add Memory Form */}
        <form
          onSubmit={handleAdd}
          className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 space-y-3"
        >
          <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Add a memory manually
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as MemoryItem['category'])}
              className="min-h-[42px] px-3 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none"
              aria-label="Memory category"
            >
              <option value="preference">Preference</option>
              <option value="context">Context</option>
              <option value="workflow">Workflow</option>
              <option value="goal">Goal</option>
            </select>
            <input
              type="text"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder="e.g., Prefer concise TypeScript examples with strict types"
              className="flex-1 min-h-[42px] px-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 dark:focus:ring-zinc-100/15"
            />
            <button
              type="submit"
              disabled={!newFact.trim()}
              className="min-h-[42px] px-4 rounded-xl bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 text-sm font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-35"
            >
              <Plus className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </form>

        {/* Search Memories */}
        {memories.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved memories..."
              className="w-full min-h-[40px] pl-10 pr-3.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            />
          </div>
        )}

        {/* Memories List */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 mx-auto flex items-center justify-center text-zinc-500">
              <Brain className="w-5 h-5" />
            </div>
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
              {memories.length === 0 ? 'No saved memories yet' : 'No matching memories'}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Add preferences above or approve suggestions when PERSONAL AI offers to remember helpful details.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
            {filtered.map((mem) => (
              <div key={mem.id} className="p-4 flex items-start justify-between gap-3">
                {editingId === mem.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editFact}
                      onChange={(e) => setEditFact(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(mem.id)}
                      className="p-2 rounded-lg bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                      aria-label="Save memory"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      aria-label="Cancel edit"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p
                        className={`text-sm leading-relaxed ${
                          mem.enabled
                            ? 'text-zinc-900 dark:text-zinc-100'
                            : 'text-zinc-400 dark:text-zinc-500 line-through'
                        }`}
                      >
                        {mem.fact}
                      </p>
                      <div className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-2 capitalize">
                        <span>{mem.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{new Date(mem.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onUpdateMemory(mem.id, { enabled: !mem.enabled })}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        {mem.enabled ? 'Active' : 'Paused'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(mem.id);
                          setEditFact(mem.fact);
                        }}
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                        aria-label="Edit memory"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMemory(mem.id)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                        aria-label="Delete memory"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
