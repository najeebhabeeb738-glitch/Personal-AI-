import React, { useState } from 'react';
import { FolderKanban, MessageSquarePlus, Pencil, Plus, Trash2, Check, X } from 'lucide-react';
import type { Conversation, Project } from '../types';

interface ProjectsViewProps {
  projects: Project[];
  conversations: Conversation[];
  onCreateProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateProject: (id: string, updates: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onStartChatInProject: (projectId: string) => void;
  onSelectConversation: (conversationId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  conversations,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onStartChatInProject,
  onSelectConversation,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setInstructions('');
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      onUpdateProject(editingId, {
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
      });
    } else {
      onCreateProject({
        name: name.trim(),
        description: description.trim(),
        instructions: instructions.trim(),
      });
    }
    resetForm();
  };

  const startEdit = (proj: Project) => {
    setEditingId(proj.id);
    setName(proj.name);
    setDescription(proj.description);
    setInstructions(proj.instructions);
    setIsCreating(true);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Projects
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Group conversations with dedicated context and tailored system instructions.
            </p>
          </div>
          {!isCreating && (
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsCreating(true);
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 text-sm font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          )}
        </div>

        {isCreating && (
          <form
            onSubmit={handleSave}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/60 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {editingId ? 'Edit Project' : 'Create Project'}
              </h2>
              <button
                type="button"
                onClick={resetForm}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Product Strategy, TypeScript Refactor, Research Notes"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 dark:focus:ring-zinc-100/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short summary of what this workspace covers"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 dark:focus:ring-zinc-100/15"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Project Instructions
                </label>
                <textarea
                  rows={4}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Custom guidelines applied to every chat inside this project (tone, constraints, tech stack, output format)..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-950 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900/15 dark:focus:ring-zinc-100/15"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-xl bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 inline-flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Save Changes' : 'Create Project'}</span>
              </button>
            </div>
          </form>
        )}

        {projects.length === 0 && !isCreating ? (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 mx-auto flex items-center justify-center text-zinc-500">
              <FolderKanban className="w-5 h-5" />
            </div>
            <h2 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
              No projects created yet
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Create a project to keep related conversations together with shared instructions and domain context.
            </p>
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-2 min-h-[42px] px-4 py-2 rounded-xl bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => {
              const projConvs = conversations.filter((c) => c.projectId === proj.id);
              return (
                <div
                  key={proj.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base font-semibold text-zinc-950 dark:text-zinc-50">
                        {proj.name}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEdit(proj)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          aria-label={`Edit ${proj.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProject(proj.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          aria-label={`Delete ${proj.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {proj.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {proj.description}
                      </p>
                    )}
                    {proj.instructions && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 pt-1">
                        Instructions: {proj.instructions}
                      </p>
                    )}

                    {projConvs.length > 0 && (
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1">
                        <div className="text-[11px] font-medium text-zinc-400">
                          Recent in project · {projConvs.length}
                        </div>
                        {projConvs.slice(0, 3).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => onSelectConversation(c.id)}
                            className="w-full text-left text-xs text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white truncate py-1"
                          >
                            {c.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onStartChatInProject(proj.id)}
                    className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-zinc-100 inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                    <span>New Chat in Project</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
