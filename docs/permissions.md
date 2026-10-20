# Ledgerly Route-by-Route Permissions Matrix

This document defines the central authorization rules enforced by `server/authorizationMiddleware.ts`.  
Every API endpoint registered in Ledgerly must have a corresponding entry in this matrix. Automated tests (`server/verifyMultiUserAuth.ts`) validate that every registered API route has an entry and enforce access controls.

## Permissions Matrix

| Route | Method | Allowed Roles | Scope Check | Test Name |
| :--- | :--- | :--- | :--- | :--- |
| `/api/database/status` | `GET` | `owner` | Family isolation | `Database status owner only` |
| `/api/database/tables/:tableName` | `GET` | `owner` | Family isolation | `Database table rows owner only` |
| `/api/database/query` | `POST` | `owner` | Family isolation, SELECT only | `Database SQL query console owner only` |
| `/api/database/verify` | `POST` | `owner` | System invariant integrity | `Database verification suite owner only` |
| `/api/family/members` | `GET` | `owner`, `parent` | Scoped to session's `family_id` | `Family members list for parent and owner` |
| `/api/family/children` | `POST` | `owner`, `parent` | Mandatory India DPDP Act 2023 verifiable parental consent | `Child creation with consent for parent and owner` |
| `/api/family/children/:id` | `DELETE` | `owner`, `parent` | Parent must have verified `parent_child_links` to target child | `Parent delete only linked child` |
| `/api/family/audit-log` | `GET` | `owner` | Scoped to session's `family_id` | `Audit log inspection owner only` |
| `/api/transactions` | `POST` | `owner`, `parent` | Scoped to session's `family_id` | `Create transaction owner and parent only` |
| `/api/transactions` | `PATCH` | `owner`, `parent` | Scoped to session's `family_id` | `Update transaction owner and parent only` |
| `/api/transactions` | `DELETE` | `owner`, `parent` | Scoped to session's `family_id` | `Delete transaction owner and parent only` |
| `/api/preferences` | `PUT` | `owner`, `parent` | Scoped to session's `family_id` | `Update preferences owner and parent only` |
| `/api/documents` | `POST` | `owner`, `parent` | Scoped to session's `family_id` | `Upload documents owner and parent only` |
| `/api/documents/:id/download` | `GET` | `owner`, `parent` | Scoped to session's `family_id` | `Download receipt owner and parent only` |
| `/api/documents/:id` | `DELETE` | `owner`, `parent` | Scoped to session's `family_id` | `Delete document owner and parent only` |
| `/api/drive-sync` | `GET` | `owner` | Scoped to session's `family_id` | `Drive sync status owner only` |
| `/api/drive-sync` | `POST` | `owner` | Scoped to session's `family_id` or service Bearer bypass | `Drive sync ingest owner only or service bypass` |
| `/api/state` | `DELETE` | `owner` | Scoped to session's `family_id` | `Wipe all data owner only` |
| `/api/game` | `DELETE` | `owner` | Scoped to session's `family_id` | `Reset game progress owner only` |
| `/api/state` | `GET` | `owner`, `parent`, `child` | Child receives strictly filtered view (savings jar & goals; no family accounts or receipts) | `Fetch state role scoped` |
| `/api/game/seen` | `POST` | `owner`, `parent`, `child` | Scoped to user's game events | `Acknowledge game seen all authenticated` |
| `/api/gemini/kids-learn` | `POST` | `owner`, `parent`, `child` | AI tutor sandbox | `Kids academy learning assistant all roles` |
| `/api/auth/me` | `GET` | `owner`, `parent`, `child` | Returns caller's profile and active family membership | `Fetch current profile all authenticated` |
| `/api/auth/onboarding` | `POST` | `owner`, `parent`, `child` | Caller can only update own profile | `Complete onboarding all authenticated` |
| `/api/auth/logout` | `POST` | `owner`, `parent`, `child` | Invalidates caller's active session | `Logout all authenticated` |

## Public Endpoints (Exempt from Authentication)

The following endpoints do not require an active session token:
1. `GET /api/health` - Infrastructure health check
2. `POST /api/auth/register` - New user account creation
3. `POST /api/auth/login` - User login (email & password with rate limiting)
4. `POST /api/auth/verify-email` - Single-use token email activation
5. `POST /api/auth/resend-verification` - Resend activation token
6. `POST /api/auth/forgot-password` - Request password reset token
7. `POST /api/auth/reset-password` - Set new password with single-use token (revokes all active sessions)
8. `POST /api/auth/pin-unlock` - 4-digit PIN quick-switch on trusted devices (rate limited)
9. `GET /api/auth/claim-status` - Checks if primary family ownership has been claimed

## Scope Enforcement Rules

1. **Family Isolation**: All data queries to `transactions`, `documents`, `rules`, `tags`, and `settings` are constrained by the caller's verified `family_id` from their session. Client-supplied family IDs or user IDs are never trusted.
2. **Parent-Child Linkage**: A `parent` role can only view, manage, or delete child accounts where a corresponding record exists in `parent_child_links` (`parent_user_id = auth.user.id AND child_user_id = targetChildId`).
3. **Child Isolation**: A `child` role cannot view checking account balances, family transaction histories, documents/receipts, or settings. They are restricted to their personal savings goals, digital coin jar, rewards, and the Kids Academy.
4. **Owner Exclusivity**: Destructive operations (data wipe, progress reset) and low-level database operations (`/api/database/*`) are restricted exclusively to the `owner` role.
