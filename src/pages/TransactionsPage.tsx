import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Upload,
  Receipt,
  Tag as TagIcon,
  X,
  Trash2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Transaction, PeriodKey, GameState } from '../types';
import { Penny } from '../components/Penny';
import { filterTransactionsByPeriod } from './DashboardPage';
import { formatRupee } from '../utils/format';

interface TransactionsPageProps {
  transactions: Transaction[];
  categories: string[];
  accounts: string[];
  allTags: string[];
  game: GameState;
  selectedPeriod: PeriodKey;
  onSelectPeriod: (period: PeriodKey) => void;
  onUpdateCategory: (id: string, newCategory: string) => Promise<void>;
  onRemoveTag: (id: string, tagToRemove: string) => Promise<void>;
  onOpenTagModal: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onOpenAddEntry: () => void;
  onOpenImport: () => void;
}

export const TransactionsPage: React.FC<TransactionsPageProps> = ({
  transactions,
  categories,
  accounts,
  allTags,
  game,
  selectedPeriod,
  onSelectPeriod,
  onUpdateCategory,
  onRemoveTag,
  onOpenTagModal,
  onDeleteTransaction,
  onOpenAddEntry,
  onOpenImport,
}) => {
  const [search, setSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingCategoryTxId, setEditingCategoryTxId] = useState<string | null>(null);

  // Period filter
  const periodFiltered = filterTransactionsByPeriod(transactions, selectedPeriod);

  // Search & Filter
  const filteredTransactions = periodFiltered.filter((tx) => {
    if (selectedAccount !== 'all' && tx.account !== selectedAccount) return false;
    if (selectedCategory !== 'all' && tx.category !== selectedCategory) return false;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchMerchant = tx.merchant.toLowerCase().includes(q);
      const matchCategory = tx.category.toLowerCase().includes(q);
      const matchTags = tx.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchMerchant && !matchCategory && !matchTags) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-[#23201C] tracking-tight">Transactions 🪙</h1>
          <p className="text-xs font-bold text-stone-500 mt-0.5">View, search, categorize, and tag all financial entries.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold text-stone-700 bg-white border-2 border-[#E7DECE] hover:bg-stone-50 transition shadow-2xs"
          >
            <Upload className="w-4 h-4 text-[#7f27a8]" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={onOpenAddEntry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black text-white bg-[#f76400] hover:bg-[#ea580c] transition shadow-[0_3px_0_0_#9a3412] hover:translate-y-[-1px] active:translate-y-[2px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Filter Strip */}
      <div className="bg-white p-4 rounded-3xl border-2 border-[#E7DECE] shadow-[0_3px_0_0_#DCD1BF] space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by merchant, category, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-medium pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 outline-none"
            />
          </div>

          {/* Account Filter */}
          <div className="w-full sm:w-44">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 outline-none bg-white"
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="w-full sm:w-44">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 outline-none bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Shared Working Date Period Selector */}
        <div className="flex items-center gap-1.5 pt-3 border-t border-stone-100 overflow-x-auto text-xs font-bold">
          <span className="text-stone-400 font-black uppercase tracking-wider text-[10px] shrink-0 mr-1">
            Period:
          </span>
          {(
            [
              { key: 'all-time', label: 'All Time' },
              { key: 'this-month', label: 'This Month' },
              { key: 'last-month', label: 'Last Month' },
              { key: 'last-3-months', label: 'Last 3 Mos' },
              { key: 'last-6-months', label: 'Last 6 Mos' },
              { key: 'this-year', label: 'This Year' },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelectPeriod(p.key)}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 ${
                selectedPeriod === p.key
                  ? 'bg-[#7f27a8] text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-[#ffd400]/25'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions List / Table */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-dashed border-gray-200 text-center flex flex-col items-center justify-center">
          <Penny mood="curious" size={60} showSpeech={false} enabled={game.profile?.showPenny} />
          <h3 className="text-base font-bold text-gray-800 mt-3">No transactions found</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1 mb-5">
            {transactions.length === 0
              ? 'Your ledger is empty. Add a manual entry or import a CSV statement to get started!'
              : 'No transactions match the selected filters or search terms.'}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onOpenAddEntry}
              className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold shadow hover:bg-violet-700 transition"
            >
              Add Entry (+10 XP)
            </button>
            <button
              type="button"
              onClick={onOpenImport}
              className="px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold hover:bg-gray-200 transition"
            >
              Import CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border-2 border-[#E7DECE] shadow-[0_3px_0_0_#DCD1BF] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#E7DECE] text-[11px] font-bold uppercase tracking-wider text-[#686052]">
                  <th className="py-3.5 px-4 md:px-6">Date & Merchant</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Account</th>
                  <th className="py-3.5 px-4">Tags</th>
                  <th className="py-3.5 px-4 md:px-6 text-right">Amount (₹)</th>
                  <th className="py-3.5 px-4 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#FAF8F5] transition group">
                    {/* Date & Merchant */}
                    <td className="py-3.5 px-4 md:px-6">
                      <div className="flex items-center gap-2">
                        {tx.receipt === 1 && (
                          <span title="Receipt attached" className="text-violet-600">
                            <Receipt className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <div>
                          <p className="font-bold text-[#23201C] text-sm truncate max-w-[200px] sm:max-w-xs">
                            {tx.merchant}
                          </p>
                          <p className="text-[11px] text-gray-400">{tx.date}</p>
                        </div>
                      </div>
                    </td>

                    {/* Inline Category Dropdown (Section 8.1) */}
                    <td className="py-3.5 px-4">
                      <select
                        value={tx.category}
                        onChange={async (e) => {
                          const newCat = e.target.value;
                          await onUpdateCategory(tx.id, newCat);
                        }}
                        className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border outline-none transition cursor-pointer ${
                          tx.category === 'Needs review'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 font-bold'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-violet-300'
                        }`}
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Account */}
                    <td className="py-3.5 px-4 hidden md:table-cell text-gray-600 font-medium">
                      {tx.account}
                    </td>

                    {/* Tags (Section 8.2 removable pills + TagModal adder) */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1">
                        {tx.tags && tx.tags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-medium border border-violet-100 group/pill"
                          >
                            <span>#{t}</span>
                            <button
                              type="button"
                              onClick={() => onRemoveTag(tx.id, t)}
                              className="text-violet-400 hover:text-violet-700 rounded-full"
                              title={`Remove tag #${t}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        {/* Plus button to open Tag modal */}
                        <button
                          type="button"
                          onClick={() => onOpenTagModal(tx)}
                          className="w-5 h-5 rounded-full bg-gray-100 hover:bg-violet-100 text-gray-500 hover:text-violet-700 flex items-center justify-center transition text-xs font-bold"
                          title="Add / Edit Tags"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Signed Amount in Rupees */}
                    <td className="py-3.5 px-4 md:px-6 text-right whitespace-nowrap">
                      <span
                        className={`font-black text-sm ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-[#23201C]'
                        }`}
                      >
                        {formatRupee(tx.amount, { alwaysSign: true })}
                      </span>
                    </td>

                    {/* Delete action */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm(`Delete transaction "${tx.merchant}" (${formatRupee(tx.amount)})?`)) {
                            await onDeleteTransaction(tx.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
