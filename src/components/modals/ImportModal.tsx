import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Penny } from '../Penny';
import { GameDelta } from '../../types';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  accounts: string[];
  onImportCsv: (csvRows: Array<{
    date: string;
    merchant: string;
    amount: number;
    type: 'expense' | 'income';
    category?: string;
    account?: string;
  }>) => Promise<{ inserted: number; duplicates: number; gameDelta: GameDelta }>;
  onUploadDocs: (files: File[]) => Promise<{ count: number; gameDelta: GameDelta }>;
  showPenny?: boolean;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  onImportCsv,
  onUploadDocs,
  showPenny = true,
}) => {
  const [activeTab, setActiveTab] = useState<'csv' | 'docs'>('csv');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawLines, setCsvRawLines] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<{
    dateCol: string;
    merchantCol: string;
    amountCol: string;
    debitCol: string;
    creditCol: string;
    categoryCol: string;
    accountCol: string;
  }>({
    dateCol: '',
    merchantCol: '',
    amountCol: '',
    debitCol: '',
    creditCol: '',
    categoryCol: '',
    accountCol: '',
  });

  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    duplicates: number;
    needsReview: number;
    xpAwarded: number;
    badges: string[];
  } | null>(null);

  // Document upload state
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [uploadResult, setUploadResult] = useState<{ count: number; xpAwarded: number } | null>(null);

  if (!isOpen) return null;

  // Simple robust CSV line splitter honoring quotes
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let insideQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleCsvFileSelect = (file: File) => {
    setCsvFile(file);
    setError(null);
    setImportResult(null);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length < 2) {
          setError('CSV file must have at least a header and one data row.');
          setParsing(false);
          return;
        }

        const headers = parseCsvLine(lines[0]);
        setCsvHeaders(headers);

        const dataRows: string[][] = [];
        for (let i = 1; i < Math.min(lines.length, 1000); i++) {
          dataRows.push(parseCsvLine(lines[i]));
        }
        setCsvRawLines(dataRows);

        // Smart column header heuristic detection
        const autoMap = {
          dateCol: '',
          merchantCol: '',
          amountCol: '',
          debitCol: '',
          creditCol: '',
          categoryCol: '',
          accountCol: '',
        };

        headers.forEach((h) => {
          const lower = h.toLowerCase().trim();
          if (!autoMap.dateCol && (lower.includes('date') || lower.includes('posted') || lower.includes('time'))) {
            autoMap.dateCol = h;
          } else if (
            !autoMap.merchantCol &&
            (lower.includes('desc') || lower.includes('merchant') || lower.includes('payee') || lower.includes('name'))
          ) {
            autoMap.merchantCol = h;
          } else if (!autoMap.debitCol && lower.includes('debit')) {
            autoMap.debitCol = h;
          } else if (!autoMap.creditCol && lower.includes('credit')) {
            autoMap.creditCol = h;
          } else if (!autoMap.amountCol && (lower.includes('amount') || lower.includes('total') || lower.includes('price'))) {
            autoMap.amountCol = h;
          } else if (!autoMap.categoryCol && lower.includes('cat')) {
            autoMap.categoryCol = h;
          } else if (!autoMap.accountCol && lower.includes('acc')) {
            autoMap.accountCol = h;
          }
        });

        setMapping(autoMap);
      } catch (err) {
        setError('Failed to parse CSV file.');
      } finally {
        setParsing(false);
      }
    };
    reader.readAsText(file);
  };

  const handleRunImport = async () => {
    if (!mapping.dateCol || !mapping.merchantCol || (!mapping.amountCol && !mapping.debitCol)) {
      setError('Please map Date, Merchant/Description, and Amount (or Debit/Credit) columns.');
      return;
    }

    setImporting(true);
    setError(null);

    const dateIdx = csvHeaders.indexOf(mapping.dateCol);
    const merchIdx = csvHeaders.indexOf(mapping.merchantCol);
    const amtIdx = mapping.amountCol ? csvHeaders.indexOf(mapping.amountCol) : -1;
    const debitIdx = mapping.debitCol ? csvHeaders.indexOf(mapping.debitCol) : -1;
    const creditIdx = mapping.creditCol ? csvHeaders.indexOf(mapping.creditCol) : -1;
    const catIdx = mapping.categoryCol ? csvHeaders.indexOf(mapping.categoryCol) : -1;
    const accIdx = mapping.accountCol ? csvHeaders.indexOf(mapping.accountCol) : -1;

    const parsedRows: Array<{
      date: string;
      merchant: string;
      amount: number;
      type: 'expense' | 'income';
      category?: string;
      account?: string;
    }> = [];

    let needsReviewCount = 0;

    for (const row of csvRawLines) {
      const rawDate = row[dateIdx] || '';
      const rawMerch = row[merchIdx] || '';
      let rawAmt = amtIdx >= 0 ? row[amtIdx] : '';
      let isIncome = false;

      // Handle debit/credit separate columns
      if (debitIdx >= 0 && row[debitIdx]) {
        const val = parseFloat(row[debitIdx].replace(/[^0-9.-]/g, ''));
        if (!isNaN(val) && val > 0) {
          rawAmt = String(val);
          isIncome = false;
        }
      }
      if (creditIdx >= 0 && row[creditIdx]) {
        const val = parseFloat(row[creditIdx].replace(/[^0-9.-]/g, ''));
        if (!isNaN(val) && val > 0) {
          rawAmt = String(val);
          isIncome = true;
        }
      }

      if (!rawDate || !rawMerch || !rawAmt) continue;

      // Parse amount as positive magnitude
      const cleanAmtStr = rawAmt.replace(/[^0-9.-]/g, '');
      const parsedNum = parseFloat(cleanAmtStr);
      if (isNaN(parsedNum) || parsedNum === 0) continue;

      if (parsedNum < 0) {
        // Negative in statement typically denotes expense or charge
        isIncome = false;
      }

      const absAmount = Math.abs(parsedNum);

      // Parse Date to YYYY-MM-DD
      let normalizedDate = '';
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          normalizedDate = d.toISOString().slice(0, 10);
        } else {
          // Try DD/MM/YYYY or MM/DD/YYYY
          const parts = rawDate.split(/[-/]/);
          if (parts.length === 3) {
            const y = parts[2].length === 4 ? parts[2] : `20${parts[2]}`;
            const m = String(parts[0]).padStart(2, '0');
            const day = String(parts[1]).padStart(2, '0');
            normalizedDate = `${y}-${m}-${day}`;
          }
        }
      } catch {
        continue;
      }

      if (!normalizedDate || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) continue;

      const rawCat = catIdx >= 0 ? row[catIdx] : '';
      const matchedCat = categories.find((c) => c.toLowerCase() === rawCat.toLowerCase()) || 'Needs review';
      if (matchedCat === 'Needs review') needsReviewCount++;

      const rawAcc = accIdx >= 0 ? row[accIdx] : '';
      const matchedAcc = accounts.find((a) => a.toLowerCase() === rawAcc.toLowerCase()) || accounts[0] || 'Main Checking';

      parsedRows.push({
        date: normalizedDate,
        merchant: rawMerch.trim(),
        amount: absAmount,
        type: isIncome ? 'income' : 'expense',
        category: matchedCat,
        account: matchedAcc,
      });
    }

    if (parsedRows.length === 0) {
      setError('No valid transactions could be parsed from the CSV with current mapping.');
      setImporting(false);
      return;
    }

    try {
      const res = await onImportCsv(parsedRows);
      setImportResult({
        inserted: res.inserted,
        duplicates: res.duplicates,
        needsReview: needsReviewCount,
        xpAwarded: res.gameDelta?.xpAwarded || 0,
        badges: (res.gameDelta?.newBadges || []).map((b) => b.title),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  const handleUploadDocuments = async () => {
    if (docFiles.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const res = await onUploadDocs(docFiles);
      setUploadResult({
        count: res.count,
        xpAwarded: res.gameDelta?.xpAwarded || 0,
      });
      setDocFiles([]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Document upload failed';
      setError(msg);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-gray-100 relative my-8">
        {/* Mascot badge */}
        <div className="absolute top-4 right-14">
          <Penny
            mood={importResult || uploadResult ? 'celebrate' : parsing || importing ? 'thinking' : error ? 'concerned' : 'idle'}
            size={36}
            showSpeech={false}
            enabled={showPenny}
          />
        </div>

        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 id="import-title" className="text-xl font-bold text-gray-900 mb-2">
          Import Financial Data
        </h3>
        <p className="text-xs text-gray-500 mb-5">
          Import CSV statements or upload receipts, invoices, and documents directly to your secure vault.
        </p>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition ${
              activeTab === 'csv'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV Statement</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 pb-3 px-4 font-bold text-sm border-b-2 transition ${
              activeTab === 'docs'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documents & Receipts</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* CSV Import Flow */}
        {activeTab === 'csv' && (
          <div>
            {!csvFile ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-violet-400 transition bg-gray-50/50">
                <FileSpreadsheet className="w-10 h-10 text-violet-500 mx-auto mb-3" />
                <p className="text-sm font-bold text-gray-800 mb-1">Select Bank or Card Statement CSV</p>
                <p className="text-xs text-gray-500 mb-4">Recognizes common columns for date, merchant, and amounts.</p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs cursor-pointer hover:bg-violet-700 transition shadow">
                  <Upload className="w-4 h-4" />
                  <span>Choose CSV File</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleCsvFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            ) : importResult ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-gray-900">CSV Import Complete!</h4>
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-4 rounded-xl border border-gray-200 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Inserted</p>
                    <p className="text-lg font-black text-emerald-600">{importResult.inserted}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Duplicates</p>
                    <p className="text-lg font-black text-gray-600">{importResult.duplicates}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">XP Earned</p>
                    <p className="text-lg font-black text-amber-600">+{importResult.xpAwarded} XP</p>
                  </div>
                </div>
                {importResult.badges.length > 0 && (
                  <p className="text-xs text-amber-700 font-bold">
                    Unlocked Badge: {importResult.badges.join(', ')}
                  </p>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-700 transition shadow"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-600 bg-violet-50/60 p-3 rounded-xl border border-violet-100">
                  <span className="font-semibold truncate">File: {csvFile.name}</span>
                  <span className="shrink-0">{csvRawLines.length} rows previewed</span>
                </div>

                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Map Statement Columns
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Date Column *</label>
                    <select
                      value={mapping.dateCol}
                      onChange={(e) => setMapping({ ...mapping, dateCol: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="">-- Select --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Merchant / Description *</label>
                    <select
                      value={mapping.merchantCol}
                      onChange={(e) => setMapping({ ...mapping, merchantCol: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="">-- Select --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Amount Column</label>
                    <select
                      value={mapping.amountCol}
                      onChange={(e) => setMapping({ ...mapping, amountCol: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="">-- None / Use Debit-Credit --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Category Column</label>
                    <select
                      value={mapping.categoryCol}
                      onChange={(e) => setMapping({ ...mapping, categoryCol: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg bg-white"
                    >
                      <option value="">-- Defaults to Needs review --</option>
                      {csvHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setCsvFile(null)}
                    disabled={importing}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Choose Different File
                  </button>
                  <button
                    type="button"
                    onClick={handleRunImport}
                    disabled={importing}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition shadow disabled:opacity-50"
                  >
                    {importing ? 'Importing Rows...' : 'Run Import'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documents & Receipts Flow */}
        {activeTab === 'docs' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center bg-gray-50/50">
              <FileText className="w-10 h-10 text-violet-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-800">Upload Receipts, Invoices, PDFs, Images</p>
              <p className="text-xs text-gray-500 mb-4">Max 20 MB each. Stored securely in your vault.</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-xs cursor-pointer hover:bg-violet-700 transition shadow">
                <Upload className="w-4 h-4" />
                <span>Select Files</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.csv,.xlsx,.xls,.doc,.docx"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setDocFiles(Array.from(e.target.files));
                    }
                  }}
                />
              </label>
            </div>

            {docFiles.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-gray-500 mb-2">
                  Files Selected ({docFiles.length})
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1 mb-3">
                  {docFiles.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 text-xs">
                      <span className="truncate max-w-[280px] font-medium text-gray-700">{f.name}</span>
                      <span className="text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleUploadDocuments}
                  disabled={importing}
                  className="w-full py-2.5 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-700 transition shadow disabled:opacity-50"
                >
                  {importing ? 'Uploading to Vault...' : `Upload ${docFiles.length} Document(s)`}
                </button>
              </div>
            )}

            {uploadResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-gray-900">
                  {uploadResult.count} file(s) saved to vault!
                </p>
                <p className="text-xs text-amber-700 font-bold">Earned +{uploadResult.xpAwarded} XP</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
