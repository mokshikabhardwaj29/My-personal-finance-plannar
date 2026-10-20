/**
 * Reference Datasets Integration Layer:
 * 1. "Income, savings and spending trends"
 * 2. "Personal Budget Transactions Dataset"
 *
 * STRICT CONTRACT:
 * - Empty-Start: NEVER injected as live user records.
 * - Used exclusively as:
 *   a) Synthetic test fixtures for automated CSV import verification
 *   b) Normalization lookup dictionaries for recurring pattern algorithms (cadence & interval mapping)
 *   c) Categorization and tagging keyword training pools
 */

// ============================================================================
// 1. Normalization & Recurring Pattern Lookup Dictionaries
// Derived from "Income, savings and spending trends" & "Personal Budget"
// ============================================================================

export interface CadenceDefinition {
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  minDays: number;
  maxDays: number;
  nominalDays: number;
  toleranceRatio: number;
}

export const CADENCE_DICTIONARY: Record<string, CadenceDefinition> = {
  weekly: {
    cadence: 'weekly',
    minDays: 5,
    maxDays: 9,
    nominalDays: 7,
    toleranceRatio: 0.25,
  },
  biweekly: {
    cadence: 'biweekly',
    minDays: 11,
    maxDays: 17,
    nominalDays: 14,
    toleranceRatio: 0.2,
  },
  monthly: {
    cadence: 'monthly',
    minDays: 26,
    maxDays: 34,
    nominalDays: 30,
    toleranceRatio: 0.15,
  },
  quarterly: {
    cadence: 'quarterly',
    minDays: 80,
    maxDays: 100,
    nominalDays: 91,
    toleranceRatio: 0.12,
  },
  annual: {
    cadence: 'annual',
    minDays: 350,
    maxDays: 380,
    nominalDays: 365,
    toleranceRatio: 0.08,
  },
};

/**
 * Keyword training pool for recurring categories derived from reference datasets
 */
export const CATEGORY_TRAINING_POOL: Record<string, { keywords: string[]; defaultType: 'expense' | 'income'; defaultTags: string[] }> = {
  Housing: {
    keywords: ['rent', 'mortgage', 'landlord', 'realty', 'property management', 'hoa', 'condo fee', 'apartment'],
    defaultType: 'expense',
    defaultTags: ['fixed-cost', 'essential'],
  },
  Utilities: {
    keywords: [
      'electric', 'power', 'pge', 'edison', 'coned', 'gas company', 'water bill',
      'city water', 'trash', 'waste management', 'sewer', 'internet', 'comcast',
      'xfinity', 'verizon', 'at&t', 'spectrum', 'broadband', 'energy'
    ],
    defaultType: 'expense',
    defaultTags: ['utilities', 'monthly'],
  },
  Subscriptions: {
    keywords: [
      'netflix', 'spotify', 'apple', 'hulu', 'disney', 'youtube', 'amazon prime',
      'icloud', 'dropbox', 'github', 'openai', 'chatgpt', 'gym', 'planet fitness',
      'canva', 'adobe', 'playstation', 'xbox', 'patreon', 'sub', 'membership'
    ],
    defaultType: 'expense',
    defaultTags: ['digital', 'recurring'],
  },
  Groceries: {
    keywords: [
      'trader joe', 'whole foods', 'safeway', 'kroger', 'costco', 'walmart supercenter',
      'aldi', 'sprouts', 'heb', 'supermarket', 'market', 'produce', 'grocer'
    ],
    defaultType: 'expense',
    defaultTags: ['food', 'essential'],
  },
  Dining: {
    keywords: [
      'starbucks', 'mcdonald', 'chipotle', 'uber eats', 'doordash', 'grubhub',
      'cafe', 'coffee', 'bakery', 'restaurant', 'pizza', 'diner', 'bistro', 'bar & grill'
    ],
    defaultType: 'expense',
    defaultTags: ['food', 'discretionary'],
  },
  Transportation: {
    keywords: [
      'uber', 'lyft', 'shell', 'chevron', 'exxon', 'bp gas', 'subway', 'metro',
      'mta', 'transit', 'parking', 'toll', 'fasTrak', 'car payment', 'auto loan'
    ],
    defaultType: 'expense',
    defaultTags: ['transit'],
  },
  Insurance: {
    keywords: ['geico', 'progressive', 'state farm', 'allstate', 'liberty mutual', 'health insurance', 'aetna', 'blue cross', 'metlife'],
    defaultType: 'expense',
    defaultTags: ['fixed-cost', 'protection'],
  },
  Health: {
    keywords: ['cvs', 'walgreens', 'pharmacy', 'clinic', 'dental', 'doctor', 'hospital', 'labcorp', 'vision'],
    defaultType: 'expense',
    defaultTags: ['wellness'],
  },
  Income: {
    keywords: ['payroll', 'salary', 'direct deposit', 'employer', 'stripe payout', 'upwork', 'freelance', 'dividend', 'interest payment'],
    defaultType: 'income',
    defaultTags: ['earnings'],
  },
};

