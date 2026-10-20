import React, { useState } from 'react';
import { X, Check, Tag as TagIcon, Plus } from 'lucide-react';
import { Transaction } from '../../types';

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  allAvailableTags: string[];
  onSaveTags: (txId: string, tags: string[]) => Promise<void>;
}

export const TagModal: React.FC<TagModalProps> = ({
  isOpen,
  onClose,
  transaction,
  allAvailableTags,
  onSaveTags,
}) => {
  if (!isOpen || !transaction) return null;

  const [currentTags, setCurrentTags] = useState<string[]>(transaction.tags || []);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleToggleTag = (tag: string) => {
    if (currentTags.includes(tag)) {
      setCurrentTags(currentTags.filter((t) => t !== tag));
    } else {
      setCurrentTags([...currentTags, tag]);
    }
  };

  const handleCreateTag = () => {
    const clean = newTagInput.trim();
    if (clean && !currentTags.includes(clean)) {
      setCurrentTags([...currentTags, clean]);
      setNewTagInput('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveTags(transaction.id, currentTags);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <TagIcon className="w-5 h-5 text-violet-600" />
          <h3 id="tag-modal-title" className="text-lg font-bold text-gray-900">
            Edit Tags
          </h3>
        </div>
        <p className="text-xs text-gray-500 mb-4 truncate">
          Transaction: <span className="font-semibold text-gray-800">{transaction.merchant}</span> (${transaction.amount.toFixed(2)})
        </p>

        {/* Existing Tags Pill Selector */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Available Tags
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
            {allAvailableTags.length > 0 ? (
              allAvailableTags.map((t) => {
                const isSelected = currentTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToggleTag(t)}
                    className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition ${
                      isSelected
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>#{t}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-gray-400">No existing tags yet. Create one below!</p>
            )}
          </div>
        </div>

        {/* Create simple new tag (name only, NO category required as specified in Section 8.2) */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
            Create New Tag
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tag name (e.g. tax-deductible)"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateTag();
                }
              }}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
            />
            <button
              type="button"
              onClick={handleCreateTag}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-violet-100 text-violet-700 hover:bg-violet-200 transition"
            >
              Add
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition shadow disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Tags'}
          </button>
        </div>
      </div>
    </div>
  );
};
