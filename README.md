# Motiba Sales — FMCG Sales Person Mobile Application

Official cross-platform mobile application for field sales representatives of **Motiba — FMCG Sales & Distribution Management Platform**. Built with **React Native**, **Expo SDK 58**, **TypeScript**, **Expo Router**, and backed directly by **Supabase PostgreSQL & Auth**.

---

## 1. System Architecture & Tech Stack

- **Framework**: React Native with Expo SDK 58
- **Language**: TypeScript (strict mode, zero type errors)
- **Routing**: Expo Router file-based navigation
- **Backend & Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with session persistence (`AsyncStorage`)
- **State Management**: TanStack Query (`@tanstack/react-query`) with cache and offline sync
- **Forms & Validation**: React Hook Form with Zod schemas
- **GPS & Telemetry**: Expo Location (`expo-location`) & Background Task Manager (`expo-task-manager`)
- **Maps Integration**: Cross-platform Google Maps & Native Maps (`react-native-maps` / web preview)
- **UI Design System**: Minimalist SaaS aesthetic, lime accent (`#B7F34A`), deep forest green (`#166534`), charcoal typography (`#20251D`), off-white background (`#F7F8F5`).

---

## 2. Official Application Logo & Branding

The application incorporates the official uploaded logo located at `assets/images/logo.png`.
It is configured across:
- **Splash Screen**: Configured in `app.json` via `expo-splash-screen`
- **Android Adaptive Icon**: Configured with `#16A34A` background and foreground asset
- **iOS App Icon**: Configured at `assets/images/icon.png`
- **Sign-In Branding**: Centered high-resolution badge on `(auth)/login`
- **Dashboard & User Profile**: Avatar badge on the Home and Profile tabs

---

## 3. Navigation & Screen Map

### Primary Bottom Tabs (5 Tabs):
1. **Home (`app/(tabs)/index.tsx`)**: Daily performance stats (visits, bookings, pending admin approval, confirmed), active beat visit banner with timer, quick actions grid, recent orders, and today's completed visits.
2. **Stores (`app/(tabs)/stores.tsx`)**: Beat outlet catalog, search by name/owner/area, call shortcut, visit check-in button, and order booking shortcut.
3. **Orders (`app/(tabs)/orders.tsx`)**: Order booking history, status filters (*Pending Admin*, *Confirmed*, *Delivered*, *Rejected*), search, line item count, total value, and reorder button.
4. **Follow-ups (`app/(tabs)/follow-ups.tsx`)**: Task and collection tracking segmented into *Today*, *Upcoming*, *Overdue*, and *Completed*, priority badges, one-tap "Mark Done", and modal for scheduling new follow-ups.
5. **Profile (`app/(tabs)/profile.tsx`)**: Salesperson identity, employee ID, contact details, assigned territory, GPS tracking telemetry status, product master shortcut, settings, and secure sign-out.

### Stack Navigation Screens:
- **Sign-In (`app/(auth)/login.tsx`)**: Supabase Auth authentication with error feedback and demo credential quick-fill.
- **Store Details (`app/stores/[id].tsx`)**: Full retail outlet profile, contact phone, credit limit & outstanding balance, interactive map directions (`SalesMap`), previous beat visits, and ledger action.
- **Add Store Outlet (`app/stores/add.tsx`)**: Onboard new retail stores with React Hook Form + Zod validation, duplicate phone check, and device GPS geolocation capture.
- **Store Visit (`app/stores/visit.tsx`)**: Beat visit execution with GPS coordinate lock, live elapsed visit timer, outcome selector (*Order Booked*, *Payment Collected*, *Store Closed*, etc.), notes, and checkout.
- **Product Catalog (`app/products/index.tsx`)**: Active SKU master catalog, category filtering, search, unit pricing, MRP, and pack size.
- **Product Details (`app/products/[id].tsx`)**: SKU specifications, barcode, GST rate, minimum/maximum order quantities, and direct "Book Order" CTA.
- **Order Booking (`app/orders/create.tsx`)**: 3-step order booking workflow (Store selection → Product search & quantity stepper → Review & Submit). **Strictly enforces 'pending' status requiring Central Admin approval**.
- **Order Details (`app/orders/[id].tsx`)**: Itemized product lines, prices, delivery instructions, Admin confirmation/rejection notice, and reorder trigger.
- **Reorder (`app/orders/reorder.tsx`)**: Duplicates previous order items into a new order draft revalidated with authoritative current database prices.
- **Customer Ledger (`app/ledger/[id].tsx`)**: Read-only store ledger statement displaying debits, credits, and authoritative running balance.
- **In-App Notifications (`app/notifications/index.tsx`)**: Live notification center for order approvals, delivery dispatches, and follow-ups.
- **Location Tracking (`app/location/index.tsx`)**: Dedicated GPS telemetry hub showing live coordinates, accuracy, battery optimization toggle, transmission frequency selector, and Admin Portal synchronization status.
- **Settings (`app/settings/index.tsx`)**: Local offline storage cache status (stores, SKUs, queued pings), cache reset, and telemetry configuration.

