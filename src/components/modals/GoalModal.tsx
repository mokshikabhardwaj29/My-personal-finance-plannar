import React, { useState } from 'react';
import { X, Target } from 'lucide-react';
import { Goal } from '../../types';
import { Penny } from '../Penny';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGoal?: Goal | null;
  onSave: (goal: Partial<Goal>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  showPenny?: boolean;
}

export const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  initialGoal,
  onSave,
  onDelete,
  showPenny = true,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState<string>(initialGoal?.name || '');
  const [target, setTarget] = useState<string>(initialGoal?.target ? String(initialGoal.target) : '');
  const [current, setCurrent] = useState<string>(initialGoal?.current !== undefined ? String(initialGoal.current) : '0');
  const [dueDate, setDueDate] = useState<string>(initialGoal?.dueDate || '');
  const [note, setNote] = useState<string>(initialGoal?.note || '');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a goal name.');
      return;
    }
    const parsedTarget = parseFloat(target);
    const parsedCurrent = parseFloat(current) || 0;
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      setError('Target amount must be a positive number.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: initialGoal?.id,
        name: name.trim(),
        target: parsedTarget,
        current: Math.max(0, parsedCurrent),
        dueDate: dueDate || undefined,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-modal-title"
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

        <h3 id="goal-modal-title" className="text-xl font-bold text-gray-900 mb-1">
          {initialGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Save toward emergency funds, travel, or big milestones (+15 XP).
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Goal Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Emergency Fund, Summer Holiday"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Target (₹)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                required
                placeholder="50000"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full text-lg font-bold px-3.5 py-2 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
                Current Saved (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="w-full text-lg font-bold px-3.5 py-2 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Target Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-sm font-medium px-3.5 py-2 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Aiming for 3 months expenses"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-xs font-medium px-3.5 py-2 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            {initialGoal && onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Delete this savings goal?')) {
                    await onDelete(initialGoal.id);
                    onClose();
                  }
                }}
                className="text-xs font-bold text-red-600 hover:text-red-700"
              >
                Delete Goal
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
                {saving ? 'Saving...' : initialGoal ? 'Update Goal' : 'Save Goal'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
