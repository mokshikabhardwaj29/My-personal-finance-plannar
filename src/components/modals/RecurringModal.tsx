import React, { useState } from 'react';
import { X } from 'lucide-react';
import { RecurringPayment, Subscription } from '../../types';
import { Penny } from '../Penny';

interface RecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  accounts: string[];
  initialItem?: RecurringPayment | null;
  onSave: (item: Partial<RecurringPayment>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  showPenny?: boolean;
}

export const RecurringModal: React.FC<RecurringModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  initialItem,
  onSave,
  onDelete,
  showPenny = true,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState<string>(initialItem?.name || '');
  const [category, setCategory] = useState<string>(initialItem?.category || 'Utilities');
  const [amount, setAmount] = useState<string>(initialItem?.amount ? String(initialItem.amount) : '');
  const [cadence, setCadence] = useState<'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'>(
    initialItem?.cadence || 'monthly'
  );
  const [nextDate, setNextDate] = useState<string>(initialItem?.nextDate || new Date().toISOString().slice(0, 10));
  const [account, setAccount] = useState<string>(initialItem?.account || accounts[0] || 'Main Checking');
  const [active, setActive] = useState<boolean>(initialItem ? initialItem.active : true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this recurring bill.');
      return;
    }
    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setError('Please enter a positive amount.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: initialItem?.id,
        name: name.trim(),
        category,
        amount: parsedAmt,
        cadence,
        nextDate,
        account,
        active,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save recurring item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recurring-modal-title"
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

        <h3 id="recurring-modal-title" className="text-xl font-bold text-gray-900 mb-1">
          {initialItem ? 'Edit Recurring Payment' : 'Add Recurring Payment'}
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Track rent, utilities, insurance, or scheduled loan payments.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Payment Name / Payee
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Electric Utility, Rent, Car Insurance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="120.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-lg font-bold px-3.5 py-2 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Cadence
              </label>
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value as any)}
                className="w-full text-sm font-medium px-3 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 outline-none bg-white"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm font-medium px-3 py-2 rounded-xl border border-gray-300 focus:border-violet-500 outline-none bg-white"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Next Expected Date
              </label>
              <input
                type="date"
                required
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full text-sm font-medium px-3 py-2 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 pt-1">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 text-violet-600 rounded border-gray-300 focus:ring-violet-500"
            />
            <span>Active recurring payment</span>
          </label>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {initialItem && onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Delete this recurring payment?')) {
                    await onDelete(initialItem.id);
                    onClose();
                  }
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
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
                {saving ? 'Saving...' : initialItem ? 'Update' : 'Save Recurring'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
