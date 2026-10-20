import React, { useState } from 'react';
import { X, RotateCcw, AlertTriangle } from 'lucide-react';

interface ResetProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => Promise<void>;
}

export const ResetProgressModal: React.FC<ResetProgressModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMatched = confirmText.trim() === 'RESET';

  const handleReset = async () => {
    if (!isMatched) return;
    setResetting(true);
    setError(null);
    try {
      await onConfirmReset();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset progress');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-progress-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-amber-200 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-4">
          <RotateCcw className="w-6 h-6" />
        </div>

        <h3 id="reset-progress-title" className="text-xl font-bold text-gray-900 mb-2">
          Reset Gamification Progress
        </h3>

        <div className="space-y-2 text-xs text-gray-600 mb-4 bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
          <p className="font-semibold text-amber-900">What will happen:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Your XP resets to 0 and level resets to 1 (Saver Sprout).</li>
            <li>Current streak and streak freezes reset to 0.</li>
            <li>All earned badges and quest states are cleared.</li>
            <li>
              <strong>Your financial records, transactions, budgets, goals, and vault documents remain 100% intact.</strong>
            </li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
            Type <span className="text-amber-600 font-mono">RESET</span> to confirm
          </label>
          <input
            type="text"
            placeholder="RESET"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-amber-500 outline-none uppercase"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!isMatched || resetting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition shadow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {resetting ? 'Resetting...' : 'Reset Progress'}
          </button>
        </div>
      </div>
    </div>
  );
};
