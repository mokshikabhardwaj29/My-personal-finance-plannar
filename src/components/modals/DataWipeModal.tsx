import React, { useState } from 'react';
import { X, AlertOctagon } from 'lucide-react';

interface DataWipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmWipe: () => Promise<void>;
}

export const DataWipeModal: React.FC<DataWipeModalProps> = ({
  isOpen,
  onClose,
  onConfirmWipe,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [wiping, setWiping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMatched = confirmText.trim() === 'DELETE';

  const handleWipe = async () => {
    if (!isMatched) return;
    setWiping(true);
    setError(null);
    try {
      await onConfirmWipe();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to erase data');
    } finally {
      setWiping(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wipe-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-red-200 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertOctagon className="w-6 h-6" />
        </div>

        <h3 id="wipe-modal-title" className="text-xl font-bold text-gray-900 mb-2">
          Erase All Ledgerly Data
        </h3>

        <div className="space-y-2.5 text-xs text-gray-600 mb-5 bg-red-50/70 p-4 rounded-2xl border border-red-200">
          <p className="font-bold text-red-900">Please review carefully:</p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              All database records (transactions, rules, tags, budgets, goals, recurring items) will be permanently deleted.
            </li>
            <li>All stored receipt, document, and statement file copies in the vault will be wiped.</li>
            <li>All gamification progress, XP, levels, streaks, and badges will reset to empty start.</li>
            <li>
              <strong className="text-gray-900">
                Your original Google Drive files in your personal Drive will remain completely untouched.
              </strong>
            </li>
            <li>
              The 8:00 AM daily automation will not re-import files dated before this wipe.
            </li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
            Type <span className="text-red-600 font-mono">DELETE</span> to confirm complete wipe
          </label>
          <input
            type="text"
            placeholder="DELETE"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full text-sm font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-red-500 outline-none uppercase"
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
            onClick={handleWipe}
            disabled={!isMatched || wiping}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-700 transition shadow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {wiping ? 'Erasing Everything...' : 'Erase All Ledgerly Data'}
          </button>
        </div>
      </div>
    </div>
  );
};
