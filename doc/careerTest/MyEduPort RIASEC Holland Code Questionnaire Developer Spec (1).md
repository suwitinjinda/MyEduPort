# RIASEC (Holland Code) Interest Questionnaire — Developer Specification

**For:** MyEduPort.ai — "Interactive Personality Tests" feature (helps students discover strengths/interests to guide career and study decisions). Companion instrument to the IPIP-50 personality assessment (see `MyEduPort IPIP-50 Questionnaire Developer Spec.md`).
**Instrument:** O\*NET Interest Profiler Short Form — Paper-and-Pencil Version (60 items), based on John Holland's RIASEC theory of vocational interests.
**Source:** National Center for O\*NET Development, sponsored by the U.S. Department of Labor, Employment and Training Administration. [onetcenter.org/IP.html](https://www.onetcenter.org/IP.html) — item text from [IPSF_PP.pdf](https://www.onetcenter.org/dl_files/IPSF_PP.pdf).
**License:** Not public domain — see §7. Requires attribution and a license choice before shipping.
**Document version:** 1.0 — prepared 2026-08-25

---

## 1. What this measures

RIASEC ("Holland Code") theory groups vocational interests into six types. Everyone has a mix of all six; the assessment ranks them so a person's top 2–3 types describe their interest profile.

| Code | Type | Plain-language framing for students |
|---|---|---|
| R | Realistic ("Doers") | Working with tools, machines, hands-on building, the outdoors |
| I | Investigative ("Thinkers") | Research, analysis, science, solving abstract problems |
| A | Artistic ("Creators") | Creative expression — writing, music, design, performance |
| S | Social ("Helpers") | Teaching, counseling, caregiving, working directly with people |
| E | Enterprising ("Persuaders") | Leading, selling, starting ventures, influencing others |
| C | Conventional ("Organizers") | Data, detail, structure, organizing information and records |

This is a **self-insight / career-exploration tool**, not a clinical or diagnostic instrument, and it does not predict job performance. The UI copy and results screen should make that explicit to students and parents (see §6).

Unlike the IPIP-50 (which scores five *continuous* trait averages), RIASEC scoring produces a **ranked 3-letter code** (e.g., "SAI") — the primary UI output is that code plus the six underlying counts, not a single number per type.

---

## 2. Administration

**Instructions shown to the student before the items** (verbatim from the official worksheet — keep this wording, it affects validity):

> Read the 60 work activities below. Place a check in the box by the activities you would like to do. Do not think about how much education/training is needed or how much money you will make!

**Response format — binary, per item:**

The official paper-and-pencil short form is a **checklist**, not a Likert scale: for each activity the student either checks it ("I would like doing this") or leaves it unchecked ("I would not like doing this / not sure"). Score each response as:

| Value | Meaning |
|---|---|
| 1 | Checked — "I would like to do this" |
| 0 | Unchecked — "I would not like to do this" / not sure |

**Do not switch this to a 5-point Likert scale without revalidating** — the published scoring key (§4) and item pool were normed on the binary format. (O\*NET's separate 5-point "emoji scale" web version is a different, independently-normed variant; treat it as a distinct instrument if adopted later, not an interchangeable UI skin on this item set.)

**Item order:** The official worksheet groups the 60 items into six labeled sections of 10 (Realistic, then Investigative, Artistic, Social, Enterprising, Conventional, in that order) so students can self-score by section. You may keep this grouped order (simplest, matches the source worksheet) or present items in a single shuffled sequence for reduced order/fatigue bias — either is acceptable since scoring only requires knowing each item's type, not its position. If you shuffle, do not tell students which type an item belongs to.

Recommended UX: one section (or ~10 items) per screen, progress indicator, allow back-navigation, require all 60 answered before scoring. Typical completion time is 10–15 minutes.

---

## 3. The 60 items

Each item is a work activity; the student marks whether they'd like to do it. Grouped here by type (this is also the published worksheet order):

### Realistic (R)
| # | Activity |
|---|---|
| R1 | Build kitchen cabinets |
| R2 | Lay brick or tile |
| R3 | Repair household appliances |
| R4 | Raise fish in a fish hatchery |
| R5 | Assemble electronic parts |
| R6 | Drive a truck to deliver packages to offices and homes |
| R7 | Test the quality of parts before shipment |
| R8 | Repair and install locks |
| R9 | Set up and operate machines to make products |
| R10 | Put out forest fires |

### Investigative (I)
| # | Activity |
|---|---|
| I1 | Develop a new medicine |
| I2 | Study ways to reduce water pollution |
| I3 | Conduct chemical experiments |
| I4 | Study the movement of planets |
| I5 | Examine blood samples using a microscope |
| I6 | Investigate the cause of a fire |
| I7 | Develop a way to better predict the weather |
| I8 | Work in a biology lab |
| I9 | Invent a replacement for sugar |
| I10 | Do laboratory tests to identify diseases |

### Artistic (A)
| # | Activity |
|---|---|
| A1 | Write books or plays |
| A2 | Play a musical instrument |
| A3 | Compose or arrange music |
| A4 | Draw pictures |
| A5 | Create special effects for movies |
| A6 | Paint sets for plays |
| A7 | Write scripts for movies or television shows |
| A8 | Perform jazz or tap dance |
| A9 | Sing in a band |
| A10 | Edit movies |

### Social (S)
| # | Activity |
|---|---|
| S1 | Teach an individual an exercise routine |
| S2 | Help people with personal or emotional problems |
| S3 | Give career guidance to people |
| S4 | Perform rehabilitation therapy |
| S5 | Do volunteer work at a non-profit organization |
| S6 | Teach children how to play sports |
| S7 | Teach sign language to people who are deaf or hard of hearing |
| S8 | Help conduct a group therapy session |
| S9 | Take care of children at a day-care center |
| S10 | Teach a high-school class |

### Enterprising (E)
| # | Activity |
|---|---|
| E1 | Buy and sell stocks and bonds |
| E2 | Manage a retail store |
| E3 | Operate a beauty salon or barber shop |
| E4 | Manage a department within a large company |
| E5 | Start your own business |
| E6 | Negotiate business contracts |
| E7 | Represent a client in a lawsuit |
| E8 | Market a new line of clothing |
| E9 | Sell merchandise at a department store |
| E10 | Manage a clothing store |

### Conventional (C)
| # | Activity |
|---|---|
| C1 | Develop a spreadsheet using computer software |
| C2 | Proofread records or forms |
| C3 | Install software across computers on a large network |
| C4 | Operate a calculator |
| C5 | Keep shipping and receiving records |
| C6 | Calculate the wages of employees |
| C7 | Inventory supplies using a hand-held computer |
| C8 | Record rent payments |
| C9 | Keep inventory records |
| C10 | Stamp, sort, and distribute mail for an organization |

A ready-to-import data file with every item's `id`, `text`, `type`, and `typeName` is included alongside this document: **`riasec_items.json`**.

---

## 4. Scoring key

**Step 1 — Raw score per type.** For each of the six types, count the number of items in that type the student checked ("liked"):

```
score[type] = sum of response values (0 or 1) for that type's 10 items
```

Score range per type: **0–10**. Do not average — this differs from the IPIP-50's 1–5 average; RIASEC is a sum.

```javascript
const RIASEC_TYPES = ["R", "I", "A", "S", "E", "C"];

function scoreRiasec(responses, items) {
  // responses: { itemId: 0 | 1, ... } for all 60 items
  // items: the riasec_items.json array
  const totals = Object.fromEntries(RIASEC_TYPES.map(t => [t, 0]));
  for (const item of items) {
    totals[item.type] += responses[item.id] ? 1 : 0;
  }
  return totals; // e.g. { R: 3, I: 7, A: 8, S: 6, E: 2, C: 4 }
}
```

**Step 2 — Rank and derive the Holland Code.** Sort the six types by score, descending. The Holland Code is the initials of the **top 3**, in rank order (e.g., scores `{A:8, I:7, S:6, C:4, R:3, E:2}` → code **"AIS"**).

```javascript
function hollandCode(totals) {
  const ranked = RIASEC_TYPES
    .map(t => ({ type: t, score: totals[t] }))
    .sort((a, b) => b.score - a.score);
  return {
    ranked,                                   // full 6-type ranking
    code: ranked.slice(0, 3).map(r => r.type).join(""), // e.g. "AIS"
  };
}
```

**Ties:** the official guidance lets the respondent break ties by picking whichever tied type "fits them best." For an automated product, pick one deterministic rule and document it — e.g., preserve RIASEC canonical order (R, I, A, S, E, C) as the tiebreaker — rather than leaving it to chance in sort order. Flag this choice for product sign-off; it can visibly change a student's code.

**Presenting results:** Show the full 6-type profile (e.g., radar/bar chart, consistent with the dashboard's existing gauge/bar chart conventions — see `MyEduPort Dashboard Data Structure.md` §4.1), not just the 3-letter code. The code is a compact label; the underlying counts are what make the profile useful for major/career matching. O*NET does not publish population percentile norms for this short form, so do not present scores as percentiles.

---

## 5. Suggested data model

Fits the existing dashboard data-structure conventions and mirrors the IPIP-50 assessment model:

```javascript
interest_assessment: {
  id: "assess_002",
  student_id: "...",
  instrument: "ONET-IP-SF",
  instrument_version: "1.0",
  started_at: "2026-08-25T09:00:00Z",
  completed_at: "2026-08-25T09:11:00Z",
  responses: { "R1": 1, "R2": 0, /* ...60 entries... */ },
  scores: { R: 3, I: 7, A: 8, S: 6, E: 2, C: 4 },
  ranking: ["A", "I", "S", "C", "R", "E"],
  hollandCode: "AIS"
}
```

Suggested SQL tables (mirrors `personality_assessments` / `personality_responses` / `personality_scores` from the IPIP-50 spec):

```sql
interest_assessments (
  id, student_id, instrument, instrument_version,
  started_at, completed_at, holland_code
)
interest_responses (
  id, assessment_id, item_id, response_value  -- 0 or 1
)
interest_scores (
  id, assessment_id, type_code, raw_score, rank
)
```

---

## 6. Product / compliance notes for implementation

- **Not a clinical or predictive tool.** Show a short disclaimer on the intro and results screens: this is a self-insight tool for exploring interests, not a guarantee of career fit or academic outcome, and results should not be presented to universities as a formal credential.
- **Pair with major/career data.** RIASEC's main product value is mapping a Holland Code to fields of study and careers. O*NET's occupation database links each occupation to a Holland Code profile (see `IPSF_Linking.pdf` on onetcenter.org) — worth reusing for a "careers that match your code" results panel rather than inventing a separate mapping.
- **Data sensitivity.** Treat interest-assessment responses under the same privacy controls as the IPIP-50 data (encryption at rest, included in the student's data export/deletion rights, not used for ad targeting).
- **Under-13 users / COPPA.** Same gating as the rest of onboarding and the IPIP-50 assessment.
- **Re-takes.** Store every completed attempt (append-only) rather than overwriting, so interest shifts over time (grade 9 → grade 12) can show on the trend view.
- **Localization.** If translated, re-validate item wording against a published translated O\*NET or Holland-based form rather than machine-translating ad hoc — several items (e.g., "Perform jazz or tap dance", idioms like "day-care center") are culturally specific and may need adaptation, not just translation.
- **Licensing (see §7 — do not skip).** Unlike the IPIP-50, this item set is not public domain. Confirm the license choice and add the required credit line before this ships.

---

## 7. Attribution & licensing (required — read before shipping)

The O\*NET Interest Profiler Short Form is offered free of charge for commercial and non-commercial use under the **O\*NET Career Exploration Tools Content License**, but it is **not public domain** and requires a choice between two license tracks:

**Option A — CC BY-ND 4.0 (use items unmodified):**
Use this if the 60 item statements and scoring method ship exactly as published (UI styling can differ, but wording/scoring can't change). Required credit, displayed near the assessment (e.g., results page footer or an "About this assessment" panel):

> This assessment uses the O\*NET Interest Profiler Short Form, sponsored by the U.S. Department of Labor, Employment and Training Administration. Used under CC BY-ND 4.0 — [creativecommons.org/licenses/by-nd/4.0](https://creativecommons.org/licenses/by-nd/4.0/).

**Option B — O\*NET Tools Developer License (if you modify/extend):**
Required if item wording is edited, items are added/removed, translated, or the checklist is converted to a different response scale (e.g., a 5-point Likert) — i.e., most real product integrations. Required credit plus a modification disclosure:

> This assessment is based on the O\*NET Interest Profiler Short Form, sponsored by the U.S. Department of Labor, Employment and Training Administration. MyEduPort.ai has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.

Both options additionally require: using "O\*NET" only as an adjective (never as a noun/verb), displaying the ® symbol on first reference, and not implying USDOL/ETA endorsement of MyEduPort. Registration with O\*NET Resource Center is optional but requested. **Recommendation:** since §2 already proposes shuffled item order and a digital UI as options, and future localization is likely, default to **Option B** and validate that assumption with legal/product before launch.

Full terms: [onetcenter.org/license_tools.html](https://www.onetcenter.org/license_tools.html) · [onetcenter.org/license_toolsdev.html](https://www.onetcenter.org/license_toolsdev.html)

---

*Prepared for the MyEduPort engineering team. Companion file: `riasec_items.json` (machine-readable items + type metadata). Sibling document: `MyEduPort IPIP-50 Questionnaire Developer Spec.md`.*
