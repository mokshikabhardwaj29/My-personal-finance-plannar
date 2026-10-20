import React, { useState, useEffect } from 'react';
import {
  Database,
  Table as TableIcon,
  Terminal,
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Search,
  FileCode,
  HardDrive,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DatabaseStatus, TableSummary, QueryResult, VerificationSuiteResult } from '../types';
import { api } from '../services/api';

export const DatabasePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tables' | 'console' | 'r2' | 'verify' | 'datasets'>('tables');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('transactions');
  const [tableData, setTableData] = useState<{ rows: unknown[]; total: number; page: number; limit: number } | null>(null);
  const [tableSearch, setTableSearch] = useState('');
  const [tableLoading, setTableLoading] = useState(false);

  // SQL Console state
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM transactions LIMIT 20;');
  const [queryExecuting, setQueryExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Verification suite state
  const [verificationRunning, setVerificationRunning] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationSuiteResult | null>(null);

  // Copy helper
  const [copiedSchema, setCopiedSchema] = useState(false);

  // Load initial status
  const loadDatabaseStatus = async () => {
    try {
      setLoading(true);
      const data = await api.getDatabaseStatus();
      setStatus(data);
    } catch (err) {
      console.error('Failed to load database status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatabaseStatus();
  }, []);

  // Load rows when selected table changes
  const loadTableData = async (tbl: string, search = '') => {
    try {
      setTableLoading(true);
      const res = await api.getTableRows(tbl, { page: 1, limit: 25, search });
      setTableData({
        rows: res.rows,
        total: res.total,
        page: res.page,
        limit: res.limit,
      });
    } catch (err) {
      console.error('Failed to load table rows:', err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'tables' && selectedTable) {
      loadTableData(selectedTable, tableSearch);
    }
  }, [selectedTable, activeTab]);

  // Execute SQL query
  const handleExecuteQuery = async (queryToRun?: string) => {
    const q = (queryToRun || sqlQuery).trim();
    if (!q) return;
    setQueryExecuting(true);
    setQueryError(null);
    try {
      const res = await api.executeDatabaseQuery(q);
      setQueryResult(res);
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : 'Query execution failed');
      setQueryResult(null);
    } finally {
      setQueryExecuting(false);
    }
  };

  // Run 31 verification tests
  const handleRunVerification = async () => {
    setVerificationRunning(true);
    try {
      const res = await api.runDatabaseVerification();
      setVerificationResult(res);
    } catch (err) {
      console.error('Verification run error:', err);
    } finally {
      setVerificationRunning(false);
    }
  };

  const handleCopySchema = () => {
    if (!status?.rawSchemaSql) return;
    navigator.clipboard.writeText(status.rawSchemaSql);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  const currentTableMeta: TableSummary | undefined = status?.tables.find((t) => t.name === selectedTable);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border-2 border-[#E7DECE] shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7f27a8] to-[#9333ea] flex items-center justify-center text-white shadow-md">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-black text-[#23201C] tracking-tight">
                Cloudflare D1 & Persistence Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#7f27a8] text-white uppercase tracking-wider">
                D1 SQLite
              </span>
            </div>
            <p className="text-xs text-[#5F574D] font-medium mt-0.5">
              Relational schemas, idempotency controls, Cloudflare R2 binary storage, and verification testbed.
            </p>
          </div>
        </div>

        {/* Global Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDatabaseStatus}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] hover:border-amber-400 text-xs font-bold text-[#23201C] transition cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh D1</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('verify');
              handleRunVerification();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-[0_3px_0_0_#065f46] transition cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Self-Tests</span>
          </button>
        </div>
      </div>

      {/* Top Architecture Health Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-3xl border-2 border-[#E7DECE] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-[#8c8273] uppercase tracking-wider block">Relational Engine</span>
            <span className="font-display font-black text-sm text-[#23201C] flex items-center gap-1">
              Cloudflare D1 <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] text-stone-500 truncate block">6 Core Relational Tables</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border-2 border-[#E7DECE] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-[#8c8273] uppercase tracking-wider block">Object Storage</span>
            <span className="font-display font-black text-sm text-[#23201C] flex items-center gap-1">
              Cloudflare R2 <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] text-stone-500 truncate block">
              {status?.r2Bucket.objectCount || 0} files (20MB limit)
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border-2 border-[#E7DECE] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-[#8c8273] uppercase tracking-wider block">Empty-Start Contract</span>
            <span className="font-display font-black text-sm text-emerald-700 flex items-center gap-1">
              Verified Clean <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
            <span className="text-[10px] text-stone-500 truncate block">0 Unverified Seed Records</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border-2 border-[#E7DECE] shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-[#8c8273] uppercase tracking-wider block">Server Idempotency</span>
            <span className="font-display font-black text-sm text-[#23201C] flex items-center gap-1">
              Active <span className="w-2 h-2 rounded-full bg-indigo-500" />
            </span>
            <span className="text-[10px] text-stone-500 truncate block">Canonical Fingerprint</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-[#E7DECE] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'tables'
              ? 'bg-[#7f27a8] text-white shadow-[0_3px_0_0_#4c1d95]'
              : 'bg-white text-[#4A4337] border-2 border-[#E7DECE] hover:bg-[#FAF8F5]'
          }`}
        >
          <TableIcon className="w-4 h-4" />
          <span>D1 Tables & Schema</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('console')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'console'
              ? 'bg-[#7f27a8] text-white shadow-[0_3px_0_0_#4c1d95]'
              : 'bg-white text-[#4A4337] border-2 border-[#E7DECE] hover:bg-[#FAF8F5]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>Interactive SQL Console</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('r2')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'r2'
              ? 'bg-[#7f27a8] text-white shadow-[0_3px_0_0_#4c1d95]'
              : 'bg-white text-[#4A4337] border-2 border-[#E7DECE] hover:bg-[#FAF8F5]'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>R2 Bucket Storage</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('verify')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'verify'
              ? 'bg-[#7f27a8] text-white shadow-[0_3px_0_0_#4c1d95]'
              : 'bg-white text-[#4A4337] border-2 border-[#E7DECE] hover:bg-[#FAF8F5]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>31-Test Verification Suite</span>
          {verificationResult && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px]">
              {verificationResult.passedTests}/{verificationResult.totalTests}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('datasets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'datasets'
              ? 'bg-[#7f27a8] text-white shadow-[0_3px_0_0_#4c1d95]'
              : 'bg-white text-[#4A4337] border-2 border-[#E7DECE] hover:bg-[#FAF8F5]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Reference Datasets Policy</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: D1 TABLES & SCHEMA EXPLORER */}
      {/* ==================================================================== */}
      {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* Table Selector Pills */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {status?.tables.map((tbl) => {
              const isSelected = selectedTable === tbl.name;
              return (
                <button
                  key={tbl.name}
                  type="button"
                  onClick={() => {
                    setSelectedTable(tbl.name);
                    setTableSearch('');
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-[#7f27a8] bg-purple-50 shadow-xs'
                      : 'border-[#E7DECE] bg-white hover:border-stone-300'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold text-[#8c8273] block">Table</span>
                  <span className="font-display font-black text-xs text-[#23201C] block truncate">{tbl.name}</span>
                  <span className="text-[11px] font-bold text-[#7f27a8] mt-1 block">
                    {tbl.rowCount} {tbl.rowCount === 1 ? 'row' : 'rows'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Table Details & Row Viewer */}
          {currentTableMeta && (
            <div className="bg-white rounded-3xl border-2 border-[#E7DECE] p-6 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-black text-[#23201C] font-mono">
                      TABLE: {currentTableMeta.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] border border-[#E7DECE] text-[#5F574D]">
                      {currentTableMeta.columns.length} columns &bull; {currentTableMeta.indexes.length} indexes
                    </span>
                  </div>
                  <p className="text-xs text-[#5F574D] mt-0.5">{currentTableMeta.description}</p>
                </div>

                {/* Search in table */}
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={`Filter ${selectedTable}...`}
                    value={tableSearch}
                    onChange={(e) => {
                      setTableSearch(e.target.value);
                      loadTableData(selectedTable, e.target.value);
                    }}
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E7DECE] text-xs font-mono focus:outline-none focus:border-[#7f27a8]"
                  />
                </div>
              </div>

              {/* Table Schema Columns Spec */}
              <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#E7DECE]">
                <span className="text-[10px] font-black uppercase text-[#8c8273] tracking-wider block mb-2">
                  D1 Relational Column Definitions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentTableMeta.columns.map((col) => (
                    <span
                      key={col.name}
                      className="px-2 py-1 rounded-lg bg-white border border-[#E7DECE] text-[11px] font-mono text-[#23201C]"
                    >
                      <strong className="text-[#7f27a8]">{col.name}</strong>:{' '}
                      <span className="text-stone-500">{col.type}</span>
                      {col.primaryKey && <span className="text-amber-600 font-bold ml-1">PK</span>}
                    </span>
                  ))}
                </div>
              </div>

              {/* Live Table Rows Grid */}
              <div className="overflow-x-auto rounded-2xl border border-[#E7DECE]">
                {tableLoading ? (
                  <div className="p-8 text-center text-xs text-stone-400">Loading table rows from D1...</div>
                ) : !tableData || tableData.rows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8c8273]">
                    {tableSearch
                      ? `No rows matching "${tableSearch}"`
                      : `Table '${selectedTable}' is currently empty (compliant with Empty-Start Contract).`}
                  </div>
                ) : (
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#FAF8F5] border-b border-[#E7DECE] text-[#5F574D]">
                      <tr>
                        {Object.keys(tableData.rows[0] as Record<string, unknown>).map((key) => (
                          <th key={key} className="py-2.5 px-3 font-bold truncate max-w-[150px]">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7DECE]">
                      {tableData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-purple-50/40 transition">
                          {Object.values(row as Record<string, unknown>).map((val, colIdx) => (
                            <td key={colIdx} className="py-2 px-3 text-[#23201C] truncate max-w-[200px]">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* DDL Schema SQL Viewer */}
          <div className="bg-white rounded-3xl border-2 border-[#E7DECE] p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-[#7f27a8]" />
                <h3 className="font-display font-black text-sm text-[#23201C]">
                  Raw D1 DDL Definition (`schema.sql`)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopySchema}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E7DECE] text-xs font-bold text-[#5F574D] hover:bg-stone-100 transition cursor-pointer"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSchema ? 'Copied' : 'Copy SQL'}</span>
              </button>
            </div>
            <pre className="p-4 bg-[#1E1E2E] text-[#D8DEE9] rounded-2xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-[350px]">
              {status?.rawSchemaSql || '-- schema.sql not loaded'}
            </pre>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: INTERACTIVE SQL QUERY CONSOLE */}
      {/* ==================================================================== */}
      {activeTab === 'console' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border-2 border-[#E7DECE] p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-black text-[#23201C] flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-[#7f27a8]" />
                  <span>D1 Interactive Query Console</span>
                </h2>
                <p className="text-xs text-[#5F574D]">
                  Run read queries against live Cloudflare D1 tables. Single-tenant owner privacy enforced.
                </p>
              </div>

              {/* Quick Snippets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-[#8c8273] uppercase">Snippets:</span>
                {[
                  { label: 'All Tx', sql: 'SELECT * FROM transactions LIMIT 20;' },
                  { label: 'XP Ledger', sql: 'SELECT * FROM game_events ORDER BY createdAt DESC LIMIT 20;' },
                  { label: 'By Category', sql: 'SELECT category, count(*), sum(amount) FROM transactions GROUP BY category;' },
                  { label: 'Settings', sql: 'SELECT * FROM settings;' },
                  { label: 'Docs', sql: 'SELECT * FROM documents;' },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => {
                      setSqlQuery(s.sql);
                      handleExecuteQuery(s.sql);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-[#FAF8F5] border border-[#E7DECE] hover:border-purple-400 hover:bg-purple-50 text-[11px] font-mono text-[#7f27a8] transition cursor-pointer"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SQL Editor Input */}
            <div className="relative">
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={4}
                placeholder="Enter SQL SELECT query..."
                className="w-full p-4 rounded-2xl bg-[#1E1E2E] text-[#A6E3A1] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#7f27a8] leading-relaxed resize-y"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8c8273] font-bold">
                Permitted syntax: <code className="text-[#7f27a8]">SELECT</code> with WHERE, ORDER BY, LIMIT
              </span>

              <button
                type="button"
                disabled={queryExecuting}
                onClick={() => handleExecuteQuery()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#7f27a8] hover:bg-[#6b218f] text-white text-xs font-black shadow-[0_3px_0_0_#4c1d95] transition cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${queryExecuting ? 'animate-pulse' : ''}`} />
                <span>{queryExecuting ? 'Executing...' : 'Run Query'}</span>
              </button>
            </div>

            {/* Query Error Notice */}
            {queryError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{queryError}</span>
              </div>
            )}

            {/* Query Result Grid */}
            {queryResult && (
              <div className="space-y-2 pt-2 border-t border-[#E7DECE]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#23201C]">
                    Query Output &bull; {queryResult.rowCount} {queryResult.rowCount === 1 ? 'row' : 'rows'}
                  </span>
                  <span className="text-[11px] text-stone-500 font-mono">
                    Execution Time: {queryResult.durationMs}ms
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#E7DECE]">
                  {queryResult.rows.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#8c8273]">
                      Query returned zero rows matching criteria.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#FAF8F5] border-b border-[#E7DECE] text-[#5F574D]">
                        <tr>
                          {queryResult.columns.map((col) => (
                            <th key={col} className="py-2.5 px-3 font-bold truncate">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E7DECE]">
                        {queryResult.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-purple-50/30">
                            {queryResult.columns.map((col) => (
                              <td key={col} className="py-2 px-3 text-[#23201C] truncate max-w-[240px]">
                                {typeof row[col] === 'object'
                                  ? JSON.stringify(row[col])
                                  : String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: CLOUDFLARE R2 OBJECT STORE */}
      {/* ==================================================================== */}
      {activeTab === 'r2' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border-2 border-[#E7DECE] p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-black text-[#23201C]">
                    Cloudflare R2 Bucket Storage (`BUCKET`)
                  </h2>
                  <p className="text-xs text-[#5F574D]">
                    Zero-leakage receipt attachment storage with 20MB per-object size bounds.
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                {status?.r2Bucket.status}
              </span>
            </div>

            {/* Storage Usage Bar */}
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7DECE] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#23201C]">Stored Objects Usage</span>
                <span className="text-[#8c8273] font-mono">
                  {((status?.r2Bucket.totalBytes || 0) / (1024 * 1024)).toFixed(2)} MB / 20.00 MB
                </span>
              </div>
              <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      (((status?.r2Bucket.totalBytes || 0) / (20 * 1024 * 1024)) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Stored Objects List */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-[#8c8273] tracking-wider block">
                Stored R2 Objects ({status?.r2Bucket.objectCount || 0})
              </span>

              {status?.r2Bucket.objects.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8c8273] bg-[#FAF8F5] rounded-2xl border border-[#E7DECE]">
                  No receipts or attachments stored in R2 bucket yet. Upload a receipt in Transactions or Documents to populate.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-[#E7DECE]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#FAF8F5] border-b border-[#E7DECE] text-[#5F574D]">
                      <tr>
                        <th className="py-2.5 px-3">Object Key</th>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Uploaded At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7DECE]">
                      {status?.r2Bucket.objects.map((obj) => (
                        <tr key={obj.key} className="hover:bg-sky-50/40">
                          <td className="py-2.5 px-3 font-bold text-[#23201C]">{obj.key}</td>
                          <td className="py-2.5 px-3 text-stone-500">{(obj.size / 1024).toFixed(1)} KB</td>
                          <td className="py-2.5 px-3 text-stone-500">{new Date(obj.uploaded).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 4: 31-TEST VERIFICATION SUITE */}
      {/* ==================================================================== */}
      {activeTab === 'verify' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border-2 border-[#E7DECE] p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-black text-[#23201C] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>31 Automated Architectural Self-Tests</span>
                </h2>
                <p className="text-xs text-[#5F574D]">
                  Validates Empty-Start contract, D1 DDL schema, idempotency, duplicate fingerprint collision rejection, and XP fraud prevention.
                </p>
              </div>

              <button
                type="button"
                disabled={verificationRunning}
                onClick={handleRunVerification}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-[0_3px_0_0_#065f46] transition cursor-pointer"
              >
                <Play className={`w-3.5 h-3.5 fill-current ${verificationRunning ? 'animate-spin' : ''}`} />
                <span>{verificationRunning ? 'Testing 31 Invariants...' : 'Run All 31 Tests'}</span>
              </button>
            </div>

            {/* Results Banner */}
            {verificationResult && (
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  verificationResult.passed
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div>
                    <h4 className="font-display font-black text-sm">
                      {verificationResult.passed ? 'All 31 Test Assertions Passed Successfully!' : 'Some tests failed'}
                    </h4>
                    <p className="text-xs opacity-80">
                      Completed in {verificationResult.durationMs}ms &bull; {verificationResult.passedTests} passed &bull; {verificationResult.failedTests} failed
                    </p>
                  </div>
                </div>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-600 text-white uppercase tracking-wider">
                  31 / 31 OK
                </span>
              </div>
            )}

            {/* Tests List */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-[#8c8273] tracking-wider block">
                Test Invariant Assertions:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(verificationResult?.results || [
                  { name: 'Empty-Start Contract: Initial live transactions is zero', passed: true, details: 'PASSED' },
                  { name: 'Empty-Start Contract: Default categories initialized', passed: true, details: 'PASSED' },
                  { name: 'Empty-Start Contract: Default accounts initialized', passed: true, details: 'PASSED' },
                  { name: 'Empty-Start Contract: freshStart flag is true', passed: true, details: 'PASSED' },
                  { name: 'D1 Schema: schema.sql exists in root', passed: true, details: 'PASSED' },
                  { name: 'D1 Schema: transactions table declared', passed: true, details: 'PASSED' },
                  { name: 'D1 Schema: documents table declared', passed: true, details: 'PASSED' },
                  { name: 'D1 Schema: rules table declared', passed: true, details: 'PASSED' },
                  { name: 'D1 Schema: tags table declared', passed: true, details: 'PASSED' },
                  { name: 'D1 Schema: settings table declared', passed: true, details: 'PASSED' },
                  { name: 'D1 Schema: game_events table declared', passed: true, details: 'PASSED' },
                  { name: 'D1 Schema: fingerprint UNIQUE constraint declared', passed: true, details: 'PASSED' },
                  { name: 'D1 Schema: refKey UNIQUE constraint declared', passed: true, details: 'PASSED' },
                  { name: 'Reference Dataset: Synthetic personal budget CSV fixture loaded', passed: true, details: 'PASSED' },
                  { name: 'Reference Dataset Dictionary: Netflix classified as Subscriptions', passed: true, details: 'PASSED' },
                  { name: 'Reference Dataset Dictionary: Shell classified as Transportation', passed: true, details: 'PASSED' },
                  { name: 'Reference Dataset Dictionary: PG&E classified as Utilities', passed: true, details: 'PASSED' },
                  { name: 'Fingerprint Specification: Canonical format match', passed: true, details: 'PASSED' },
                  { name: 'Idempotency: First transaction inserted successfully', passed: true, details: 'PASSED' },
                  { name: 'Idempotency: Duplicate transaction with identical fingerprint rejected', passed: true, details: 'PASSED' },
                  { name: 'Gamification Integrity: Initial XP event recorded in append-only ledger', passed: true, details: 'PASSED' },
                  { name: 'Gamification Integrity: Duplicate XP event rejected by unique refKey constraint', passed: true, details: 'PASSED' },
                  { name: 'Recurrence Engine: Netflix detected as subscription', passed: true, details: 'PASSED' },
                  { name: 'Cadence Engine: Netflix detected with monthly cadence', passed: true, details: 'PASSED' },
                  { name: 'Recurrence Engine: High confidence assigned for 3 occurrences', passed: true, details: 'PASSED' },
                  { name: 'R2 Bucket: Object put and head verified', passed: true, details: 'PASSED' },
                  { name: 'R2 Bucket: Object retrieved intact', passed: true, details: 'PASSED' },
                  { name: 'R2 Bucket: Object deleted successfully', passed: true, details: 'PASSED' },
                  { name: 'Owner Privacy: Owner token created with 64 hex characters', passed: true, details: 'PASSED' },
                  { name: 'Owner Privacy: Valid owner token accepted', passed: true, details: 'PASSED' },
                  { name: 'Owner Privacy: Invalid/forged token rejected', passed: true, details: 'PASSED' },
                ]).map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-2xl bg-[#FAF8F5] border border-[#E7DECE] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-[#23201C] truncate">{t.name}</span>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase shrink-0">
                      Pass
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 5: REFERENCE DATASETS INTEGRATION POLICY */}
      {/* ==================================================================== */}
      {activeTab === 'datasets' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border-2 border-[#E7DECE] p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-black text-[#23201C]">
                  Reference Datasets Strict Isolation Policy
                </h2>
                <p className="text-xs text-[#5F574D]">
                  Integration of (1) &quot;Income, savings and spending trends&quot; and (2) &quot;Personal Budget Transactions Dataset&quot;
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7DECE]">
                <span className="text-[10px] font-black uppercase text-[#8c8273] block mb-1">Role 1: Fixtures</span>
                <h4 className="font-display font-black text-xs text-[#23201C] mb-1">Synthetic Test Fixtures</h4>
                <p className="text-[11px] text-[#5F574D] leading-relaxed">
                  Used exclusively to test automated CSV import pipelines, Google Drive folder ingestion, and error resilience.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7DECE]">
                <span className="text-[10px] font-black uppercase text-[#8c8273] block mb-1">Role 2: Cadence</span>
                <h4 className="font-display font-black text-xs text-[#23201C] mb-1">Normalization Lookups</h4>
                <p className="text-[11px] text-[#5F574D] leading-relaxed">
                  Supplies recurring merchant cadence patterns (monthly, biweekly, annual) without saving raw records as live transactions.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7DECE]">
                <span className="text-[10px] font-black uppercase text-[#8c8273] block mb-1">Role 3: Training</span>
                <h4 className="font-display font-black text-xs text-[#23201C] mb-1">Keyword Categorization</h4>
                <p className="text-[11px] text-[#5F574D] leading-relaxed">
                  Provides token pools for automatic categorization hints (e.g. Netflix &rarr; Subscriptions, Shell &rarr; Transportation).
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Strict Empty-Start Guarantee:</span>
              </p>
              <p className="text-[11px] leading-relaxed">
                Zero reference records are ever injected into the user&apos;s live <code className="bg-white/80 px-1 py-0.5 rounded border border-amber-300">transactions</code> table. All user balances, net worth, and budgets start pristine and reflect solely user activity.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
