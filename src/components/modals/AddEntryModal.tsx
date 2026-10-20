import React, { useState } from 'react';
import { X, Check, Paperclip, Tag as TagIcon, Sparkles } from 'lucide-react';
import { Penny } from '../Penny';
import { Transaction, GameDelta } from '../../types';

interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  accounts: string[];
  allTags: string[];
  onSave: (tx: Partial<Transaction>, receiptFile?: File) => Promise<GameDelta | null>;
  showPenny?: boolean;
}

export const AddEntryModal: React.FC<AddEntryModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  allTags,
  onSave,
  showPenny = true,
}) => {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState<string>('');
  const [merchant, setMerchant] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<string>(categories[0] || 'Needs review');
  const [account, setAccount] = useState<string>(accounts[0] || 'Main Checking');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [hasReceipt, setHasReceipt] = useState<boolean>(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDelta, setSuccessDelta] = useState<GameDelta | null>(null);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setNewTagInput('');
    }
  };

  const handleToggleTag = (t: string) => {
    if (selectedTags.includes(t)) {
      setSelectedTags(selectedTags.filter((x) => x !== t));
    } else {
      setSelectedTags([...selectedTags, t]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (!merchant.trim()) {
      setError('Please enter a merchant or source name.');
      return;
    }

    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    setSaving(true);
    try {
      const delta = await onSave(
        {
          type,
          amount: parsedAmount,
          merchant: merchant.trim(),
          date,
          category,
          account,
          tags: selectedTags,
          receipt: hasReceipt && receiptFile ? 1 : 0,
          source: 'manual',
        },
        hasReceipt && receiptFile ? receiptFile : undefined
      );

      if (delta && delta.xpAwarded > 0) {
        setSuccessDelta(delta);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save transaction';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-entry-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-100 relative my-8">
        {/* Penny Mascot Badge in corner */}
        <div className="absolute top-4 right-14">
          <Penny
            mood={successDelta ? 'celebrate' : saving ? 'thinking' : error ? 'concerned' : 'idle'}
            size={36}
            showSpeech={false}
            enabled={showPenny}
          />
        </div>

        <button
          onClick={onClose}
          disabled={saving}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 id="add-entry-title" className="text-xl font-bold text-gray-900 mb-5">
          Add New Entry
        </h3>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {successDelta && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Saved! Earned +{successDelta.xpAwarded} XP!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Segmented Expense / Income selection */}
          <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2 text-sm font-bold rounded-lg transition ${
                type === 'expense'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2 text-sm font-bold rounded-lg transition ${
                type === 'income'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount (initially blank) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full text-2xl font-black text-gray-900 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>

          {/* Merchant or Source (initially blank) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              {type === 'expense' ? 'Merchant / Payee' : 'Income Source'}
            </label>
            <input
              type="text"
              required
              placeholder={type === 'expense' ? 'e.g. Trader Joe\'s, Coffee Shop' : 'e.g. Employer, Client, Refund'}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>

          {/* Date & Account row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Account
              </label>
              <select
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none bg-white"
              >
                {accounts.length > 0 ? (
                  accounts.map((acc) => (
                    <option key={acc} value={acc}>
                      {acc}
                    </option>
                  ))
                ) : (
                  <option value="Main Checking">Main Checking</option>
                )}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none bg-white"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto">
              {allTags.map((t) => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToggleTag(t)}
                    className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition ${
                      isSelected
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>#{t}</span>
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
            {/* Simple new tag input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom tag (e.g. coffee, tax-deductible)"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200 focus:border-violet-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 text-xs font-bold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                Add Tag
              </button>
            </div>
          </div>

          {/* Receipt attachment option */}
          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={hasReceipt}
                onChange={(e) => setHasReceipt(e.target.checked)}
                className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
              />
              <span>I have a receipt to attach (+5 XP)</span>
            </label>

            {hasReceipt && (
              <div className="mt-3 p-3 bg-violet-50/60 rounded-xl border border-violet-100">
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Upload Receipt Image or PDF (Max 20 MB)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReceiptFile(e.target.files[0]);
                    }
                  }}
                  className="text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer"
                />
                {receiptFile && (
                  <p className="text-xs text-violet-700 mt-1 truncate">
                    Selected: {receiptFile.name} ({(receiptFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-violet-600 text-white hover:bg-violet-700 transition shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
