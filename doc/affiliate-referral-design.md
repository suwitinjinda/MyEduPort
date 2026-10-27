# Affiliate and referral programs — design

Status: **built and live (27/10/2026).** Affiliate program complete; coin program built as a
foundation — students earn coins, but what coins can be spent on is still undecided.

Last updated: 27/10/2026

Where it lives: `backend/src/services/referrals.js` (all the money rules),
`routes/referral.js` · `routes/affiliate.js` · `routes/referralAdmin.js`,
migration `alter_phase22_affiliate_referral.sql`; pages `Partners.jsx` (/partners),
`AffiliateDashboard.jsx` (/affiliate), `Rewards.jsx` (/rewards), Admin → Affiliates / Coins.

---

## Decisions made

| Question | Decision |
|---|---|
| How affiliates earn | **Admin-configurable per partner**: % of payment or fixed amount per student; first payment only, every payment for N months, or every payment forever |
| When commission is earned | Admin-configurable: on the student's payment (default) or on sign-up. Sign-up is free, so the admin screen warns that paying on sign-up invites fake accounts |
| New-student discount | **Admin-configurable per partner**: percentage (default 5%) and duration — first bill only, first N months, or every bill |
| How affiliates see their numbers | **Affiliates register their own account** (a new `affiliate` role) and get a dedicated partner dashboard |
| Build order | Owner later said to build as designed without waiting — done 27/10/2026 |

## Affiliate program

External partners (tutors, schools, influencers) bring in new students.

### Lifecycle

1. Partner registers an affiliate account → status **pending**
2. Admin reviews, sets terms and a code (e.g. `KRUPOOM`) → status **active**
3. Partner shares `myeduport.ai/?ref=KRUPOOM` (works on any page incl. `/lp/<campaign>?ref=`)
4. Visitor clicks → code remembered 30 days (first-touch attribution); code can also be typed at sign-up
5. Visitor signs up (email **or** Google — both paths must capture the code) → attribution stored
6. Checkout → partner's discount applied automatically via a Stripe coupon
7. Payment → commission created **pending**, `available_at = now + hold days` (default 30)
8. Refund during the hold → commission **reversed**
9. After the hold → **approved**; admin pays out manually and records the transfer → **paid**

Terms are snapshotted on each referral: changing a partner's terms affects new referrals only.

### Partner dashboard (affiliate role)

- Referral link + copy; note that the code works on campaign pages and at sign-up
- Their current terms in plain words
- Last 30 days: link clicks, sign-ups, paying students, click→paying rate
- Earnings: in hold / ready to pay / paid to date
- Referred students list — **masked** (initials + grade only; students are minors), plan, status (trial / paying / refunded), commission
- Payout details: PromptPay or bank account, tax ID; minimum payout threshold

### Admin

- Pending applications to approve/reject
- Per-partner terms: code, commission type + value, commission duration, earned-on trigger, hold days, discount % + duration, active/paused
- Per-partner stats and the commission ledger
- Record a payout (amount, method, reference) → marks the included commissions paid

## Referral program (coins) — foundation only, details pending

Existing students invite friends and earn coins; coins are also earned for activity.

- **Append-only coin ledger** — every earn/spend is a row; balance = sum. Never update a balance in place.
- **Admin-editable rules** (stored like `plan_limits` in `app_settings`): activity key → coins, with per-activity caps to stop farming. Example: essay finished +20 (max 5), Personal Test +30 (once), referred friend pays +200.
- Each student gets a personal invite link; the friend gets the same 5% (configurable) discount.
- Admin can adjust coins manually, with a reason, logged.

### Open — waiting on the owner's summary

- **What coins can be spent on.** Options discussed: discount on the next bill, extra MEPAi quota, a free month. Without a sink, coins have no meaning.
- Full list of activities and their coin values
- Whether a referral reward needs the friend to pay, or only sign up

## Shared rules

- **No stacking**: one referral discount per student, whichever attribution came first.
- **No self-referral**: block when the referrer and new user share email/card.
- **Affiliates are adults.** Students (14–18) can join the coin program but should not be paid affiliates.
- **Tax**: commissions paid to individuals in Thailand likely need withholding tax — confirm with an accountant before launch.

## Technical notes

- **Stripe Checkout cannot combine `allow_promotion_codes` with `discounts`.** When a student has a referral attribution, checkout applies the coupon and the promo-code box is hidden. `backend/src/routes/billing.js` currently sets `allow_promotion_codes: true`.
- Coupon duration maps to Stripe's `once` / `repeating` (`duration_in_months`) / `forever`.
- The webhook must additionally handle `invoice.paid` (per-payment commissions) and `charge.refunded` (reversal). The Stripe webhook endpoint subscription must be updated to send them.
- Sign-up code capture is needed in both `POST /api/auth/register` and `POST /api/auth/google`.

### Data model (draft)

- `affiliates` — user_id, code, status, commission_type, commission_value, commission_scope, commission_months, earned_on, hold_days, discount_percent, discount_duration, discount_months, payout_method, payout_details, tax_id
- `referral_attributions` — new user, source (`affiliate` | `referral`), affiliate_id / referrer_user_id, code, terms snapshot, landed_at, signed_up_at, first_paid_at
- `affiliate_clicks` — affiliate_id, landed_at, hashed IP, path
- `commissions` — affiliate_id, user_id, stripe invoice, amount paid, commission, status (pending → approved → paid | reversed), available_at, payout_id
- `affiliate_payouts` — affiliate_id, amount, method, reference, paid_at, recorded_by
- `coin_ledger` — user_id, amount (+/-), reason, ref_type, ref_id, created_at, created_by
- coin rules — `app_settings` key `coin_rules`
