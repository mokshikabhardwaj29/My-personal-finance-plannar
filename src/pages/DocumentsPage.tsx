import React, { useState } from 'react';
import {
  FolderLock,
  Upload,
  FileText,
  Cloud,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Trash2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { DocumentMeta, GameState, AppSettings } from '../types';
import { Penny } from '../components/Penny';

interface DocumentsPageProps {
  documents: DocumentMeta[];
  settings: AppSettings;
  game: GameState;
  onUploadFiles: (files: File[]) => Promise<void>;
  onDeleteDocument: (id: string) => Promise<void>;
  onOpenDriveSync: () => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  documents,
  settings,
  game,
  onUploadFiles,
  onDeleteDocument,
  onOpenDriveSync,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const driveMeta = settings.driveSyncMeta;
  const folderMeta = settings.driveFolderMeta || {
    name: 'Ledgerly Financial Inbox',
    id: 'drive_folder_ledgerly_financial_inbox',
    url: 'https://drive.google.com/drive/folders/drive_folder_ledgerly_financial_inbox',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    setUploading(true);
    setError(null);
    try {
      await onUploadFiles(files);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Documents Vault</h1>
        <p className="text-xs text-gray-500">
          Durable, private storage for receipts, statements, invoices, and Drive inbox syncs.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Two Primary Cards (Section 16) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Upload Documents Card */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-5 h-5 text-violet-600" />
              <h2 className="text-base font-bold text-gray-900">Upload Documents</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Upload multiple receipts, statements, invoices, PDFs, images, CSVs, or spreadsheets (max 20 MB each).
            </p>
          </div>

          <label className="border-2 border-dashed border-gray-200 hover:border-violet-400 rounded-2xl p-6 text-center cursor-pointer transition bg-gray-50/50 block">
            <input
              type="file"
              multiple
              accept="image/*,.pdf,.csv,.xlsx,.xls,.doc,.docx"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <FileText className="w-8 h-8 text-violet-500 mx-auto mb-2" />
            <span className="text-xs font-bold text-gray-800 block">
              {uploading ? 'Storing in Vault...' : 'Click to Browse or Drop Files'}
            </span>
            <span className="text-[11px] text-gray-400 mt-1 block">Earn +8 XP per stored document</span>
          </label>
        </div>

        {/* 2. Google Drive Inbox Card with Penny Peek (Section 16) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
          {/* Penny Peeking over the card */}
          <div className="absolute top-2 right-4">
            <Penny mood="peek" size={44} showSpeech={false} enabled={game.profile?.showPenny} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-gray-900">Google Drive Inbox</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Dedicated import folder: <strong className="text-gray-800">{folderMeta.name}</strong>
            </p>

            <div className="space-y-2 text-xs text-gray-600 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/60 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Daily Automation:</span>
                <span className="font-bold text-amber-900">8:00 AM Daily</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Synced:</span>
                <span className="font-semibold text-gray-800">
                  {driveMeta?.lastSyncedAt
                    ? new Date(driveMeta.lastSyncedAt).toLocaleString()
                    : 'Not synced yet'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Files Stored via Drive:</span>
                <span className="font-bold text-violet-700">
                  {driveMeta?.lastCounts?.storedFiles || 0} file(s)
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active Bridge
            </span>
            <button
              type="button"
              onClick={onOpenDriveSync}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition shadow flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Drive Sync Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Vault List */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Vault Documents ({documents.length})</h2>
            <p className="text-xs text-gray-500">Original uploaded and Drive-imported files.</p>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center">
            <Penny mood="peek" size={56} showSpeech={false} enabled={game.profile?.showPenny} />
            <p className="mt-3 font-bold text-gray-800">
              No documents yet. Upload a file or add one to your Drive inbox.
            </p>
            <p className="text-[11px] text-gray-400 mt-1 max-w-sm">
              Keep original proof, receipts, and invoices safely backed up and mapped to your ledger.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-2.5 px-3">Filename</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Imported Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-3 font-bold text-gray-900 max-w-[220px] truncate">
                      {doc.filename}
                    </td>
                    <td className="py-3 px-3 text-gray-500 truncate max-w-[120px]">
                      {doc.mimeType}
                    </td>
                    <td className="py-3 px-3 text-gray-500">
                      {(doc.size / 1024).toFixed(0)} KB
                    </td>
                    <td className="py-3 px-3 text-gray-600 font-medium capitalize">
                      {doc.source}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          doc.status === 'stored'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.status === 'queued'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-gray-500 hover:text-violet-600 rounded-lg hover:bg-gray-100"
                          title="Download / View document"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Delete document "${doc.filename}" from vault?`)) {
                              await onDeleteDocument(doc.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                          title="Delete document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