---

## 4. Google Maps & Supabase GPS Tracking

### How Telemetry Connects to the Admin Web Portal:
1. The salesperson starts tracking from the mobile app (or check-in at a store).
2. `expo-location` captures real device GPS coordinates (Latitude, Longitude, Accuracy, Timestamp).
3. The mobile app writes directly to `public.location_history` in Supabase:
   ```ts
   {
     salesperson_id: '6e535eeb-0ac6-4f72-915c-a0d1cb4499a1',
     latitude: 21.238120,
     longitude: 72.878530,
     status: 'online' | 'on_visit' | 'travelling' | 'idle' | 'offline',
     store_id: 'c44f63ce-9f95-4234-bcf4-6f96484067cd',
     recorded_at: '2026-11-03T04:35:00.000Z'
   }
   ```
4. Sibling project **Motiba-CRM** (Admin Web Portal) subscribes to `location_history` via Supabase Realtime (`subscribeToLiveTelemetry`).
5. The Admin's `LiveLocationMap` immediately updates the salesperson's marker, status pulse, and trail on the Google/OpenStreetMap interface.

### End-to-End Verification Procedure:
1. Open the mobile app and sign in with the active salesperson credentials:
   - **Email**: `vrushabhs203@gmail.com`
   - **Password**: `Vrushabh@1234`
2. Grant Location Permission when prompted.
3. Tap **Start Beat GPS Tracking** on the Home dashboard or in `Location Tracking`.
4. Check that live coordinates appear (e.g. `21.2381, 72.8785`).
5. Open the Admin Web Portal (`Motiba-CRM`) in your browser at `http://localhost:5173/location-tracking`.
6. Confirm that **Vrushabh Gohil** appears with status `online` / `on_visit` and that his ping timestamp updates in real time.
7. Conduct a store beat visit by checking in at **Motiba Stores**:
   - The coordinates will be automatically tagged with `status: 'on_visit'` and linked to that outlet's `store_id`.

---

## 5. Environment Variables (`.env`)

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL="https://qdadspfomzgtvqgbzzri.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="sb_publishable__dekgtBd9V6X8cAORpI9TA_axORPCli"

# Google Maps API Key (Optional for restricted native maps API)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=""
```

---

## 6. How to Run the Mobile Application

### Start Development Server:
```bash
npm start
```

### Run on Android Device / Emulator:
```bash
npx expo run:android
```

### Run on iOS Simulator (macOS only):
```bash
npx expo run:ios
```

### Run Web Preview:
```bash
npm run web
```

### Typecheck & Code Health:
```bash
# Verify TypeScript strict typing
npx tsc --noEmit

# Diagnose Expo configuration and dependency compatibility
npx expo-doctor
```

---

## 7. Order Confirmation & Fulfillment Rules
- **No Direct Stock Deduction**: Field sales representatives cannot approve orders or directly modify warehouse stock.
- Every order submitted through `orders/create.tsx` is created with `status: 'pending'`.
- The Admin confirms the order via the Admin Web Portal RPC `confirm_order_and_reserve_stock(order_id)`.
- Upon confirmation, warehouse inventory is reserved and an in-app notification is dispatched to the salesperson.

