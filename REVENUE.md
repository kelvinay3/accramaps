# AccraMaps — Revenue Model

## Summary
Ghana-first GPS navigation app monetised through community participation, subscriptions,
business listings, and in-map advertising. Payments via Paystack (handles MTN MoMo,
Vodafone Cash, AirtelTigo Money, Visa/Mastercard, bank transfer/USSD).

---

## Consumer Tiers

| Tier | Price | Key Features |
|------|-------|-------------|
| **Explorer** (Free) | GH₵0 | Navigate, search, view police/hazard pins (5/mo), read reviews, basic trotro |
| **Wayfinder** | GH₵15/mo · GH₵120/yr | Ad-free, unlimited police/hazard views, offline Greater Accra, 2-hr live location share, route history 30 days, post reports & reviews, credits programme |
| **Navigator** | GH₵30/mo · GH₵240/yr | Everything + offline all Ghana, 1-yr history, multi-stop routes, unlimited live share, Navigator badge, early access |
| **Family** | GH₵45/mo | 5 accounts, Navigator-level, family live location sharing |

Annual plans = 2 months free.  
Early-adopter offer (first 6 months of paid launch): GH₵10/mo Wayfinder locked for life.

---

## Community Unlock — GH₵5 one-time

Unlocks the ability to:
- Report police checkpoints, accidents, flooding, roadworks
- Leave reviews on places
- Earn and spend credits
- Receive MoMo cashouts

**Why it exists:** real-money gate deters abuse. A person who paid GH₵5 via MoMo is a verified human with something to lose.

---

## Credits System

### Earning
| Action | Credits | Notes |
|--------|---------|-------|
| Leave a review | 10 | Once per place |
| Review gets 3+ "Helpful" votes | +5 bonus | |
| Report confirmed by 3 accounts | 25 | Paid to original reporter after quorum |
| First to report (speed bonus) | +10 | |
| Confirm another's report | 3 | Per confirmation |
| Report accident/hazard (confirmed) | 20 | |
| Report flooding / bad road (confirmed) | 15 | |
| Refer a friend who registers | 50 | |
| Complete profile | 10 | One-time |
| First-ever review | 20 | One-time welcome bonus |

### Redeeming
| Redemption | Cost |
|-----------|------|
| MoMo cashout (min GH₵5) | 500 credits = GH₵5 |
| MoMo cashout (max/month GH₵50) | 5,000 credits = GH₵50 |
| 1 month Wayfinder | 300 credits |
| Remove ads 7 days | 80 credits |
| 10 extra police pin views | 50 credits |
| Offline Greater Accra (30 days) | 200 credits |

Paystack Transfers API delivers MoMo payouts automatically.

### Reputation Levels
| Level | Lifetime Credits | Perks |
|-------|----------------|-------|
| Newcomer | 0–100 | Basic |
| Reporter | 100–500 | Green badge, 1.1× earn multiplier |
| Local Guide | 500–2,000 | Blue badge, 1.25×, early feature access |
| Community Hero | 2,000–10,000 | Gold badge, 1.5×, free Wayfinder |
| AccraMaps Legend | 10,000+ | Custom badge, free Navigator for life |

---

## Anti-Abuse Rules (Reports)
- Account must be ≥24 hrs old to report
- Phone OTP verified on account creation
- GPS must place reporter within 500 m of pin
- 3 independent accounts must confirm before pin goes live and credits are paid
- Max 5 reports/day/account
- Rate limiting on confirmations (same device, <10 min apart = rejected)
- Trust score (starts at 50): confirmed reports raise it, false reports lower it
- Trust score <20 → reporting suspended 7 days

---

## Business Revenue

| Product | Monthly Price |
|---------|--------------|
| Basic listing (free) | GH₵0 |
| Verified (badge + analytics) | GH₵100 |
| Featured (top of category) | GH₵200 |
| Sponsored pin (always visible on map) | GH₵300 |
| AccraMaps Guide placement | GH₵500/feature |
| Fleet tracking (per vehicle above 2) | GH₵20/vehicle |
| API access (delivery apps, B2B) | Custom / per-call |

---

## One-time Consumer Purchases
- Premium map themes (Satellite Pro, Minimal Dark, Kente) — GH₵5 each
- Accra Offline Pack (high-detail, permanent) — GH₵10
- Ghana Full Offline Pack — GH₵20

---

## Other Revenue
- Ride-hailing affiliate fees (Uber/Bolt partner programme)
- Jumia Food / Bolt Food redirect referral fee (requires partnership)
- Promoted trotro routes ("Brought to you by MTN")
- In-app banner ads for non-premium Explorer users

---

## Launch Strategy
1. **Months 1–6:** All features free. Build community data (reports, reviews).
2. **Month 7:** Introduce GH₵5 community unlock. Early-adopter Wayfinder GH₵10/mo.
3. **Month 12:** Full tiered pricing. Fleet + business listings. Paystack live.
4. **Year 2:** Play Store (TWA), iOS PWA push, B2B fleet product, data insights.

---

## Projected Revenue (conservative, 10,000 MAU)
| Source | Monthly |
|--------|---------|
| Wayfinder (5% × 500 users × GH₵15) | GH₵7,500 |
| Navigator (1% × 100 users × GH₵30) | GH₵3,000 |
| Business paid plans (50 × avg GH₵150) | GH₵7,500 |
| Credits + one-time purchases | GH₵2,000 |
| **Total** | **~GH₵20,000/mo (~$1,300 USD)** |

Scales linearly with user base. Accra has 3M+ residents.
