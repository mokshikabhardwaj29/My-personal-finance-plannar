import { TransactionRow } from './db.js';
import { CADENCE_DICTIONARY, CATEGORY_TRAINING_POOL } from './referenceDatasets.js';

export interface DetectionSuggestion {
  patternKey: string;
  kind: 'subscription' | 'recurring';
  merchant: string;
  normalizedMerchant: string;
  category: string;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  occurrenceCount: number;
  confidence: 'High confidence' | 'Likely';
  averageAmount: number;
  monthlyEquivalent: number;
  annualEquivalent: number;
  lastDate: string;
  nextExpectedDate: string;
  amountVariationPercent: number;
}

const SUBSCRIPTION_HINTS = [
  ...CATEGORY_TRAINING_POOL.Subscriptions.keywords,
  'netflix', 'spotify', 'hulu', 'disney', 'youtube', 'icloud', 'dropbox',
  'adobe', 'microsoft', 'amazon prime', 'patreon', 'membership', 'studio',
  'gym', 'openai', 'chatgpt', 'canva', 'notion', 'zoom', 'slack', 'github',
  'apple', 'google play', 'sub', 'subscription'
];

const RECURRING_HINTS = [
  ...CATEGORY_TRAINING_POOL.Housing.keywords,
  ...CATEGORY_TRAINING_POOL.Utilities.keywords,
  ...CATEGORY_TRAINING_POOL.Insurance.keywords,
  'mortgage', 'rent', 'loan', 'insurance', 'utility', 'utilities', 'electric',
  'water', 'internet', 'phone', 'mobile', 'daycare', 'tuition', 'lease',
  'car payment', 'auto payment', 'hoa', 'property tax', 'gas bill', 'trash',
  'sewer', 'verizon', 'att', 't-mobile', 'comcast', 'xfinity'
];

