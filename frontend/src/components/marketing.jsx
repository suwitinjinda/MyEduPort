import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BellRinging, CalendarCheck, ChartBar, Check, Diamond, Eye, FolderOpen, GlobeHemisphereEast, ListChecks,
  MapTrifold, Notebook, PenNib, PlayCircle, ShieldCheck, Student, Target, UserCircle, UsersThree
} from "@phosphor-icons/react";

// Shared pieces for the public pages (Home, Why MyEduPort, Platform Overview), written to the
// MyEduPort_Homepage_20261111 / Platform_Overview_20261112 copy and its tone guide:
// calm, benefit-led, human — no "AI-powered", "revolutionary", "predict your chances".

// The "How it works" video. Leave empty until the video exists: the block then shows the
// four-step walkthrough instead. Use an embeddable URL (YouTube "embed/…" or a Vimeo player link).
export const HOW_IT_WORKS_VIDEO = "";

// ---------------------------------------------------------------- icons (Phosphor, duotone)
const ICONS = {
  portfolio: Notebook, match: Target, tracker: ListChecks, essay: PenNib, profile: UserCircle,
  calendar: CalendarCheck, stand: ChartBar, eye: Eye, value: Diamond, bell: BellRinging,
  map: MapTrifold, school: Student, cohort: UsersThree, folder: FolderOpen, play: PlayCircle,
  check: Check, shield: ShieldCheck, globe: GlobeHemisphereEast
};
export function Icon({ name, size = 24, weight = "duotone", ...rest }) {
  const C = ICONS[name] || Notebook;
  return <C size={size} weight={name === "check" ? "bold" : weight} aria-hidden="true" {...rest} />;
}

// ---------------------------------------------------------------- copy from the documents
export const FEATURES = [
  { icon: "portfolio", title: "Portfolio Builder", text: "Organise your academics, activities, and achievements into a clear, compelling profile universities want to see.", to: "/profile" },
  { icon: "match", title: "University Match", text: "Explore universities that fit your goals, grades, and interests — with detailed requirements for each programme.", to: "/recommendations" },
  { icon: "tracker", title: "Application Tracker", text: "Stay on top of every deadline, document, and requirement across all your target universities.", to: "/tasks" },
  { icon: "essay", title: "Essay & Document Hub", text: "Draft, refine, and store your personal statements and supporting documents — all in one secure place.", to: "/profile?section=documents" }
];

export const AUDIENCES = [
  {
    key: "students", label: "For Students", tone: "teal",
    intro: "Everything a strong application needs, organised from Grade 9 onwards.",
    items: [
      { icon: "profile", title: "Build a Profile That Speaks for Itself", text: "Organise everything in one place — your grades, activities, awards, and essays — so your application tells a clear, consistent story." },
      { icon: "calendar", title: "Start Early, Stay Ahead", text: "The students who succeed at top universities don't prepare in Year 12 — they start in Year 9. MyEduPort keeps you on track from day one." },
      { icon: "stand", title: "Know Where You Stand", text: "See how your profile compares to typical admits at your target universities, and get clear, actionable steps to close the gap." },
      { icon: "essay", title: "Write Essays With Confidence", text: "Structured prompts, guided drafts, and feedback tools help you find your voice and tell your story — without the blank-page paralysis." }
    ]
  },
  {
    key: "parents", label: "For Parents", tone: "navy",
    intro: "Support your child with confidence — and without taking over.",
    items: [
      { icon: "eye", title: "Full Visibility, Without the Micromanagement", text: "Monitor your child's progress, upcoming deadlines, and portfolio completeness — all from a dedicated parent dashboard." },
      { icon: "value", title: "Expert-Level Guidance, Without the Consultant Price Tag", text: "Get the same quality of support as a private admissions consultant, at a fraction of the cost." },
      { icon: "bell", title: "Never Miss a Critical Deadline", text: "Receive timely alerts for application rounds, test registrations, and scholarship windows — so nothing slips through." },
      { icon: "map", title: "Understand the Process, End to End", text: "Clear explanations of every system — Common App, UCAS, and more — so you can support your child with confidence." }
    ]
  },
  {
    key: "counsellors", label: "For Counsellors", tone: "gold",
    intro: "Structured, personalised guidance for every student in your cohort.",
    items: [
      { icon: "school", title: "Support Every Student, Consistently", text: "Give each student structured, personalised guidance — without the workload falling entirely on your shoulders." },
      { icon: "cohort", title: "Track Progress Across Your Cohort", text: "See where students are in their journey, spot who needs attention, and step in at the right moment." },
      { icon: "folder", title: "One Platform, All the Documentation", text: "Academic records, activity logs, drafts, and recommendation requests — organised and accessible in one place." }
    ]
  }
];

export const STATS = [
  { value: "10,000+", label: "Students Guided" },
  { value: "50+", label: "Countries Covered" },
  { value: "300+", label: "Top Universities in Our Database" }
];

