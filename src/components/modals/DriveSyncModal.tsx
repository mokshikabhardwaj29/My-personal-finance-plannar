import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Folder, Clock, CheckCircle2, AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { Penny } from '../Penny';
import { api } from '../../services/api';

interface DriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTimezone: string;
  onSyncComplete?: (xpAwarded: number) => void;
  showPenny?: boolean;
}

export const DriveSyncModal: React.FC<DriveSyncModalProps> = ({
  isOpen,
  onClose,
  userTimezone,
  onSyncComplete,
  showPenny = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncData, setSyncData] = useState<{
    folder: { name: string; id: string; url: string };
    schedule: { time: string; timezone: string; cadence: string };
    lastSyncedAt: string | null;
    status: string;
    counts: { imported: number; duplicates: number; storedFiles: number; review: number; errors: string[] };
    processedFileIds: string[];
    resetAt: string | null;
  } | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.fetchDriveSync();
      setSyncData(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleTriggerSync = async () => {
    setSyncing(true);
    setResultMessage(null);
    try {
      // Simulate/trigger an inbox check
      const res = await api.postDriveSync({
        transactions: [],
        files: [],
        errors: [],
      });
      await loadData();
      setResultMessage(
        res.transactionsImported > 0 || res.filesStored > 0
          ? `Sync complete! Imported ${res.transactionsImported} transaction(s), stored ${res.filesStored} file(s). +${res.xpAwarded} XP!`
          : `Inbox checked and up to date. No new unimported files found.`
      );
      if (onSyncComplete) onSyncComplete(res.xpAwarded);
    } catch (err: unknown) {
      setResultMessage(err instanceof Error ? err.message : 'Sync check failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-sync-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-100 relative my-8">
        <div className="absolute top-4 right-14">
          <Penny
            mood={syncing ? 'thinking' : 'peek'}
            size={40}
            showSpeech={false}
            enabled={showPenny}
          />
        </div>

        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 id="drive-sync-title" className="text-xl font-bold text-gray-900 mb-1">
          Google Drive Financial Inbox
        </h3>
        <p className="text-xs text-gray-500 mb-5">
          Dedicated, secure automated ingestion bridge for bank statements, receipts, and invoices.
        </p>

        {resultMessage && (
          <div className="mb-4 p-3 rounded-xl bg-violet-50 border border-violet-200 text-violet-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />
            <span>{resultMessage}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Dedicated Folder Info */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-violet-600" />
                <span className="text-sm font-bold text-gray-900">
                  {syncData?.folder?.name || 'Ledgerly Financial Inbox'}
                </span>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Connected
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Drop any CSV bank statement, receipt image, PDF invoice, or expense spreadsheet into this dedicated Drive folder.
            </p>
          </div>

          {/* Schedule Badge */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-amber-900">
                Scheduled Automation: 8:00 AM Daily
              </p>
              <p className="text-amber-700 mt-0.5">
                Timezone: <span className="font-semibold">{userTimezone}</span>. The daily background job securely checks for new files and routes them to your private Ledgerly vault without storing credentials.
              </p>
            </div>
          </div>

          {/* Last Sync Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[11px] text-gray-500">Last Synced</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">
                {syncData?.lastSyncedAt
                  ? new Date(syncData.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Never'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[11px] text-gray-500">Files Stored</p>
              <p className="text-sm font-black text-violet-700 mt-0.5">
                {syncData?.counts?.storedFiles || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[11px] text-gray-500">Transactions</p>
              <p className="text-sm font-black text-emerald-600 mt-0.5">
                {syncData?.counts?.imported || 0}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[11px] text-gray-500">Duplicates</p>
              <p className="text-sm font-black text-gray-600 mt-0.5">
                {syncData?.counts?.duplicates || 0}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={syncing}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition shadow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Checking Inbox...' : 'Check & Sync Inbox Now'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
