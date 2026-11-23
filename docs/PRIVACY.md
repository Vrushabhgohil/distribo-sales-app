# Location Privacy & Telemetry Policy (DPDP Act 2023)

**Application**: Motiba — FMCG Sales & Distribution Management Platform  
**Effective Date**: November 23, 2026  
**Standard**: Digital Personal Data Protection Act, 2023 (India)

---

## 1. Overview & Data Fiduciary

Motiba ("Company", "Data Fiduciary") operates an enterprise field sales and logistics distribution system for authorized sales representatives (`sales_person`) and delivery pilots (`delivery_person`) ("Data Principals").

This document sets forth our personal data processing practices, specifically governing device GPS location tracking, telemetry ingestion, storage limitation, and worker privacy protections in strict compliance with the **Digital Personal Data Protection Act (DPDP Act), 2023**.

---

## 2. Notice & Consent Architecture (Sections 5 & 6, DPDP Act 2023)

### 2.1 First-Run Itemized Consent Notice
Prior to invoking device background location permission dialogs or ingesting GPS telemetry:
1. The application presents an unambiguous, itemized modal notice outlining:
   - **Purpose**: Beat route navigation, retail store check-ins, and verified order delivery drops.
   - **Data Types**: GPS latitude, longitude, timestamp, travel status (`online`, `travelling`, `on_visit`, `idle`), and store drop identifier.
   - **Retention Horizon**: 90-day automatic purge.
2. The user must provide affirmative consent ("I Agree & Continue").
3. Consent records are immutably archived server-side in `public.location_consents` and linked to the user's profile with:
   - User ID (`auth.users.id`)
   - Role (`sales_person` or `delivery_person`)
   - Consent version string (e.g. `2026.1-DPDP`)
   - Timestamp (`consented_at` with microsecond precision)

---

## 3. Purpose Limitation (Section 7, DPDP Act 2023)

Location data is processed **exclusively** for legitimate employment-related field operations:
- Verifying physical presence at retail outlets during beat visits.
- Calculating accurate inter-store travel distances and travel allowance claims.
- Providing delivery pilots with turn-by-turn navigation to retail stores.
- Enabling warehouse dispatchers to coordinate delivery drops.

Location telemetry is **never**:
- Sold, rented, or shared with third-party advertisers or data brokers.
- Used for continuous personal surveillance outside scheduled business duties.
- Interpolated into client-side queries or exposed to unauthorized users.

---

## 4. Shift-Bound Telemetry & Data Minimization

To adhere strictly to data minimization principles:

### 4.1 Explicit Shift Boundaries
- Telemetry collection is bound strictly to an active work shift (`isShiftActive === true`).
- Outside of an active shift, all location tracking (both foreground watch and background worker tasks) is halted.
- The background task (`MOTIBA_BACKGROUND_LOCATION_TASK`) validates that:
  1. The user possesses a valid, unexpired Supabase Auth session.
  2. The local shift state `@motiba_shift_active` is explicitly set to `'true'`.
  If either condition fails, zero telemetry is transmitted or persisted.

### 4.2 Sign-Out Teardown
When a user signs out:
- Foreground GPS subscriptions are immediately canceled.
- The background task is unregistered from the OS via `TaskManager.isTaskRegisteredAsync` and `Location.stopLocationUpdatesAsync`.
- Shift indicators, cached telemetry coordinates, and offline queued locations are completely wiped from device storage.

### 4.3 24-Hour Ingest Cutoff
- Telemetry pings timestamped older than 24 hours are dropped by the client before network transmission.
- At the database tier, the `validate_location_ping()` trigger automatically rejects any telemetry insert where `recorded_at < now() - INTERVAL '24 hours'`.

---

## 5. Storage Limitation & 90-Day Retention Purge

Under Section 8(7) of the DPDP Act 2023, personal data must be erased as soon as the specified purpose is no longer served:

1. **Retention Horizon**: All location breadcrumbs in `public.location_history` have an authoritative retention lifetime of **90 days**.
2. **Automated Purge Routine**:
   - The PostgreSQL stored procedure `public.purge_expired_location_history()` executes daily via `pg_cron` at `03:00 UTC`:
     ```sql
     SELECT public.purge_expired_location_history();
     ```
   - All rows where `recorded_at < now() - INTERVAL '90 days'` are deleted permanently.
3. **Database Indexing**:
   - `idx_location_history_recorded_at` facilitates $O(\log n)$ identification and deletion of expired partitions without locking active operations.

---

## 6. Access Control & Row Level Security (RLS)

- **Row Level Security**: Enabled and forced across `public.location_history` and `public.location_consents`.
- **Role Isolation**:
  - `sales_person` users can strictly insert and query rows where `salesperson_id = current_salesperson_id()`.
  - `delivery_person` users can strictly insert and query rows where `delivery_person_id = current_delivery_person_id()`.
  - Anonymous (`anon`) role permissions are revoked (`GRANT NONE`).
  - `UPDATE` and `DELETE` operations on telemetry tables are strictly denied to all client roles.

---

## 7. Data Principal Rights & Consent Withdrawal

Employees and delivery pilots enjoy the following statutory rights under the DPDP Act 2023:
1. **Right to Access & Review**: Users can view their recorded route history within the Motiba application under "Route Telemetry".
2. **Right to Withdraw Consent**: Users can revoke location permissions at any time via device OS settings.
3. **Right to Grievance Redressal**: Any privacy concerns, data access requests, or rectification inquiries may be escalated to the Data Protection Officer.

---

## 8. Grievance Redressal

**Data Protection & Privacy Officer**  
Motiba Logistics & Sales Operations  
Email: privacy@motiba.example.com  
Grievance Response SLA: Within 7 business days