// ============================================================================
// 2. Synthetic Test Fixtures (Strictly for automated verification & testing)
// ============================================================================

/**
 * Synthetic CSV fixture representing "Income, savings and spending trends"
 */
export const SYNTHETIC_FIXTURE_INCOME_TRENDS_CSV = `Date,Merchant,Category,Amount,Type,Account
2026-08-01,Acme Corp Payroll,Income,3500.00,income,Main Checking
2026-08-05,Oakridge Properties Rent,Housing,1450.00,expense,Main Checking
2026-08-10,PG&E Energy Utility,Utilities,112.40,expense,Main Checking
2026-08-15,Acme Corp Payroll,Income,3500.00,income,Main Checking
2026-08-18,Metropolitan Water District,Utilities,48.20,expense,Main Checking
2026-09-01,Acme Corp Payroll,Income,3500.00,income,Main Checking
2026-09-05,Oakridge Properties Rent,Housing,1450.00,expense,Main Checking
2026-09-10,PG&E Energy Utility,Utilities,118.75,expense,Main Checking
2026-09-15,Acme Corp Payroll,Income,3500.00,income,Main Checking
`;

/**
 * Synthetic CSV fixture representing "Personal Budget Transactions Dataset"
 */
export const SYNTHETIC_FIXTURE_PERSONAL_BUDGET_CSV = `Date,Merchant,Category,Amount,Type,Account
2026-09-02,Trader Joe's #104,Groceries,84.50,expense,Everyday Visa
2026-09-03,Netflix.com,Subscriptions,15.49,expense,Everyday Visa
2026-09-04,Shell Oil 9214,Transportation,45.20,expense,Everyday Visa
2026-09-07,Starbucks Coffee 2819,Dining,6.75,expense,Rewards Card
2026-09-10,Whole Foods Market,Groceries,92.10,expense,Everyday Visa
2026-09-15,Spotify USA,Subscriptions,10.99,expense,Rewards Card
2026-09-18,Chevron 0041,Transportation,48.00,expense,Everyday Visa
2026-09-21,CVS Pharmacy #3812,Health,24.15,expense,Everyday Visa
2026-10-03,Netflix.com,Subscriptions,15.49,expense,Everyday Visa
2026-10-15,Spotify USA,Subscriptions,10.99,expense,Rewards Card
`;

/**
 * Compute the canonical fingerprint per master specification:
 * date + "/" + merchant.trim().toLowerCase() + " " + amount.toFixed(2) + " " + account.trim().toLowerCase()
 */
export function computeCanonicalFingerprint(
  date: string,
  merchant: string,
  amount: number,
  account: string
): string {
  const cleanMerchant = merchant.trim().toLowerCase();
  const cleanAccount = account.trim().toLowerCase();
  const cleanAmount = Number(amount).toFixed(2);
  return `${date}/${cleanMerchant} ${cleanAmount} ${cleanAccount}`;
}

/**
 * Classifies merchant into probable category and default tags using the training pool
 */
export function classifyFromTrainingPool(merchant: string): {
  category: string;
  type: 'expense' | 'income';
  tags: string[];
} {
  const norm = merchant.toLowerCase().trim();

  for (const [catName, def] of Object.entries(CATEGORY_TRAINING_POOL)) {
    for (const kw of def.keywords) {
      if (norm.includes(kw)) {
        return {
          category: catName,
          type: def.defaultType,
          tags: [...def.defaultTags],
        };
      }
    }
  }

  return {
    category: 'Needs review',
    type: 'expense',
    tags: [],
  };
}
