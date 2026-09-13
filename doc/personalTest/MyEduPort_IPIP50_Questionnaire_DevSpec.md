# IPIP-50 Personality Questionnaire — Developer Specification

**For:** MyEduPort.ai — "Interactive Personality Tests" feature (helps students discover strengths/interests to guide career and study decisions)
**Instrument:** IPIP-50, the 50-item Big-Five Factor Markers
**Source:** International Personality Item Pool (IPIP), [ipip.ori.org](https://ipip.ori.org/new_ipip-50-item-scale.htm)
**License:** Public domain. IPIP items may be used without charge, for commercial or non-commercial purposes, without permission. Attribution is requested (see *Attribution* section below) — no fee or license agreement is required.
**Document version:** 1.0 — prepared 2026-08-25

---

## 1. What this measures

The IPIP-50 is a validated self-report measure of the Big Five ("OCEAN") personality dimensions:

| Code | Factor | Plain-language framing for students |
|---|---|---|
| E | Extraversion | Sociability, assertiveness, energy around people |
| A | Agreeableness | Warmth, empathy, cooperativeness |
| C | Conscientiousness | Organization, dependability, discipline |
| ES | Emotional Stability | Calm and even-tempered vs. prone to stress/worry (this is the *opposite pole* of Neuroticism — higher score = more stable) |
| I | Intellect / Imagination | Curiosity, openness to ideas, abstract thinking (this is the IPIP's version of "Openness to Experience") |

This is a **self-insight / career-guidance tool**, not a clinical or diagnostic instrument. The UI copy and results screen should make that explicit to students and parents (see §6).

---

## 2. Administration

**Instructions shown to the student before the items** (standard IPIP stem — keep this wording, it affects validity):

> Describe yourself as you generally are now, not as you wish to be in the future. Describe yourself as you honestly see yourself, in relation to other people you know of the same sex as you are, and roughly your same age. Please read each statement carefully, and then select the response that most accurately describes you.

**Response scale** — 5-point Likert, identical for all 50 items:

| Value | Label |
|---|---|
| 1 | Very Inaccurate |
| 2 | Moderately Inaccurate |
| 3 | Neither Accurate Nor Inaccurate |
| 4 | Moderately Accurate |
| 5 | Very Accurate |

Present items in the numbered order below (1–50). This order is the IPIP's original interleaved sequence — each factor's items are spread across the set rather than grouped together, which reduces response bias. **Do not re-sort items by factor in the UI.**

Recommended UX: one item per screen or ~10 per page, progress indicator, allow back-navigation, require all 50 answered before scoring. Typical completion time is 10–15 minutes.

---

## 3. The 50 items

"I ___" / "I see myself as someone who ___" — each row is shown with the item text and the 5-point scale.

| # | Item text | Factor | Keying |
|---|---|---|---|
| 1 | Am the life of the party. | Extraversion | + |
| 2 | Feel little concern for others. | Agreeableness | − |
| 3 | Am always prepared. | Conscientiousness | + |
| 4 | Get stressed out easily. | Emotional Stability | − |
| 5 | Have a rich vocabulary. | Intellect/Imagination | + |
| 6 | Don't talk a lot. | Extraversion | − |
| 7 | Am interested in people. | Agreeableness | + |
| 8 | Leave my belongings around. | Conscientiousness | − |
| 9 | Am relaxed most of the time. | Emotional Stability | + |
| 10 | Have difficulty understanding abstract ideas. | Intellect/Imagination | − |
| 11 | Feel comfortable around people. | Extraversion | + |
| 12 | Insult people. | Agreeableness | − |
| 13 | Pay attention to details. | Conscientiousness | + |
| 14 | Worry about things. | Emotional Stability | − |
| 15 | Have a vivid imagination. | Intellect/Imagination | + |
| 16 | Keep in the background. | Extraversion | − |
| 17 | Sympathize with others' feelings. | Agreeableness | + |
| 18 | Make a mess of things. | Conscientiousness | − |
| 19 | Seldom feel blue. | Emotional Stability | + |
| 20 | Am not interested in abstract ideas. | Intellect/Imagination | − |
| 21 | Start conversations. | Extraversion | + |
| 22 | Am not interested in other people's problems. | Agreeableness | − |
| 23 | Get chores done right away. | Conscientiousness | + |
| 24 | Am easily disturbed. | Emotional Stability | − |
| 25 | Have excellent ideas. | Intellect/Imagination | + |
| 26 | Have little to say. | Extraversion | − |
| 27 | Have a soft heart. | Agreeableness | + |
| 28 | Often forget to put things back in their proper place. | Conscientiousness | − |
| 29 | Get upset easily. | Emotional Stability | − |
| 30 | Do not have a good imagination. | Intellect/Imagination | − |
| 31 | Talk to a lot of different people at parties. | Extraversion | + |
| 32 | Am not really interested in others. | Agreeableness | − |
| 33 | Like order. | Conscientiousness | + |
| 34 | Change my mood a lot. | Emotional Stability | − |
| 35 | Am quick to understand things. | Intellect/Imagination | + |
| 36 | Don't like to draw attention to myself. | Extraversion | − |
| 37 | Take time out for others. | Agreeableness | + |
| 38 | Shirk my duties. | Conscientiousness | − |
| 39 | Have frequent mood swings. | Emotional Stability | − |
| 40 | Use difficult words. | Intellect/Imagination | + |
| 41 | Don't mind being the center of attention. | Extraversion | + |
| 42 | Feel others' emotions. | Agreeableness | + |
| 43 | Follow a schedule. | Conscientiousness | + |
| 44 | Get irritated easily. | Emotional Stability | − |
| 45 | Spend time reflecting on things. | Intellect/Imagination | + |
| 46 | Am quiet around strangers. | Extraversion | − |
| 47 | Make people feel at ease. | Agreeableness | + |
| 48 | Am exacting in my work. | Conscientiousness | + |
| 49 | Often feel blue. | Emotional Stability | − |
| 50 | Am full of ideas. | Intellect/Imagination | + |

---

## 4. Scoring key

Each factor is made of exactly 10 items: some **positively keyed** (score = raw response) and some **negatively keyed / reverse-scored** (score = `6 − raw response`, since the scale is 1–5).

| Factor | Positively keyed items (score as-is) | Negatively keyed items (reverse-score: `6 − x`) |
|---|---|---|
| Extraversion (E) | 1, 11, 21, 31, 41 | 6, 16, 26, 36, 46 |
| Agreeableness (A) | 7, 17, 27, 37, 42, 47 | 2, 12, 22, 32 |
| Conscientiousness (C) | 3, 13, 23, 33, 43, 48 | 8, 18, 28, 38 |
| Emotional Stability (ES) | 9, 19 | 4, 14, 24, 29, 34, 39, 44, 49 |
| Intellect/Imagination (I) | 5, 15, 25, 35, 40, 45, 50 | 10, 20, 30 |

### Computing a factor score

```
for each item i in factor F:
    scored_i = response_i          if i is positively keyed
    scored_i = 6 - response_i      if i is negatively keyed

factor_raw_score(F)   = sum(scored_i for i in F's 10 items)      // range: 10–50
factor_avg_score(F)   = factor_raw_score(F) / 10                 // range: 1.0–5.0
```

Do this independently for all 5 factors. A student's result is a 5-number profile, e.g. `{E: 34, A: 41, C: 38, ES: 27, I: 44}` (raw) or the 1–5 averages.

### Reference implementation (JavaScript)

```javascript
// responses: { 1: 4, 2: 2, 3: 5, ... 50: 3 }  (item id -> 1-5 rating)
function scoreIPIP50(responses, itemMeta) {
  // itemMeta comes from ipip50_items.json -> "items" array
  const totals = { E: 0, A: 0, C: 0, ES: 0, I: 0 };
  for (const item of itemMeta) {
    const raw = responses[item.id];
    const scored = item.keyed === '+' ? raw : (6 - raw);
    totals[item.factorCode] += scored;
  }
  return {
    raw: totals,
    average: Object.fromEntries(
      Object.entries(totals).map(([k, v]) => [k, +(v / 10).toFixed(2)])
    ),
  };
}
```

A ready-to-import data file with every item's `id`, `text`, `factor`, `factorCode`, and `keyed` value is included alongside this document: **`ipip50_items.json`**.

### Presenting results

IPIP does not publish official norm/percentile tables for this specific short form, so avoid presenting a raw score as a percentile against a "population" unless MyEduPort establishes its own norms from its user base later. For launch, present each factor as its 1–5 average with a plain-language band, e.g.:

| Average | Label |
|---|---|
| 1.0–2.0 | Low |
| 2.1–3.0 | Below average |
| 3.1–3.9 | Above average |
| 4.0–5.0 | High |

(Thresholds are a reasonable default, not a psychometric standard — flag for product/design sign-off before shipping copy that interprets scores.)

---

## 5. Suggested data model

Fits the existing dashboard data-structure conventions (see `MyEduPort Dashboard Data Structure.md`):

```javascript
personality_assessment: {
  id: "assess_001",
  student_id: "...",
  instrument: "IPIP-50",
  instrument_version: "1.0",
  started_at: "2026-08-25T09:00:00Z",
  completed_at: "2026-08-25T09:12:00Z",
  responses: { "1": 4, "2": 2, /* ...50 entries... */ },
  scores: {
    raw:     { E: 34, A: 41, C: 38, ES: 27, I: 44 },
    average: { E: 3.4, A: 4.1, C: 3.8, ES: 2.7, I: 4.4 }
  },
  bands: { E: "Above average", A: "High", C: "Above average", ES: "Below average", I: "High" }
}
```

Suggested SQL table (mirrors the pattern used for `test_scores` / `activities` in the dashboard doc):

```sql
personality_assessments (
  id, student_id, instrument, instrument_version,
  started_at, completed_at
)
personality_responses (
  id, assessment_id, item_id, response_value
)
personality_scores (
  id, assessment_id, factor_code, raw_score, average_score, band
)
```

---

## 6. Product / compliance notes for implementation

- **Not a clinical tool.** Show a short disclaimer on the intro and results screens: this is a self-insight tool for exploring interests and strengths, not a diagnosis of mental health or personality disorder, and results should not be shared as a formal assessment with universities.
- **Data sensitivity.** Personality responses are more sensitive than academic data — treat under the same privacy controls described in the project's data-privacy section (encryption at rest, included in the student's data export/deletion rights, not used for ad targeting).
- **Under-13 users / COPPA.** If any users may be under 13, confirm this assessment is gated behind the same parental-consent flow as the rest of onboarding.
- **Re-takes.** Recommend storing every completed attempt (append-only) rather than overwriting, so growth over time (e.g., grade 9 → grade 12) can be shown on the parent/student dashboard trend view.
- **Localization.** If the platform is translated, item wording should be re-validated against a published translated IPIP form rather than machine-translated ad hoc — item nuance affects scoring validity.

## 7. Attribution (required for public-domain use)

Include somewhere reasonable (About/Credits, or footer of the results page):

> This assessment uses items from the International Personality Item Pool (https://ipip.ori.org). No permission is required to use these items; IPIP asks only that users acknowledge the source.

---

*Prepared for the MyEduPort engineering team. Companion file: `ipip50_items.json` (machine-readable items + scoring metadata).*