export function normalizeMerchant(raw: string): string {
  let s = raw.toLowerCase().trim();
  // Remove reference numbers, long sequences of digits (like card last 4 or auth IDs: 123456+)
  s = s.replace(/\b\d{5,}\b/g, '');
  // Remove terminal '#' followed by numbers (e.g. "Store #1234")
  s = s.replace(/#\s*\d+/g, '');
  // Strip punctuation except spaces and letters
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function calculateNextDate(lastDateStr: string, cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'): string {
  const [year, month, day] = lastDateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  if (cadence === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (cadence === 'biweekly') {
    d.setDate(d.getDate() + 14);
  } else if (cadence === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else if (cadence === 'quarterly') {
    d.setMonth(d.getMonth() + 3);
  } else if (cadence === 'annual') {
    d.setFullYear(d.getFullYear() + 1);
  }

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function detectRecurringPatterns(
  transactions: TransactionRow[],
  dismissedPatternKeys: string[] = []
): { subscriptions: DetectionSuggestion[]; recurring: DetectionSuggestion[] } {
  const dismissedSet = new Set(dismissedPatternKeys);

  // Filter expenses
  const expenses = transactions.filter((t) => t.type === 'expense');

  // Group by normalized merchant
  const groups: Record<string, TransactionRow[]> = {};
  for (const tx of expenses) {
    const norm = normalizeMerchant(tx.merchant);
    if (!norm) continue;
    if (!groups[norm]) groups[norm] = [];
    groups[norm].push(tx);
  }

  const suggestions: DetectionSuggestion[] = [];

  for (const [normMerchant, txList] of Object.entries(groups)) {
    // Require at least two unique transaction dates
    const uniqueDates = Array.from(new Set(txList.map((t) => t.date))).sort();
    if (uniqueDates.length < 2) continue;

    // Sort transactions by date ascending
    const sortedTxs = [...txList].sort((a, b) => a.date.localeCompare(b.date));

    // Calculate consecutive-day intervals
    const intervals: number[] = [];
    for (let i = 1; i < uniqueDates.length; i++) {
      const d1 = new Date(uniqueDates[i - 1] + 'T00:00:00Z').getTime();
      const d2 = new Date(uniqueDates[i] + 'T00:00:00Z').getTime();
      const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    if (intervals.length === 0) continue;

    // Find dominant interval window
    let weeklyCount = 0;
    let biweeklyCount = 0;
    let monthlyCount = 0;
    let quarterlyCount = 0;
    let annualCount = 0;

    for (const interval of intervals) {
      if (interval >= 5 && interval <= 9) weeklyCount++;
      else if (interval >= 12 && interval <= 17) biweeklyCount++;
      else if (interval >= 24 && interval <= 40) monthlyCount++;
      else if (interval >= 75 && interval <= 110) quarterlyCount++;
      else if (interval >= 330 && interval <= 400) annualCount++;
    }

    let cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | null = null;
    let maxMatches = 0;

    if (monthlyCount > maxMatches) {
      maxMatches = monthlyCount;
      cadence = 'monthly';
    }
    if (biweeklyCount > maxMatches) {
      maxMatches = biweeklyCount;
      cadence = 'biweekly';
    }
    if (weeklyCount > maxMatches) {
      maxMatches = weeklyCount;
      cadence = 'weekly';
    }
    if (quarterlyCount > maxMatches) {
      maxMatches = quarterlyCount;
      cadence = 'quarterly';
    }
    if (annualCount > maxMatches) {
      maxMatches = annualCount;
      cadence = 'annual';
    }

    // Must match at least half the intervals to be a candidate
    if (!cadence || maxMatches < intervals.length / 2) {
      continue;
    }

    // Amount calculations
    const amounts = sortedTxs.map((t) => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);
    const amountVariationPercent = avgAmount > 0 ? ((maxAmount - minAmount) / avgAmount) * 100 : 0;

    // Hint evaluation
    const sampleCategory = (sortedTxs[0].category || '').toLowerCase();
    const sampleTags = (sortedTxs[0].tags || []).map((t) => t.toLowerCase()).join(' ');

    const hasSubHint =
      SUBSCRIPTION_HINTS.some((h) => normMerchant.includes(h) || sampleCategory.includes(h) || sampleTags.includes(h));

    const hasRecHint =
      RECURRING_HINTS.some((h) => normMerchant.includes(h) || sampleCategory.includes(h) || sampleTags.includes(h));

    // Determine candidate kind
    let kind: 'subscription' | 'recurring' = hasSubHint ? 'subscription' : 'recurring';

    // Variation limits
    if (kind === 'subscription' && amountVariationPercent > 20) {
      // If it doesn't pass subscription 20%, maybe it fits recurring 35%
      if (amountVariationPercent <= 35) {
        kind = 'recurring';
      } else {
        continue;
      }
    } else if (kind === 'recurring' && amountVariationPercent > 35) {
      continue;
    }

    // False positive protection (Section 10.5):
    // A merchant with no strong hint can be suggested only after at least 3 stable monthly, quarterly, or annual occurrences with no more than 3% amount variation.
    if (!hasSubHint && !hasRecHint) {
      if (uniqueDates.length < 3) continue;
      if (cadence !== 'monthly' && cadence !== 'quarterly' && cadence !== 'annual') continue;
      if (amountVariationPercent > 3) continue;
    }

    // Interval jitter
    let maxJitter = 0;
    const expectedInterval =
      cadence === 'weekly' ? 7 : cadence === 'biweekly' ? 14 : cadence === 'monthly' ? 30 : cadence === 'quarterly' ? 90 : 365;
    for (const iv of intervals) {
      const jitter = Math.abs(iv - expectedInterval);
      if (jitter > maxJitter) maxJitter = jitter;
    }

    // Confidence scoring
    const isHighConfidence = uniqueDates.length >= 3 && amountVariationPercent <= 12 && maxJitter <= 5;
    const confidence: 'High confidence' | 'Likely' = isHighConfidence ? 'High confidence' : 'Likely';

    // Monthly and Annual equivalents
    let monthlyEquivalent = avgAmount;
    let annualEquivalent = avgAmount * 12;
    if (cadence === 'weekly') {
      monthlyEquivalent = (avgAmount * 52) / 12;
      annualEquivalent = avgAmount * 52;
    } else if (cadence === 'biweekly') {
      monthlyEquivalent = (avgAmount * 26) / 12;
      annualEquivalent = avgAmount * 26;
    } else if (cadence === 'quarterly') {
      monthlyEquivalent = avgAmount / 3;
      annualEquivalent = avgAmount * 4;
    } else if (cadence === 'annual') {
      monthlyEquivalent = avgAmount / 12;
      annualEquivalent = avgAmount;
    }

    const lastTx = sortedTxs[sortedTxs.length - 1];
    const nextExpectedDate = calculateNextDate(lastTx.date, cadence);
    const patternKey = `${kind}:${normMerchant}:${cadence}`;

    if (dismissedSet.has(patternKey)) {
      continue;
    }

    suggestions.push({
      patternKey,
      kind,
      merchant: lastTx.merchant,
      normalizedMerchant: normMerchant,
      category: lastTx.category || (kind === 'subscription' ? 'Subscriptions' : 'Utilities'),
      cadence,
      occurrenceCount: uniqueDates.length,
      confidence,
      averageAmount: Number(avgAmount.toFixed(2)),
      monthlyEquivalent: Number(monthlyEquivalent.toFixed(2)),
      annualEquivalent: Number(annualEquivalent.toFixed(2)),
      lastDate: lastTx.date,
      nextExpectedDate,
      amountVariationPercent: Number(amountVariationPercent.toFixed(1)),
    });
  }

  return {
    subscriptions: suggestions.filter((s) => s.kind === 'subscription'),
    recurring: suggestions.filter((s) => s.kind === 'recurring'),
  };
}
