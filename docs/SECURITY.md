# Security Architecture & Operations Guide (Motiba Sales App)

## 1. Executive Summary & Threat Model
The Motiba Sales & Distribution Mobile Application operates in a field FMCG distribution environment spanning sales personnel and delivery pilots. Threat vectors identified and remediated across the application include:

- **Client Manipulation of Business State**: Preventing client-side calculations of order prices, credit balances, payment amounts, and inventory updates through database-level `SECURITY DEFINER` RPCs and constraints.
- **Unauthorized Horizontal & Vertical Privilege Escalation**: Restricting anonymous access and isolating records per authenticated role (`sales_person`, `delivery_person`, and Central Administrator) via Row Level Security (RLS).
- **Credential & Session Theft**: Eliminating raw password storage, migrating to Supabase Auth with server-side employee resolution, and securing tokens inside hardware-backed encrypted storage.
- **Injection & Data Tampering**: Enforcing strict Zod validation on all API payloads, query parameter sanitation, and elimination of PostgREST dynamic string interpolations.
- **Unauthorized Background Location Surveillance**: Adhering to the Digital Personal Data Protection (DPDP) Act 2023 with shift-bound tracking, granular consent logging, and 90-day automated data purges.

---

## 2. Row Level Security (RLS) Matrix
All 18 application tables have RLS **enabled and forced** (`FORCE ROW LEVEL SECURITY`), with public (`anon`) privileges revoked.

| Table | `anon` | `sales_person` | `delivery_person` | Server RPC / Service Role |
| :--- | :--- | :--- | :--- | :--- |
| `profiles` | Denied | Read self (`user_id = auth.uid()`) | Read self (`user_id = auth.uid()`) | Manage roles & approval status |
| `stores` | Denied | Read/Write assigned stores | Read assigned delivery stores | Full access |
| `products` | Denied | Read active products | Read active products | Catalog maintenance |
| `categories` | Denied | Read | Read | Full access |
| `brands` | Denied | Read | Read | Full access |
| `orders` | Denied | Read own orders; create via RPC | Read assigned delivery orders | Transition status via RPC |
| `order_items` | Denied | Read own order items | Read assigned delivery order items | Inserted atomically by RPC |
| `ledger_transactions` | Denied | Read store ledger; record via RPC | Read store ledger | Recorded atomically by RPC |
| `store_visits` | Denied | Read/Write own visits | Denied | Audit reporting |
| `follow_ups` | Denied | Read/Write own follow-ups | Denied | Management |
| `location_history` | Denied | Denied (telemetry ping only) | Insert own shift ping (`delivery_person_id`) | 90-day retention purge |
| `location_consents` | Denied | Read self | Read self; record via RPC | Compliance verification |
| `delivery_assignments`| Denied | Denied | Read own assignments; update via RPC | Dispatch routing |
| `warehouses` | Denied | Denied | Read pickup origin warehouse | Central inventory |
| `inventory` | Denied | Denied | Denied | Managed by order/delivery RPCs |
| `inventory_reservations`| Denied | Denied | Denied | Managed by order/delivery RPCs |
| `stock_movements` | Denied | Denied | Denied | Inserted by order/delivery RPCs |
| `notifications` | Denied | Read/Update own notifications | Read/Update own notifications | Triggered by RPCs |

---

## 3. Server-Enforced Business Logic & RPCs
Critical financial and logistical operations must never be computed or directly updated by mobile clients:

1. **`create_order`**:
   - Locks products, calculates price according to product master data.
   - Enforces minimum order quantities (MOQ).
   - Generates sequential order numbers.
   - Inserts header, items, and notifications in one atomic transaction.
2. **`record_payment`**:
   - Validates positive amount (`amount > 0`).
   - Locks store record and inserts ledger transaction with server timestamp.
   - Updates `outstanding_balance` atomically on the database server.
3. **`confirm_pickup`, `start_delivery`, `complete_delivery`**:
   - Verifies assignment ownership (`delivery_person_id = auth.uid()`).
   - Atomically updates store ledger, records inventory movements, and marks assignment milestones.
4. **`resolve_login_identifier`**:
   - Resolves email from either email or employee ID with generic error message to prevent account enumeration.

---

## 4. Mobile Secrets & Configuration Handling
- **No Hardcoded Secrets**: Secrets, service role keys, and production URLs are prohibited in source code.
- **Strict Validation**: All environment variables are validated at app boot via Zod in `lib/config.ts`. The app terminates execution immediately if required variables are absent.
- **Secure Token Storage**: User sessions are persisted using hardware-backed SecureStore (`expo-secure-store`) with chunked storage to bypass size limitations on mobile operating systems.
- **Full Logout Wipe**: On logout, all `@motiba_*` storage keys, query caches, and local drafts are purged.

---

## 5. Security Incident Response
In the event of a security anomaly or leaked credential:
1. **Rotate Keys**: Immediately rotate Supabase Anon and Service Role keys in the Supabase Dashboard.
2. **Revoke Active Sessions**: Terminate all active refresh tokens in Supabase Auth.
3. **Deploy Emergency Update**: Release an over-the-air update (`eas update`) or binary rebuild with the rotated configuration.
4. **Report & Log**: Document incident timeline and affected data scopes in compliance with DPDP Act regulatory obligations.
