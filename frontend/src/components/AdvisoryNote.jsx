import React from "react";

/**
 * Editorial advisory callout — surfaces expert guidance from the
 * MyEduPort Excellent Portfolio Guide inline with editor pages.
 */
export default function AdvisoryNote({ label = "AI Advisory", title, children, doDont }) {
  return (
    <aside className="advisory">
      <div className="advisory-label">{label}</div>
      {title ? <h4>{title}</h4> : null}
      {children}
      {doDont ? (
        <div className="do-dont">
          <div className="do">
            <strong>Do</strong>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {doDont.do.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
          <div className="dont">
            <strong>Don't</strong>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {doDont.dont.map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

/**
 * The full Excellent Portfolio Guide content, sourced from the
 * MyEduPort_Reviews_202604_REV03_Site_20map_Explain.docx review document.
 * Used by the Guide page and inline AdvisoryNotes throughout the app.
 */
export const PORTFOLIO_GUIDE = {
  weights: [
    { label: "Academic Excellence", weight: 40, note: "Foundation requirement" },
    { label: "Extracurricular Impact", weight: 30, note: "What makes you unique" },
    { label: "Essays & Personal Qualities", weight: 20, note: "Who you are" },
    { label: "Recommendations", weight: 10, note: "How others see you" }
  ],

  gpa: {
    title: "GPA & Course Rigor",
    summary:
      "Top universities target an unweighted 3.9–4.0 (A/A+ average) and a weighted 4.3–4.7+. The trend matters: an upward trajectory is positive; a downward trend is concerning.",
    bullets: [
      "Take the most challenging curriculum available at your school",
      "Admissions officers compare you to other students at your school",
      "Grade 11 is most critical — junior-year grades carry the most weight",
      "Don't slack senior year — admission can be rescinded"
    ]
  },

  courseLoadByYear: [
    { grade: "Grade 9 (Freshman)", load: ["1–2 Honors courses", "Strong foundation in core subjects", "Explore different subjects"] },
    { grade: "Grade 10 (Sophomore)", load: ["2–3 Honors / Pre-AP courses", "Begin AP courses in strong subjects", "Continue exploration"] },
    { grade: "Grade 11 (Junior) — MOST CRITICAL", load: ["4–6 AP / IB courses if available", "Most rigorous schedule you can handle", "This year's grades matter most"] },
    { grade: "Grade 12 (Senior)", load: ["4–6 AP / IB courses", "Don't slack — senioritis kills applications", "Continue rigor through graduation"] }
  ],

  recommendedAPs: {
    stem: [
      "AP Calculus BC (essential)",
      "AP Physics C (Mechanics and E&M)",
      "AP Chemistry",
      "AP Biology (life sciences)",
      "AP Computer Science A",
      "AP Statistics",
      "Plus: AP English, AP History, AP Foreign Language"
    ],
    humanities: [
      "AP English Language & Composition",
      "AP English Literature",
      "AP US History",
      "AP World or AP European History",
      "AP US Government",
      "AP Psychology or AP Economics",
      "Plus: AP Calculus AB/BC, AP Science, AP Foreign Language"
    ]
  },

  classRank: {
    title: "Class Rank",
    summary:
      "Top universities look for the top 5% of class (ideally top 1–2%). If your school doesn't rank, your GPA percentile matters.",
    bullets: [
      "Top 5% of class — strongest signal",
      "Top 10% can work at highly competitive schools",
      "Admissions officers know the strongest high schools",
      "School profile matters: average SAT, college outcomes"
    ]
  },

  testScores: {
    title: "Standardized Test Scores",
    summary:
      "Top universities cluster around the 75th-percentile band: SAT 1540–1600 or ACT 34–36. Strong scores still help at test-optional schools.",
    bullets: [
      "SAT 1540–1600 / ACT 34–36 — highly competitive (75th %)",
      "SAT 1480–1540 / ACT 33–34 — competitive (50th %)",
      "SAT 1450+ / ACT 32+ — minimum competitive",
      "Test-optional: submit if at or above the 25th percentile"
    ],
    international: {
      title: "International tests",
      bullets: [
        "TOEFL: minimum 100/120 · competitive 110+ · top 115+",
        "IELTS: minimum 7.0 · competitive 7.5+ · top 8.0+",
        "Duolingo: minimum 120/160 · competitive 130+"
      ]
    },
    strategy: [
      "Take PSAT in Grade 10 (practice + National Merit)",
      "First real SAT/ACT in spring of Grade 11",
      "Retake in fall of Grade 12 if needed",
      "Most schools superscore — your best section across dates"
    ],
    apExams: [
      "Target: mostly 5s, some 4s",
      "Don't report scores of 3 or below",
      "5+ APs with avg 3.5+ → AP Scholar with Distinction",
      "AP credits can shorten your degree path"
    ]
  },

  awardsByTier: {
    school: ["Honor Roll / High Honor Roll", "Subject-specific awards (Top Math Student, etc.)", "Departmental awards", "Academic achievement certificates"],
    national: ["National Merit Finalist / Scholar (PSAT-based)", "AP Scholar with Distinction (5+ APs, 3.5+ avg)", "Presidential Scholars Candidate", "National Honor Society"],
    competitions: {
      math: ["AMC → AIME → USAMO", "MATHCOUNTS (middle school)", "Harvard-MIT Math Tournament (HMMT)", "State / regional math competitions"],
      science: ["Intel / Regeneron Science Talent Search (top 40 = near-guaranteed admission)", "Intel ISEF", "USA Biology / Chemistry / Physics Olympiad", "Google Science Fair", "Science Olympiad (state / national medals)"],
      cs: ["USACO (Platinum level impressive)", "CodeForces (Candidate Master+)", "TopCoder", "Congressional App Challenge winner", "Hackathon awards (MLH, local)"],
      humanities: ["National History Day (national finalist)", "National Speech & Debate Tournament", "Model UN — best delegate", "Quiz Bowl nationals", "Scholastic Art & Writing (Gold Key)"],
      research: ["Published research paper (even co-author)", "Presented at undergraduate research symposium", "Patent filed / granted", "Accepted to highly selective research programs"]
    }
  },

  spike: {
    title: "Extracurricular Strategy (AdviAI)",
    summary:
      "Top universities don't reward students who are vaguely good at everything. Develop a spike — exceptional, demonstrated depth in a single area — alongside reasonable breadth.",
    bullets: [
      "Align your spike with your intended major or field",
      "Show progressive achievement over multiple years",
      "Demonstrate leadership and measurable impact",
      "Be distinctive or genuinely unique"
    ],
    doDont: {
      do: [
        "3–5 deep, multi-year activities with measurable impact",
        "Founded, led, or changed something",
        "Quantified outcomes (people reached, funds raised)"
      ],
      dont: [
        "10+ superficial activities padded onto a résumé",
        "Joining clubs only for the college application",
        "Generic service hours without leadership or outcome"
      ]
    },
    examples: [
      {
        spike: "Computer Science",
        items: [
          "Founded coding club at school (50+ members)",
          "Developed mobile app (10,000+ downloads)",
          "USACO Gold / Platinum division",
          "Internship at tech startup",
          "Taught coding to 200+ elementary students",
          "Open-source contributor (500+ GitHub stars)"
        ]
      },
      {
        spike: "Biology / Medicine",
        items: [
          "500+ hours hospital volunteering",
          "Research internship at university lab (published paper)",
          "Science Olympiad state / national medals",
          "Founded health awareness campaign (5,000 students)",
          "EMT certification",
          "Science fair regional / national awards"
        ]
      },
      {
        spike: "Social Impact",
        items: [
          "Founded nonprofit (raised $50,000+)",
          "Community service reaching 1,000+ people",
          "Advocacy campaign (changed school / local policy)",
          "Model UN national awards",
          "Volunteer 500+ hours with measurable impact",
          "Educational program for underserved community"
        ]
      }
    ]
  },

  ecCategories: [
    {
      name: "Academic / Intellectual",
      target: "2–3 activities",
      examples: ["Science Olympiad, Math Team, Coding Club", "Research project with professor / lab", "Science fair competitions", "STEM summer programs (RSI, PROMYS, SSP)"],
      makesExcellent: ["Leadership positions (Captain, President, Editor)", "State / national competition success", "Publication or presentation of work", "Teaching or mentoring others"]
    },
    {
      name: "Leadership & Service",
      target: "1–2 activities",
      examples: ["Student Government (President, VP, Class President)", "Club President / Founder", "Peer tutoring program leader", "200+ hours sustained service"],
      makesExcellent: ["Personal connection to the cause", "Initiative and innovation — created something new", "Sustained commitment (3–4 years)", "Quantifiable impact"]
    },
    {
      name: "Arts / Athletics",
      target: "0–2 activities",
      examples: ["All-State Band / Orchestra / Choir", "Lead roles in theatre", "Varsity letter (4 yrs is impressive)", "Recruited athlete (major hook)"],
      makesExcellent: ["Recruited athlete — coach support", "National / state recognition", "Leadership: team captain, section leader", "Longevity: 4 years commitment"]
    },
    {
      name: "Work Experience",
      target: "0–2 activities",
      examples: ["Research internship with professor / PhD student", "Industry intern (tech, engineering, hospital, law, finance)", "Entrepreneurship — own business", "Part-time job (especially if supporting family)"],
      makesExcellent: ["Real responsibility, not shadowing", "Skills developed", "Impact / achievements", "Recommendation from supervisor"]
    },
    {
      name: "Summer Activities",
      target: "Summers matter — don't waste them",
      examples: [
        "Grade 9: Explore interests, summer camps, volunteer, projects",
        "Grade 10: More selective programs, begin research / internships",
        "Grade 11 — MOST IMPORTANT: RSI, TASP, Stanford SIMR, MIT MOSTEC, Yale YYGS",
        "Grade 12: Continue meaningful work, extend prior summer"
      ],
      makesExcellent: [
        "Tier 1: RSI, TASP, top university research (<15% accept)",
        "Tier 2: Local university research, competitive internship",
        "Tier 3: Pre-college pay-to-play programs (less impressive)",
        "Tier 4 to avoid: doing nothing, unstructured time"
      ]
    }
  ],

  qualityIndicators: {
    title: "Quality Indicators",
    blocks: [
      { name: "Impact metrics", items: ["Numbers: people reached, $ raised, students taught", "Growth: 10 → 50 members", "Recognition: awards, media coverage", "Scale: school, city, state, national"] },
      { name: "Leadership", items: ["Titles: President, Founder, Captain, Director", "Responsibilities: recruited, funded, organized", "Innovation: created new program / solved problem"] },
      { name: "Commitment", items: ["Duration: 4 years shows dedication", "Hours: 10 hrs/wk × 40 wks/yr", "Progression: member → officer → president"] },
      { name: "Personal growth", items: ["Skills developed", "Challenges overcome", "Lessons learned"] }
    ]
  },

  activityCategories: [
    "Academic",
    "Athletics: Club",
    "Athletics: JV / Varsity",
    "Career-Oriented",
    "Community Service (Volunteer)",
    "Cultural",
    "Dance",
    "Music: Instrumental",
    "Music: Vocal",
    "Debate / Speech",
    "Environmental",
    "Family Responsibilities",
    "Journalism / Publication",
    "Junior R.O.T.C.",
    "LGBT",
    "Research",
    "Robotics",
    "School Spirit",
    "Science / Math",
    "Student Govt. / Politics",
    "Religious",
    "Work (Paid)",
    "Other Club / Activity"
  ],

  activities: {
    title: "Activity Description Formula",
    summary:
      "Every activity description gets exactly 150 characters. Use them well: [Action verb] + [What you did] + [Impact / Result].",
    bullets: [
      "Action verbs: Founded, Directed, Organized, Led, Created, Developed",
      "Include concrete numbers and metrics",
      "Show impact, not participation",
      "Order activities by importance — your biggest spike first"
    ],
    prioritization: [
      "Position 1: your biggest spike / achievement",
      "Positions 2–3: other major activities related to spike",
      "Positions 4–5: leadership / service",
      "Positions 6–7: other significant involvements",
      "Positions 8–10: activities that round out profile"
    ]
  },

  essays: {
    title: "Common App Personal Statement (650 words)",
    summary:
      "Grades and activities show what you've done; the essay shows who you are. Tell a specific story that reveals character and growth — in your authentic voice.",
    prompts: [
      "Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it.",
      "The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure.",
      "Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?",
      "Reflect on something that someone has done for you that has made you happy or thankful in a surprising way.",
      "Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.",
      "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time.",
      "Share an essay on any topic of your choice."
    ],
    doDont: {
      do: [
        "Tell a specific, personal story with sensory detail",
        "Show vulnerability and growth",
        "Sound like a smart 17-year-old, not a thesaurus",
        "Make the reader genuinely like you"
      ],
      dont: [
        "Summarize your résumé in prose",
        "Write about COVID, sports injury, or service trips",
        "Brag, complain, or trauma-dump",
        "Write what you think admissions wants to hear"
      ]
    },
    structure: [
      { part: "Hook", words: 50, note: "Vivid scene, surprising statement, or compelling question" },
      { part: "Story / Experience", words: 400, note: "Narrate a specific experience with concrete detail, dialogue, sensory description" },
      { part: "Reflection", words: 150, note: "What did you learn? How did you grow? How does it connect to your future?" },
      { part: "Conclusion", words: 50, note: "Tie back to the opening. Leave a memorable image." }
    ],
    overdone: [
      "Immigration story (unless a truly unique angle)",
      "Grandparent's death",
      "Sports taught me teamwork",
      "I'm a perfectionist",
      "Failure made me stronger"
    ],
    unique: [
      "Specific intellectual passion (how you fell in love with linguistics)",
      "Unusual hobby that reveals character",
      "Unique family situation or responsibility",
      "Surprising moment of growth",
      "Creative interpretation of an everyday object or concept"
    ]
  },

  supplementalEssays: [
    {
      type: "Why this school? (100–300 words)",
      look: ["Specific programs, professors, opportunities", "How you'll contribute to campus", "Genuine interest, not generic praise"],
      do: ['Mention by name: "Professor Chen\'s quantum computing research"', "Connect to your interests and goals", "Show fit"],
      dont: ['Generic praise: "prestigious," "world-class"', "List rankings or famous alumni", "Focus only on location"]
    },
    {
      type: "Why this major? (100–250 words)",
      look: ["Intellectual curiosity in the subject", "Relevant experiences (courses, projects, reading)", "Specific goals in the field", "Why this school's program specifically"]
    },
    {
      type: "Community / Diversity (200–300 words)",
      look: ["Background, identity, perspective you bring", "How you've contributed to community", "How you'll contribute to campus diversity"],
      avoid: ["Trauma dumping", "Oppression Olympics", "Generic diversity statements"]
    },
    {
      type: "Intellectual Vitality (150–300 words)",
      look: ["Passion for learning beyond grades", "Intellectual exploration", "Ideas that excite you", "Books you read for fun"]
    },
    {
      type: "Short Answer (25–100 words)",
      look: ["Favorite book, movie, quote", "Roommate essay", "Fun facts", "How you spend free time"]
    }
  ],

  essayTimeline: [
    { when: "Spring of Junior Year", do: ["Read sample essays", "Brainstorm topics", "Start outlining"] },
    { when: "Summer Before Senior Year", do: ["Write Common App essay (multiple drafts)", "Get feedback from English teacher, counselor", "Revise extensively"] },
    { when: "September–October Senior Year", do: ["Finalize Common App essay", "Write early-school supplements", "Submit early applications (Nov 1)"] },
    { when: "November–December", do: ["Write regular decision supplements", "Final revisions", "Submit by January 1"] }
  ],

  recommendations: {
    title: "Choosing & Requesting Recommendations",
    summary:
      "The best letters are specific, enthusiastic, and personal — not lists of your grades. Choose teachers who know you well, taught you recently in a core subject, and will write with energy.",
    choosing: [
      "Taught you in a core subject (English, Math, Science, History, Foreign Language)",
      "Taught you in 11th or 12th grade",
      "Knows you well personally, not just academically",
      "Has seen your growth and effort",
      "Likes you and will write enthusiastically",
      "Writes well themselves"
    ],
    idealMix: [
      "1 STEM teacher (if STEM major)",
      "1 Humanities teacher (shows breadth)",
      "OR 2 teachers in your intended major area + 1 outside"
    ],
    avoid: [
      "Teacher who gave you an A but doesn't know you",
      "9th-grade teacher (too long ago)",
      "PE / art teacher (unless exceptional)",
      "Family friend who's a teacher"
    ],
    timeline: [
      "Ask in April–May of junior year",
      "Give teachers 2–3 months to write",
      "Some teachers cap how many they write — ask early"
    ],
    howToAsk: [
      'Ask in person first: "Would you be willing to write me a strong letter?"',
      "If they hesitate, ask someone else",
      "Follow up with email and detail"
    ],
    bragSheet: [
      "Résumé / activity list",
      "Unofficial transcript",
      "Your goals and intended major",
      "Why you chose this teacher",
      "Specific memories from their class",
      "Qualities you hope they'll highlight",
      "List of schools and deadlines"
    ],
    greatLetterTraits: ["Specific (mentions exact moments)", "Enthusiastic (clear liking)", "Personal (reveals character)", 'Comparative ("best student in 20 years")'],
    weakLetterFlags: ["Generic praise", "Just lists grades", 'Lukewarm: "good student"', "Under one page"]
  },

  hooks: {
    title: "Hooks — What Moves the Needle",
    summary:
      "A 'hook' is something that makes you especially attractive to admissions beyond strong stats. Major hooks meaningfully improve your odds.",
    major: ["Recruited athlete (coach supports application)", "Legacy (less important now)", "Development case (family donated millions)", "Faculty / staff child", "Underrepresented minority (URM)", "First-generation college student", "Extraordinary achievement (Olympic, published author, patent, national winner)"],
    minor: ["Geographic diversity (Wyoming, Montana, etc.)", "Socioeconomic diversity (low-income)", "Unusual background or perspective", "Overcoming significant adversity"],
    notHooks: ["Being Asian or White", "Being from California, NY, NJ (overrepresented)", "Being middle / upper-middle class", "Being interested in popular majors", "Being 'well-rounded'"],
    firstGen: ["Indicate on application — positive factor", "Explain context if you had less guidance", "Highlight resourcefulness and initiative", "Many universities have special first-gen recruitment"],
    lowIncome: ["Explain work / family responsibilities", "Apply to schools with strong financial aid", "QuestBridge, Posse, and similar programs", "Need-blind schools meet 100% of demonstrated need"],
    athletes: ["Contact coaches junior year", "Camps and highlight videos", "Official visits", '"Likely letter" — pre-acceptance indication', "Still need strong academics, but admit rate jumps to 30–80%"]
  },

  demonstratedInterest: {
    title: "Demonstrated Interest",
    summary:
      "Demonstrated interest = showing you really want to attend. Some schools track it; many don't.",
    ways: ["Visit campus (in-person or virtual)", "Attend info sessions", "Email admissions officer thoughtful questions", "Apply Early Decision / Early Action", "Engage at college fairs", "Interview if offered", "Engage on official social media"],
    tracksIt: ["Many liberal arts colleges", "Many private universities", "Check the school's Common Data Set"],
    doesNot: ["Most Ivies, Stanford, MIT (too many applicants)", "Many top public universities"]
  },

  portfolioExamples: [
    {
      name: "Alex — Computer Science",
      gpa: "4.0 UW / 4.65 W",
      rank: "1 / 450",
      sat: "1570 (790 M, 780 ERW)",
      ap: "12 APs, all 5s",
      activities: [
        "Founder & President, CodeForward Nonprofit (500+ elementary students, $8K raised, 25 volunteers)",
        "Research Intern, State U CS Lab (ML for medical diagnosis, IEEE submission)",
        "USACO Platinum (top 200 nationally, mentored 5 students)",
        "Software Engineering Intern, Tech Startup (features used by 10K+ users)",
        "Robotics Team Programming Lead (autonomous nav, regional finalist)",
        "Math Team Captain (state top 20)",
        "Student Government Technology Director",
        "Volunteer Coding Tutor (15 students, 100% AP pass)",
        "Varsity Cross Country (4 yrs, captain)",
        "Piano ABRSM Grade 8 Distinction"
      ],
      honors: ["National Merit Finalist", "AP Scholar with Distinction", "USACO Platinum", "Congressional App Challenge Winner", "Presidential Scholars Candidate"],
      results: "MIT, Stanford, Harvard, Princeton, CMU"
    },
    {
      name: "Maya — Political Science / IR",
      gpa: "3.98 UW / 4.52 W",
      rank: "3 / 380",
      sat: "1540 (760 M, 780 ERW)",
      ap: "10 APs, mostly 5s",
      activities: [
        "Founder, Civic Engagement Initiative (2,000 voters, $5K grants)",
        "Model UN Head Delegate — Best Delegate, Harvard MUN",
        "Editor-in-Chief, School Newspaper (30-person staff, weekly publication)",
        "Congressional Intern, US Senator (DC office)",
        "Debate Captain Varsity Lincoln-Douglas (TOC elims, 20+ wins)",
        "Research Asst, Professor of Political Science (book on voting behavior)",
        "Volunteer, Immigrant Legal Aid (300+ hrs translation)",
        "Student Government President",
        "Quiz Bowl Varsity Captain (state champion)",
        "Volunteer Youth Tutor (200+ hrs)"
      ],
      honors: ["National Merit Finalist", "NSDA Academic All-American", "Model UN Best Delegate — Harvard", "Scholastic Writing Silver Key", "NHS President"],
      results: "Georgetown SFS, Princeton, Yale, Columbia, UChicago"
    },
    {
      name: "Jordan — Undecided / Liberal Arts",
      gpa: "3.96 UW / 4.58 W",
      rank: "5 / 420",
      act: "35",
      ap: "11 APs, mix of 4s and 5s",
      activities: [
        "Varsity Swimming Captain (state qualifier in 3 events)",
        "Founder, STEM Mentorship for Girls (50 mentees, 95% pursued STEM)",
        "Concertmaster, All-State Orchestra (Carnegie Hall)",
        "Research Intern, Environmental Science Lab (watershed study)",
        "Student Government VP (reduced school waste 40%)",
        "School Literary Magazine Editor",
        "Hospital Volunteer 300+ hrs pediatric ward",
        "Math Tutor (25 students)",
        "Environmental Club President",
        "Part-time Job, Swim Instructor (50+ children)"
      ],
      honors: ["National Merit Commended", "All-State Orchestra Concertmaster", "Presidential Volunteer Service Gold", "State Swimming Qualifier", "AP Scholar with Honor"],
      results: "Brown, Northwestern, Duke, Rice, Vanderbilt"
    }
  ],

  commonMistakes: [
    {
      area: "Academic",
      items: [
        { dont: "Taking easy classes for higher GPA", do: "Challenge yourself with rigorous courses" },
        { dont: "Focusing only on GPA, ignoring test scores", do: "Balanced excellence in both" },
        { dont: "Not showing intellectual curiosity beyond requirements", do: "Take courses out of interest, read widely" },
        { dont: "Grade drop in senior year", do: "Maintain or improve — schools can rescind admission" }
      ]
    },
    {
      area: "Extracurricular",
      items: [
        { dont: "Spreading yourself too thin (10+ superficial activities)", do: "Depth in 3–5 meaningful activities" },
        { dont: "Joining clubs just for college applications", do: "Genuine passion and commitment" },
        { dont: "No leadership or initiative", do: "Start something, lead something, change something" },
        { dont: "Generic service with no impact", do: "Meaningful service with measurable outcomes" },
        { dont: "Padding résumé with exaggerations", do: "Be truthful — admissions can verify, and do" }
      ]
    },
    {
      area: "Essays",
      items: [
        { dont: "Writing what you think admissions wants to hear", do: "Write your authentic story" },
        { dont: "Focusing on tragedy without growth", do: "Show resilience and what you learned" },
        { dont: "Résumé essay (listing achievements)", do: "Tell a story that reveals character" },
        { dont: "Using complicated vocabulary to sound smart", do: "Clear, genuine writing in your voice" },
        { dont: "Generic 'Why Us?' essays", do: "Specific programs, professors, opportunities" }
      ]
    },
    {
      area: "Application",
      items: [
        { dont: "Missing deadlines", do: "Submit early — never 11:59 pm" },
        { dont: "Not proofreading application", do: "Check for typos, correct school names" },
        { dont: "Unbalanced list (all reaches or all safeties)", do: "Mix of reach, target, safety" },
        { dont: "Applying to schools you haven't researched", do: "Only apply where you'd actually attend" },
        { dont: "Not applying for financial aid if needed", do: "Complete FAFSA / CSS Profile on time" }
      ]
    }
  ],

  financial: {
    costs: {
      private: { tuition: "$55,000–$65,000", roomBoard: "$15,000–$20,000", total: "$75,000–$85,000 / yr" },
      publicIn: { tuition: "$10,000–$15,000", roomBoard: "$12,000–$15,000", total: "$25,000–$35,000 / yr" },
      publicOut: { total: "$45,000–$65,000 / yr" }
    },
    aid: {
      meetFullNeed: ["All Ivy League schools", "Stanford, MIT, Duke, Northwestern, UChicago", "Top liberal arts colleges (Amherst, Williams, Swarthmore)"],
      needBlind: "All Ivies, MIT, Stanford are need-blind for US students. Some are need-aware for international.",
      merit: ["Top 10–20 schools typically don't offer merit aid", "Schools ranked 20–100 often offer merit scholarships ($10K → full tuition)"]
    },
    scholarships: [
      "National Merit (PSAT-based, $2,500)",
      "Coca-Cola Scholars ($20,000)",
      "Gates Scholarship (full cost of attendance)",
      "QuestBridge (low-income → top colleges)",
      "Posse Foundation (full-tuition leadership)"
    ],
    strategies: [
      "Apply to schools with strong financial aid",
      "Apply to schools offering merit aid (where your stats exceed their averages)",
      "Consider in-state publics (especially honors programs)",
      "Apply to many scholarships — even small ones add up",
      "Compare aid packages, negotiate if circumstances change"
    ]
  },

  yearTimeline: [
    {
      year: "Freshman (Grade 9)",
      lines: [
        "Adjust to high school rigor",
        "Explore different activities",
        "Build strong study habits",
        "Establish relationships with teachers",
        "Don't stress about college yet"
      ]
    },
    {
      year: "Sophomore (Grade 10)",
      lines: [
        "Increase academic rigor",
        "Narrow extracurricular focus",
        "Begin leadership roles",
        "Take PSAT 10 for practice",
        "Start thinking about possible majors"
      ]
    },
    {
      year: "Junior (Grade 11) — Most Critical",
      lines: [
        "Most rigorous course load you can handle",
        "Build relationships with future recommenders",
        "PSAT in October (National Merit)",
        "SAT / ACT in spring (March, May, June)",
        "AP exams in May",
        "Leadership positions in activities",
        "Significant summer plan (RSI / research / internship)"
      ]
    },
    {
      year: "Senior — Fall (Sept–Dec)",
      lines: [
        "Strong start to senior year — grades still matter",
        "Finalize college list",
        "Submit early applications (Nov 1)",
        "Continue leadership in activities"
      ]
    },
    {
      year: "Senior — Winter (Jan–Mar)",
      lines: [
        "Submit regular-decision apps (Jan 1–15)",
        "Complete FAFSA / CSS Profile",
        "Mid-year transcript",
        "Maintain grades"
      ]
    },
    {
      year: "Senior — Spring (Apr–May)",
      lines: [
        "Decisions released",
        "Visit accepted schools",
        "Compare financial aid",
        "Make final decision (May 1)",
        "Finish strong academically"
      ]
    }
  ]
};
