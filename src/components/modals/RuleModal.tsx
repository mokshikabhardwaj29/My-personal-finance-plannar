import React, { useState } from 'react';
import { X, Sliders } from 'lucide-react';
import { Rule } from '../../types';
import { Penny } from '../Penny';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  initialRule?: Rule | null;
  onSave: (rule: Partial<Rule>) => Promise<void>;
  showPenny?: boolean;
}

export const RuleModal: React.FC<RuleModalProps> = ({
  isOpen,
  onClose,
  categories,
  initialRule,
  onSave,
  showPenny = true,
}) => {
  if (!isOpen) return null;

  const [whenText, setWhenText] = useState<string>(initialRule?.whenText || '');
  const [thenType, setThenType] = useState<'category' | 'tag'>('category');
  const [targetCategory, setTargetCategory] = useState<string>(categories[0] || 'Groceries');
  const [targetTag, setTargetTag] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(initialRule ? initialRule.enabled === 1 : true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whenText.trim()) {
      setError('Please provide a "When merchant contains" keyword.');
      return;
    }

    const thenText = thenType === 'category' ? targetCategory : `tag: ${targetTag.trim().replace(/^#/, '')}`;
    if (thenType === 'tag' && !targetTag.trim()) {
      setError('Please enter a target tag name.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: initialRule?.id,
        whenText: whenText.trim(),
        thenText,
        enabled: enabled ? 1 : 0,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-gray-100 relative">
        <div className="absolute top-4 right-14">
          <Penny mood={saving ? 'thinking' : 'idle'} size={34} showSpeech={false} enabled={showPenny} />
        </div>

        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 id="rule-modal-title" className="text-xl font-bold text-gray-900 mb-1">
          {initialRule ? 'Edit Categorization Rule' : 'Create Categorization Rule'}
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Automatically assign category or tag when future entries or Drive syncs match keyword (+10 XP).
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              When merchant / description contains
            </label>
            <input
              type="text"
              required
              placeholder="e.g. starbucks, shell, kroger"
              value={whenText}
              onChange={(e) => setWhenText(e.target.value)}
              className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Then assign
            </label>
            <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => setThenType('category')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  thenType === 'category' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600'
                }`}
              >
                Category
              </button>
              <button
                type="button"
                onClick={() => setThenType('tag')}
                className={`py-1.5 text-xs font-bold rounded-lg transition ${
                  thenType === 'tag' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-600'
                }`}
              >
                Tag
              </button>
            </div>

            {thenType === 'category' ? (
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value)}
                className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 outline-none bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Tag name (e.g. coffee, commuting)"
                value={targetTag}
                onChange={(e) => setTargetTag(e.target.value)}
                className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
              />
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 pt-1">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
            />
            <span>Rule is enabled</span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition shadow disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
