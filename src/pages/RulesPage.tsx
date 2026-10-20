import React, { useState } from 'react';
import { Sliders, Plus, Tag as TagIcon, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Rule, Tag, Transaction, GameState } from '../types';
import { Penny } from '../components/Penny';

interface RulesPageProps {
  rules: Rule[];
  tags: Tag[];
  transactions: Transaction[];
  game: GameState;
  onOpenCreateRule: () => void;
  onToggleRule: (id: string, enabled: boolean) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  onCreateTag: (name: string) => Promise<void>;
  onDeleteTag: (name: string) => Promise<void>;
}

export const RulesPage: React.FC<RulesPageProps> = ({
  rules,
  tags,
  transactions,
  game,
  onOpenCreateRule,
  onToggleRule,
  onDeleteRule,
  onCreateTag,
  onDeleteTag,
}) => {
  const [newTagName, setNewTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);

  // Compute tag usage counts from transactions
  const tagCounts: Record<string, number> = {};
  for (const tx of transactions) {
    if (tx.tags) {
      for (const t of tx.tags) {
        const norm = t.toLowerCase();
        tagCounts[norm] = (tagCounts[norm] || 0) + 1;
      }
    }
  }

  const handleCreateTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagName.trim();
    if (!clean) return;
    setCreatingTag(true);
    setTagError(null);
    try {
      await onCreateTag(clean);
      setNewTagName('');
    } catch (err: unknown) {
      setTagError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setCreatingTag(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Categorization Rules Section (Section 17.1) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-violet-600" />
              <span>Categorization Rules</span>
            </h1>
            <p className="text-xs text-gray-500">
              Automatically sort incoming entries and Drive syncs when merchant description matches keyword.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateRule}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Rule (+10 XP)</span>
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center">
            <Penny mood="curious" size={48} showSpeech={false} enabled={game.profile?.showPenny} />
            <p className="mt-2 font-bold text-gray-700">No categorization rules defined yet.</p>
            <p className="text-[11px] text-gray-400 mt-0.5 mb-3">
              Define rules to automatically tag or categorize frequent merchants.
            </p>
            <button
              type="button"
              onClick={onOpenCreateRule}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-xs"
            >
              Create First Rule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="py-3.5 flex items-center justify-between gap-4 text-xs hover:bg-gray-50 px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={rule.enabled === 1}
                    onChange={(e) => onToggleRule(rule.id, e.target.checked)}
                    className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500 cursor-pointer"
                    title={rule.enabled === 1 ? 'Disable rule' : 'Enable rule'}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      When merchant contains <strong className="text-violet-700">&quot;{rule.whenText}&quot;</strong>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Then assign: <span className="font-bold text-gray-700">{rule.thenText}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Delete rule for "${rule.whenText}"?`)) {
                      await onDeleteRule(rule.id);
                    }
                  }}
                  className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
                  title="Delete rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Tag Management Section (Section 17.2) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-violet-600" />
            <span>Tag Management</span>
          </h2>
          <p className="text-xs text-gray-500">
            Manage tags used across your transactions. Adding a tag requires only its name (never a category).
          </p>
        </div>

        {tagError && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {tagError}
          </div>
        )}

        {/* Create Tag Form */}
        <form onSubmit={handleCreateTagSubmit} className="flex gap-2 max-w-md">
          <input
            type="text"
            required
            placeholder="Tag name (e.g. tax-deductible, vacation)"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
          />
          <button
            type="submit"
            disabled={creatingTag}
            className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition shadow disabled:opacity-50"
          >
            {creatingTag ? 'Adding...' : 'Create Tag'}
          </button>
        </form>

        {/* Tags List with usage counts */}
        <div className="pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Existing Tags ({tags.length})
          </p>

          {tags.length === 0 ? (
            <p className="text-xs text-gray-400 py-3">No tags created yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const count = tagCounts[t.name.toLowerCase()] || 0;
                return (
                  <div
                    key={t.name}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 text-violet-800 text-xs font-semibold border border-violet-100"
                  >
                    <span>#{t.name}</span>
                    <span className="text-[10px] text-violet-500 bg-violet-200/60 px-1.5 py-0.2 rounded-full">
                      {count}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Delete tag definition #${t.name}?`)) {
                          await onDeleteTag(t.name);
                        }
                      }}
                      className="text-violet-400 hover:text-red-600 rounded-full"
                      title="Delete tag"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
