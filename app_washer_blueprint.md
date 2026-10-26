# 🚗 AppWasher — Complete Platform Specification & Master Blueprint

This document serves as the master blueprint, system architecture, database schema, and operational runbook for the **AppWasher** doorstep car-care platform.

---

## 1. Executive Summary & Deployments

**AppWasher** is a doorstep car-wash operations platform connecting car owners, washing station managers, and mobile field technicians in a unified real-time workflow.

* **Live Production URL (Next.js Root)**: [https://washer-2.vercel.app](https://washer-2.vercel.app)
* **Direct Standalone Distribution (Offline Demo)**: [https://washer-2.vercel.app/appwasher.html](https://washer-2.vercel.app/appwasher.html)
* **GitHub Repository**: [https://github.com/Chetan911n/washer-2.git](https://github.com/Chetan911n/washer-2.git) (Branch `main`)
* **Supabase Project Ref**: `jgekymuphznmfsbdexaw`

---

## 2. End-to-End Operational Lifecycle & State Machine

The platform enforces a strict unidirectional status machine at the database level:

```mermaid
stateDiagram-v2
    [*] --> pending: create_booking()
    pending --> assigned: assign_washer()
    assigned --> washing: start_wash() [Requires 4 Before Photos]
    washing --> awaiting_payment: complete_job() [Requires 4 After Photos]
    awaiting_payment --> paid: record_cash_payment() or verify_upi()
    
    pending --> cancelled: cancel_booking() [Customer / Station Head]
    assigned --> cancelled: cancel_booking() [Customer / Station Head]
    washing --> cancelled: cancel_booking() [Station Head only]
    awaiting_payment --> cancelled: cancel_booking() [Station Head only]
    paid --> [*]
    cancelled --> [*]
```

### Business Rules Enforced in Database:
1. **Status Flow**: `pending` → `assigned` → `washing` → `awaiting_payment` → `paid`.
2. **Cancellation Boundaries**:
   * Customers can cancel **only before washing starts** (`pending` or `assigned`).
   * Station Heads can cancel anytime before the booking is `paid`.
   * Neither role can cancel a `paid` or already `cancelled` booking.
3. **Washer Capacity Guard**:
   * A washer can hold at most **2 active bookings** per date and slot.
   * Enforced in `assign_washer` and via `trg_enforce_washer_capacity` trigger.
4. **Mandatory Inspection Photos**:
   * `start_wash`: strictly requires all 4 before-wash photos (`front`, `rear`, `left`, `right`).
   * `complete_job`: strictly requires all 4 after-wash photos (`front`, `rear`, `left`, `right`).
5. **Direct Client Protection**:
   * Direct `UPDATE` permissions on `bookings`, `payments`, `photos`, and `settlements` are completely revoked from `anon` and `authenticated` roles.
   * State transitions must occur through `SECURITY DEFINER` database functions that validate role, station membership, and ownership.

---

## 3. Database Schema & Tables

All schema migrations are located under `supabase/migrations/`:
* `20261025000001_core_schema.sql` (13 core tables, indices, check constraints)
* `20261025000002_functions_and_triggers.sql` (Business logic, state machine, capacity checks)
* `20261025000003_rls_and_storage.sql` (Default-deny RLS, Storage bucket & policies, realtime)

### Table Inventory

| Table | Primary Key | Description & Key Constraints |
| :--- | :--- | :--- |
| `stations` | `id` (TEXT) | Washing hubs. Seeded: `green_valley` ("Green Valley Station", Hinjewadi, Pune). |
| `profiles` | `id` (UUID references `auth.users`) | Roles: `customer`, `station_head`, `washer`. Phone numbers unique. Role tampering blocked by trigger. |
| `cars` | `id` (TEXT) | Vehicles owned by customers. Types: `hatchback`, `sedan`, `suv`. |
| `parking_spots` | `id` (TEXT) | Customer service addresses and parking bay instructions. |
| `packages` | `id` (TEXT) | `ext` (Exterior Foam), `deep` (Deep Wash & Polish), `prem` (Premium Detail). |
| `package_prices` | `id` (UUID) | Flat prices per package & car type (ext: ₹499, deep: ₹799, prem: ₹1199). Configured in table, not code. |
| `bookings` | `id` (TEXT) | Human-readable code (`AW5246`). Date, slot (`06:30`, `08:30`, `15:00`, `17:00`), status, total INR. Partial unique index prevents double booking of spot at same slot. |
| `booking_cars` | `id` (UUID) | Snapshots `car_type_snapshot` and `price_inr_snapshot` at time of booking. |
| `photos` | `id` (UUID) | `kind` (`before`, `after`), `position` (`front`, `rear`, `left`, `right`, `existing_damage`). `UNIQUE(booking_id, kind, position)` ensures retake cleanly replaces photo. |
| `payments` | `id` (UUID) | `method` (`cash`, `upi`), `status` (`pending`, `confirmed`), confirmed timestamp. One confirmed payment per booking. |
| `reviews` | `id` (UUID) | `rating` (1-5), `tags` (text[]), `tip_inr` (>= 0). Unique per booking. |
| `settlements` | `id` (UUID) | Station remittance records tracking 20% platform fee settlements. |
| `settings` | `key` (TEXT) | Dynamic system configuration. Key `washer_slot_capacity = 2`. |

---

## 4. Row Level Security (RLS) Matrix

Every table has `ENABLE ROW LEVEL SECURITY` with default deny:

| Resource | Customer | Station Head | Field Washer |
| :--- | :--- | :--- | :--- |
| `profiles` | Read self | Read crew in station + booking clients | Read crew in station |
| `cars` | Full CRUD on own cars | Read cars on station bookings | Read cars on assigned bookings |
| `parking_spots` | Full CRUD on own spots | Read spots on station bookings | Read spots on assigned bookings |
| `packages` / `package_prices` | Read only | Read only | Read only |
| `bookings` | Read own bookings | Read station bookings | Read assigned bookings |
| `photos` | View inspection photos of own booking | View photos for station bookings | Upload / retake photos for assigned bookings |
| `storage.objects` (`booking-photos`) | Download signed URLs for own booking | Download signed URLs for station bookings | Upload photos to `{booking_id}/{kind}/{position}.jpg` |
| `settlements` | No access | Read / settle for own station | No access |

---

## 5. WhatsApp OTP Authentication Architecture

### Dual-Mode Architecture

The authentication layer is decoupled behind an adapter interface:

```
                      ┌──────────────────────┐
                      │    getOtpMode()      │
                      │  (Reads OTP_MODE)    │
                      └──────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
       [ OTP_MODE = 'dev' ]             [ OTP_MODE = 'live' ]
       DevOtpProvider                   LiveWhatsAppOtpProvider
       ────────────────                 ────────────────────────
       • Seeded test numbers only       • Real WhatsApp phone numbers
       • Fixed code: 123456             • Meta Business Cloud API
       • DEV MODE visible badge         • Secure crypto 6-digit OTP
       • Quick Demo 1-click active      • Live approved template
       • Test numbers unusable in live  • Dev numbers refused
```

### Production Security Gate:
If `NODE_ENV === 'production'` and `OTP_MODE !== 'live'`, the app **refuses startup** immediately with a security exception.

### Rate Limits & Protection:
* **Expiry**: OTP codes expire after 5 minutes (300 seconds).
* **Cooldown**: 30-second waiting period before requesting a new code.
* **Phone Rate Limit**: Maximum 5 OTP requests per phone number per hour.
* **IP Rate Limit**: Maximum 20 OTP requests per IP per hour.
* **Lockout**: 5 consecutive incorrect code entries triggers an automatic **15-minute verification lockout**.
* **Privacy**: Phone numbers are masked (`+91******0001`) in all logs and client messages. Plain text numbers are never logged.

### Seeded Test Accounts (Development Mode Only):
| Persona | Name | Fake Test Phone | Test Code | Station |
| :--- | :--- | :--- | :--- | :--- |
| Customer | Chetan Sharma | `+910000000001` | `123456` | — |
| Station Head | Station Head (Vikram) | `+910000000002` | `123456` | Green Valley Station |
| Field Washer | Rajesh Kumar | `+910000000003` | `123456` | Green Valley Station |
| Field Washer | Suresh Verma | `+910000000004` | `123456` | Green Valley Station |
| Field Washer | Imran Khan | `+910000000005` | `123456` | Green Valley Station |

---

## 6. Admin Staff Management (Station Heads & Washers)

Staff accounts cannot be registered by public customers. They must be provisioned by an administrator.

### Option A: Server API Route (`/api/admin/staff`)
Authenticated via `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` with constant-time cryptographic verification:
```bash
curl -X POST https://washer-2.vercel.app/api/admin/staff \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "name": "Rajesh Kumar",
    "role": "washer",
    "station_id": "green_valley"
  }'
```

### Option B: SQL Helper Script (`scripts/create_staff.sql`)
Run manually in Supabase SQL Editor as postgres / service_role:
```sql
SELECT public.admin_set_staff_role('+919876543210', 'Rajesh Kumar', 'washer', 'green_valley');
```

---

## 7. Storage & Camera Photo Capture

* **Storage Bucket**: `booking-photos` (private, access controlled via RLS).
* **Upload Path**: `{booking_id}/{kind}/{position}.jpg` (e.g. `AW5246/before/front.jpg`).
* **Camera Capture**: Native HTML file input tag with `<input type="file" accept="image/*" capture="environment" />` for camera triggering on supported mobile devices.
* **Validation**: File size <= 5MB, MIME type `image/*`.
* **Retake Mechanism**: Selecting a new photo for a slot automatically overwrites the storage path and updates the database record.

---

## 8. Automated Test Suite (77 Tests)

Run all tests locally or in CI with:
```bash
npm test
```

### Test Suite Breakdown:
1. **Suite 1: Auth & WhatsApp OTP (`tests/auth-otp.test.ts`)** — 25 Passed, 0 Failed:
   * Dev/live OTP adapters, test numbers, cooldowns, hourly rate limits, 15-minute lockouts, and production startup refusal.
2. **Suite 2: App Logic & Pricing (`tests/app.test.ts`)** — 13 Passed, 0 Failed:
   * Booking totals for single/multi-car orders, DEV MODE badge visibility, Quick Demo buttons gating, and production startup security gate.
3. **Suite 3: Database & RLS Enforcement (`tests/database-rls.test.ts`)** — 31 Passed, 0 Failed:
   * Localhost safety guard, verified phone requirement on signup, role tampering prevention, readable IDs, price snapshots, status transitions, washer capacity (max 2), 4-photo validation (before and after), RLS isolation across customers, washers, and station heads, and partial unique index on spots.
4. **Suite 4: End-to-End Workflow (`tests/e2e-workflow.test.ts`)** — 8 Passed, 0 Failed:
   * Programmatic execution of the 8-step lifecycle with printed database row proofs.

> [!NOTE]
> **Pending Manual Verification Items**:
> 1. Multi-device live cross-browser realtime subscription latency on the production domain.
> 2. Physical hardware camera shutter release on various mobile phone operating systems (iOS Safari & Android Chrome).

---

## 9. Operational Runbooks

### Runbook 1: Failed Database Migration
If a migration fails during deployment:
1. Check migration status via Supabase CLI:
   ```bash
   supabase migration list
   ```
2. Locate the failed migration timestamp in `supabase/migrations/`.
3. Fix the syntax or schema error in a **new corrective migration** (never rewrite applied migrations in production).
4. Apply the corrective migration via `git push origin main`.
5. Verify schema health in the Supabase Dashboard Table Editor.

### Runbook 2: WhatsApp OTP Outage Fallback
If Meta's WhatsApp Cloud API experiences downtime or delivery delays:
1. Check Meta WhatsApp Status: [https://metastatus.com/](https://metastatus.com/).
2. Review server logs in Vercel for `[AUTH:LIVE_OTP_DISPATCH_FAILED]` errors and error codes:
   * `131030`: Recipient phone number not in WhatsApp directory.
   * `131047`: Re-engagement message required (outside 24h window).
   * `132000`: Template does not exist or parameter count mismatch.
3. If an extended outage occurs, switch emergency fallback SMS gateway via the OTP adapter interface in `src/lib/auth/otpManager.ts`.

### Runbook 3: Payment Webhook Failure & Reconciliation
If a customer completes a UPI/online payment but their network drops before the confirmation callback:
1. Locate the booking ID (`AWxxxx`) from the customer's phone number in `bookings`.
2. Check the payment gateway dashboard (Razorpay) for the transaction ID and status (`captured`).
3. If payment is verified, execute manual reconciliation via SQL:
   ```sql
   INSERT INTO public.payments (booking_id, method, amount_inr, status, transaction_id, confirmed_at)
   VALUES ('AWxxxx', 'upi', 499, 'confirmed', 'pay_xxxxx', now())
   ON CONFLICT (booking_id) DO UPDATE SET status = 'confirmed', confirmed_at = now();

   UPDATE public.bookings SET status = 'paid', updated_at = now() WHERE id = 'AWxxxx';
   ```
4. Real-time channels immediately push the `paid` status to the customer and station head screens.
