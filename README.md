# NotePay

**Learn Money. Plan Smarter. Grow Confidently.**

NotePay is a child-friendly financial literacy experience built on the existing Ledgerly codebase. It helps young people practise money decisions with family guidance.

## Learning experiences

- **Pocket Planner:** set pocket money, a savings goal, progress so far, and a daily spending plan.
- **Spending Calendar:** view saved expense transactions by day. Colours compare recorded expenses with the daily plan: neutral for no recorded spending, mint for within plan, yellow for approaching the plan, and coral for above plan.
- **Simple Interest Lab:** experiment with principal, annual rate, and time using SI = (P × R × T) / 100.
- **Learn & Ask Penny:** reuse the existing Kids Academy and server-side Gemini tutor integration.

The planner saves to the existing preferences store; the calendar reads real saved transactions. The UI does not invent transaction history.

## Development

Install dependencies with `npm install`, then run `npm run dev`. Run `npm run lint` and `npm run build` before deploying.

Configure secrets in the server environment, not in frontend code. The AI tutor can use `GEMINI_API_KEY`; scheduled Drive sync requires an explicitly configured `DRIVE_SYNC_TOKEN` or Cloudflare secret.

## Data and security notes

- This refactor does not reset or migrate the existing financial records.
- The current Node server stores application data in local JSON files under `.data/`; that storage is not a substitute for a configured production database and may not persist on ephemeral hosts.
- The planner currently uses the existing preferences storage model. Before onboarding unrelated families to a production deployment, finish tenant/family-level data isolation across all financial records and preferences.
- Protected API routes now deny requests that have no explicit permission rule. Review the route map whenever adding an endpoint.
- Configure service secrets before enabling scheduled Drive sync. Default hard-coded service/owner secrets have been removed from the Cloudflare authentication fallback.

## Important

This branch has not been executed against a live deployment by the refactoring assistant. Run the checks above and test registration, sign-in, sign-out, child access, planner persistence, and the spending calendar before merging.