const STEPS = [
  { icon: "profile", title: "Create your profile", text: "Add your school, curriculum, target countries and the universities you're aiming for." },
  { icon: "portfolio", title: "Build your portfolio", text: "Record grades, tests, activities and awards year by year — Grade 9 onwards." },
  { icon: "stand", title: "See where you stand", text: "Compare your profile with typical admits and get clear next steps for each university." },
  { icon: "tracker", title: "Apply with confidence", text: "Keep essays, documents and deadlines in one place, then export your complete MyPort." }
];

// ---------------------------------------------------------------- blocks

// Video when there is one, otherwise the four steps
export function HowItWorks({ id, title = "How It Works" }) {
  return (
    <section id={id} className="mk-how" aria-labelledby={`${id || "how"}-title`}>
      <div className="mk-head">
        <span className="eyebrow">See it in action</span>
        <h2 id={`${id || "how"}-title`} className="mk-h2">{title}</h2>
      </div>
      {HOW_IT_WORKS_VIDEO ? (
        <div className="mk-video">
          <iframe src={HOW_IT_WORKS_VIDEO} title="How MyEduPort works" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        </div>
      ) : (
        <ol className="mk-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="mk-step-num">{i + 1}</span>
              <Icon name={s.icon} size={26} />
              <strong>{s.title}</strong>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function FeatureGrid() {
  return (
    <div className="mk-features">
      {FEATURES.map((f) => (
        <div key={f.title} className="mk-feature">
          <span className="mk-icon"><Icon name={f.icon} size={26} /></span>
          <h3>{f.title}</h3>
          <p>{f.text}</p>
        </div>
      ))}
    </div>
  );
}

// Home: one card per audience with its benefits
export function BenefitColumns() {
  const [tab, setTab] = useState("students");
  const a = AUDIENCES.find((x) => x.key === tab);
  return (
    <div>
      <div className="mk-pills" role="tablist" aria-label="Who it's for">
        {AUDIENCES.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} className={`mk-pill${tab === x.key ? " on" : ""}`} onClick={() => setTab(x.key)}>{x.label}</button>
        ))}
      </div>
      <div className={`mk-benefits tone-${a.tone}`} role="tabpanel">
        {a.items.map((b) => (
          <div key={b.title} className="mk-benefit">
            <span className="mk-icon"><Icon name={b.icon} size={26} /></span>
            <div><h3>{b.title}</h3><p>{b.text}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsBar() {
  return (
    <div className="mk-stats">
      {STATS.map((s) => <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>)}
    </div>
  );
}

export function CtaBanner() {
  return (
    <section className="mk-cta">
      <h2>Ready to Build a Portfolio That Stands Out?</h2>
      <p>Join students who are taking a smarter, more structured approach to university applications.</p>
      <div className="mk-cta-buttons">
        <NavLink className="button white" to="/login?mode=register">Create Your Free Profile</NavLink>
        <NavLink className="button mk-outline" to="/contact">Talk to Our Team</NavLink>
      </div>
    </section>
  );
}

// Platform Overview: a picture for each benefit — a small app window with the benefit's own scene
export function BenefitPicture({ icon, tone = "teal" }) {
  const scene = {
    profile: <><circle cx="70" cy="62" r="16" className="f2" /><rect x="96" y="52" width="90" height="8" rx="4" className="f3" /><rect x="96" y="66" width="60" height="6" rx="3" className="f4" />
      {[0, 1, 2].map((i) => <g key={i}><rect x="54" y={98 + i * 24} width="140" height="16" rx="5" className="f4" /><rect x="58" y={102 + i * 24} width={[90, 70, 110][i]} height="8" rx="4" className="f1" /></g>)}</>,
    calendar: <>{[0, 1, 2, 3, 4, 5, 6].map((c) => [0, 1, 2, 3].map((r) => <rect key={`${c}${r}`} x={52 + c * 21} y={58 + r * 22} width="16" height="16" rx="4" className={c === 4 && r === 1 ? "f1" : r === 3 && c > 4 ? "f4" : "f3"} />))}<path d="M52 158h150" className="s1" /></>,
    stand: <>{[38, 62, 88, 110].map((h, i) => <rect key={i} x={62 + i * 34} y={150 - h} width="22" height={h} rx="5" className={i === 3 ? "f1" : "f3"} />)}<path d="M54 92 L190 64" className="s2" strokeDasharray="5 5" /></>,
    essay: <>{[0, 1, 2, 3, 4].map((i) => <rect key={i} x="54" y={56 + i * 18} width={[140, 120, 132, 96, 110][i]} height="7" rx="3.5" className="f3" />)}<rect x="54" y="146" width="62" height="16" rx="8" className="f1" /><circle cx="186" cy="146" r="14" className="f2" /></>,
    eye: <><rect x="52" y="56" width="66" height="50" rx="8" className="f3" /><rect x="126" y="56" width="66" height="50" rx="8" className="f3" /><circle cx="85" cy="81" r="13" className="f1" /><rect x="138" y="70" width="40" height="7" rx="3.5" className="f4" /><rect x="138" y="84" width="28" height="7" rx="3.5" className="f2" /><rect x="52" y="116" width="140" height="44" rx="8" className="f4" /><rect x="62" y="132" width="96" height="8" rx="4" className="f1" /></>,
    value: <><rect x="58" y="60" width="58" height="96" rx="10" className="f4" /><rect x="128" y="76" width="58" height="80" rx="10" className="f1" /><rect x="68" y="74" width="38" height="8" rx="4" className="f3" /><rect x="138" y="90" width="38" height="8" rx="4" className="f5" /><circle cx="157" cy="124" r="10" className="f5" /></>,
    bell: <>{[0, 1, 2].map((i) => <g key={i}><rect x="52" y={58 + i * 34} width="140" height="26" rx="8" className={i === 0 ? "f1" : "f3"} /><circle cx="66" cy={71 + i * 34} r="6" className={i === 0 ? "f5" : "f2"} /><rect x="80" y={67 + i * 34} width={[90, 70, 80][i]} height="7" rx="3.5" className={i === 0 ? "f5" : "f4"} /></g>)}</>,
    map: <><path d="M58 150 C 80 90, 120 140, 140 96 S 186 70, 190 60" className="s2" strokeDasharray="6 6" />{[[58, 150], [104, 118], [140, 96], [190, 60]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i === 3 ? 10 : 7} className={i === 3 ? "f1" : "f2"} />)}</>,
    school: <>{[0, 1, 2, 3].map((i) => <g key={i}><circle cx="66" cy={64 + i * 26} r="8" className="f2" /><rect x="82" y={60 + i * 26} width="110" height="8" rx="4" className="f4" /><rect x="82" y={60 + i * 26} width={[96, 64, 80, 40][i]} height="8" rx="4" className="f1" /></g>)}</>,
    cohort: <>{[0, 1, 2, 3].map((i) => <g key={i}><rect x="52" y={56 + i * 26} width="140" height="20" rx="6" className="f4" /><circle cx="64" cy={66 + i * 26} r="6" className="f2" /><rect x="76" y={62 + i * 26} width={[100, 60, 84, 30][i]} height="8" rx="4" className={i === 3 ? "f5w" : "f1"} /></g>)}</>,
    folder: <>{[0, 1, 2].map((i) => <g key={i} transform={`translate(${i * 12} ${i * 12})`}><rect x="58" y="58" width="104" height="72" rx="10" className={i === 2 ? "f1" : "f3"} /></g>)}<rect x="96" y="96" width="60" height="7" rx="3.5" className="f5" /><rect x="96" y="110" width="40" height="7" rx="3.5" className="f5" /></>
  }[icon] || null;
  return (
    <svg className={`mk-picture tone-${tone}`} viewBox="0 0 240 200" role="img" aria-hidden="true">
      <circle cx="206" cy="36" r="26" className="bg2" />
      <circle cx="26" cy="176" r="18" className="bg2" />
      <rect x="36" y="28" width="172" height="146" rx="14" className="win" />
      <rect x="36" y="28" width="172" height="18" rx="9" className="bar" />
      <circle cx="48" cy="37" r="3" className="dot" /><circle cx="58" cy="37" r="3" className="dot" /><circle cx="68" cy="37" r="3" className="dot" />
      {scene}
      <foreignObject x="168" y="140" width="56" height="56">
        <div className="mk-picture-badge"><Icon name={icon} size={28} /></div>
      </foreignObject>
    </svg>
  );
}

// Platform Overview: one section per audience, with a tab for each benefit
export function AudienceShowcase({ audience }) {
  const [i, setI] = useState(0);
  const b = audience.items[i];
  return (
    <section className={`mk-show tone-${audience.tone}`} aria-labelledby={`show-${audience.key}`}>
      <div className="mk-head">
        <h2 id={`show-${audience.key}`} className="mk-h2">{audience.label}</h2>
        <p className="mk-lede">{audience.intro}</p>
      </div>
      <div className="mk-pills" role="tablist" aria-label={audience.label}>
        {audience.items.map((x, n) => (
          <button key={x.title} type="button" role="tab" aria-selected={i === n} className={`mk-pill${i === n ? " on" : ""}`} onClick={() => setI(n)}>{x.title.split(",")[0]}</button>
        ))}
      </div>
      <div className="mk-show-panel" role="tabpanel">
        <div>
          <span className="mk-icon mk-icon-lg"><Icon name={b.icon} size={30} /></span>
          <h3>{b.title}</h3>
          <p>{b.text}</p>
          <NavLink className="button" to="/login?mode=register">Get started</NavLink>
        </div>
        <BenefitPicture icon={b.icon} tone={audience.tone} />
      </div>
    </section>
  );
}
