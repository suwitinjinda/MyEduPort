const pool = require("../db");

// Admin-editable dropdown lists used on the student Portfolio pages:
//   majors       Personal  > Intended Majors
//   curriculums  Academics > Section I > Curriculums
//   subjects     Academics > Section I > Subject — each group lists the curriculums it belongs
//                to (`curriculums`); students only see the groups for the curriculum they chose.
//                A group with no curriculums is shown for every curriculum.
//   tests        Academics > Section II > Test
// (Intended Universities come from the universities table — Admin → Universities.)
// Each list is an array of groups: [{ label, options: [string] }]. Stored in
// app_settings under 'option_lists'; lists not saved yet fall back to these defaults.
const OPTION_LIST_KEYS = ["majors", "curriculums", "subjects", "tests"];
const DEFAULT_OPTION_LISTS = {
  "majors": [
    {
      "label": "Majors",
      "options": [
        "Computer Science",
        "Software Engineering",
        "Data Science",
        "Artificial Intelligence",
        "Information Technology",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Chemical Engineering",
        "Aerospace Engineering",
        "Biomedical Engineering",
        "Engineering (General)",
        "Mathematics",
        "Statistics",
        "Physics",
        "Chemistry",
        "Biology",
        "Biochemistry",
        "Environmental Science",
        "Neuroscience",
        "Medicine",
        "Nursing",
        "Pharmacy",
        "Public Health",
        "Dentistry",
        "Veterinary Science",
        "Psychology",
        "Economics",
        "Business Administration",
        "Finance",
        "Accounting",
        "Marketing",
        "Management",
        "International Business",
        "Law",
        "Political Science",
        "International Relations",
        "Sociology",
        "Philosophy",
        "History",
        "English Literature",
        "Linguistics",
        "Communications",
        "Journalism",
        "Media Studies",
        "Education",
        "Architecture",
        "Art & Design",
        "Music",
        "Film & Media",
        "Performing Arts",
        "Anthropology",
        "Geography",
        "Agriculture",
        "Hospitality & Tourism",
        "Sports Science",
        "Social Work",
        "Other"
      ]
    }
  ],
  "curriculums": [
    {
      "label": "International",
      "options": [
        "IB Diploma Programme (IBDP)",
        "IB Middle Years Programme (MYP)",
        "Cambridge IGCSE",
        "A-Level / AS-Level"
      ]
    },
    {
      "label": "American",
      "options": [
        "AP (Advanced Placement)",
        "US High School Diploma",
        "US Honors Program"
      ]
    },
    {
      "label": "Thai",
      "options": [
        "Thai National Curriculum",
        "Thai English Program (EP)"
      ]
    },
    {
      "label": "Other",
      "options": [
        "Other (please specify)"
      ]
    }
  ],
  "subjects": [
    {
      "label": "AP — STEM",
      "options": [
        "AP Calculus BC",
        "AP Calculus AB",
        "AP Statistics",
        "AP Physics C: Mechanics",
        "AP Physics C: E&M",
        "AP Physics 1",
        "AP Physics 2",
        "AP Chemistry",
        "AP Biology",
        "AP Computer Science A",
        "AP Computer Science Principles",
        "AP Environmental Science"
      ],
      "curriculums": [
        "AP (Advanced Placement)",
        "US High School Diploma",
        "US Honors Program"
      ]
    },
    {
      "label": "AP — Humanities",
      "options": [
        "AP English Language",
        "AP English Literature",
        "AP US History",
        "AP World History",
        "AP European History",
        "AP US Government",
        "AP Comparative Government",
        "AP Macroeconomics",
        "AP Microeconomics",
        "AP Psychology",
        "AP Human Geography"
      ],
      "curriculums": [
        "AP (Advanced Placement)",
        "US High School Diploma",
        "US Honors Program"
      ]
    },
    {
      "label": "AP — Languages & Arts",
      "options": [
        "AP Spanish Language",
        "AP French Language",
        "AP Chinese Language",
        "AP Latin",
        "AP Art History",
        "AP Studio Art",
        "AP Music Theory"
      ],
      "curriculums": [
        "AP (Advanced Placement)",
        "US High School Diploma",
        "US Honors Program"
      ]
    },
    {
      "label": "IB — Languages",
      "curriculums": [
        "IB Diploma Programme (IBDP)"
      ],
      "options": [
        "English A: Language & Literature",
        "English A: Literature",
        "Thai A: Literature",
        "Chinese A: Language & Literature",
        "English B",
        "Chinese B",
        "Spanish B",
        "French B",
        "Japanese B",
        "Mandarin ab initio",
        "Spanish ab initio",
        "French ab initio"
      ]
    },
    {
      "label": "IB — Individuals & Societies",
      "curriculums": [
        "IB Diploma Programme (IBDP)"
      ],
      "options": [
        "Economics",
        "Business Management",
        "History",
        "Geography",
        "Psychology",
        "Global Politics",
        "Digital Society",
        "Philosophy"
      ]
    },
    {
      "label": "IB — Sciences",
      "curriculums": [
        "IB Diploma Programme (IBDP)"
      ],
      "options": [
        "Biology",
        "Chemistry",
        "Physics",
        "Computer Science",
        "Design Technology",
        "Sports, Exercise & Health Science",
        "Environmental Systems & Societies"
      ]
    },
    {
      "label": "IB — Mathematics & Arts",
      "curriculums": [
        "IB Diploma Programme (IBDP)"
      ],
      "options": [
        "Mathematics: Analysis & Approaches",
        "Mathematics: Applications & Interpretation",
        "Visual Arts",
        "Music",
        "Theatre",
        "Film"
      ]
    },
    {
      "label": "IB — Core",
      "curriculums": [
        "IB Diploma Programme (IBDP)"
      ],
      "options": [
        "Theory of Knowledge",
        "Extended Essay",
        "CAS"
      ]
    },
    {
      "label": "MYP — Subject groups",
      "curriculums": [
        "IB Middle Years Programme (MYP)"
      ],
      "options": [
        "Language & Literature",
        "Language Acquisition",
        "Individuals & Societies",
        "Sciences",
        "Mathematics",
        "Arts",
        "Physical & Health Education",
        "Design",
        "Personal Project"
      ]
    },
    {
      "label": "IGCSE — Languages",
      "curriculums": [
        "Cambridge IGCSE"
      ],
      "options": [
        "First Language English",
        "English as a Second Language",
        "First Language Thai",
        "Mandarin Chinese",
        "French",
        "Spanish"
      ]
    },
    {
      "label": "IGCSE — Maths & Sciences",
      "curriculums": [
        "Cambridge IGCSE"
      ],
      "options": [
        "Mathematics",
        "Additional Mathematics",
        "Biology",
        "Chemistry",
        "Physics",
        "Combined Science",
        "Computer Science",
        "ICT"
      ]
    },
    {
      "label": "IGCSE — Humanities & Arts",
      "curriculums": [
        "Cambridge IGCSE"
      ],
      "options": [
        "Economics",
        "Business Studies",
        "Accounting",
        "History",
        "Geography",
        "Global Perspectives",
        "Art & Design",
        "Music",
        "Drama"
      ]
    },
    {
      "label": "A-Level — Maths & Sciences",
      "curriculums": [
        "A-Level / AS-Level"
      ],
      "options": [
        "Mathematics",
        "Further Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "Computer Science"
      ]
    },
    {
      "label": "A-Level — Humanities & Languages",
      "curriculums": [
        "A-Level / AS-Level"
      ],
      "options": [
        "Economics",
        "Business",
        "Accounting",
        "Psychology",
        "Sociology",
        "Law",
        "History",
        "Geography",
        "English Literature",
        "English Language",
        "Chinese",
        "French",
        "Thai"
      ]
    },
    {
      "label": "A-Level — Arts",
      "curriculums": [
        "A-Level / AS-Level"
      ],
      "options": [
        "Art & Design",
        "Music",
        "Drama & Theatre",
        "Media Studies"
      ]
    },
    {
      "label": "Thai curriculum — Core",
      "curriculums": [
        "Thai National Curriculum",
        "Thai English Program (EP)"
      ],
      "options": [
        "Thai Language",
        "Mathematics",
        "Additional Mathematics",
        "Science",
        "Physics",
        "Chemistry",
        "Biology",
        "Earth & Space Science",
        "Social Studies",
        "History",
        "English",
        "Health & Physical Education",
        "Arts",
        "Occupations & Technology",
        "Computing Science"
      ]
    },
    {
      "label": "Thai curriculum — Additional languages",
      "curriculums": [
        "Thai National Curriculum",
        "Thai English Program (EP)"
      ],
      "options": [
        "Chinese",
        "Japanese",
        "French",
        "German",
        "Korean"
      ]
    },
    {
      "label": "US High School — Core courses",
      "curriculums": [
        "US High School Diploma",
        "US Honors Program"
      ],
      "options": [
        "English 9",
        "English 10",
        "English 11",
        "English 12",
        "Algebra I",
        "Geometry",
        "Algebra II",
        "Precalculus",
        "Biology",
        "Chemistry",
        "Physics",
        "US History",
        "World History",
        "Government",
        "Economics",
        "Spanish",
        "French",
        "Mandarin",
        "Computer Science",
        "Visual Arts",
        "Music",
        "Health & PE"
      ]
    }
  ],
  "tests": [
    {
      "label": "Standardized",
      "options": [
        "SAT",
        "ACT",
        "PSAT"
      ]
    },
    {
      "label": "English Proficiency",
      "options": [
        "IELTS",
        "TOEFL",
        "Duolingo"
      ]
    },
    {
      "label": "Other",
      "options": [
        "Other (please specify)"
      ]
    }
  ]
};

async function getOptionLists() {
  try {
    const [[row]] = await pool.query("SELECT sval FROM app_settings WHERE skey = 'option_lists'");
    if (row && row.sval) {
      const v = typeof row.sval === "string" ? JSON.parse(row.sval) : row.sval;
      const out = {};
      for (const k of OPTION_LIST_KEYS) out[k] = Array.isArray(v[k]) ? v[k] : DEFAULT_OPTION_LISTS[k];
      out.subjects = upgradeSubjects(out.subjects);
      return out;
    }
  } catch (err) { /* table missing → defaults */ }
  return DEFAULT_OPTION_LISTS;
}

// Subject lists saved before subjects were tied to curriculums had only AP groups and no
// tags: tag those as AP/US and add the starter groups for the other curriculums.
function upgradeSubjects(groups) {
  if (!Array.isArray(groups) || groups.some((g) => Array.isArray(g.curriculums))) return groups;
  const AP = ["AP (Advanced Placement)", "US High School Diploma", "US Honors Program"];
  const tagged = groups.map((g) => (/^AP\b/i.test(g.label || "") ? { ...g, curriculums: AP } : g));
  const starters = DEFAULT_OPTION_LISTS.subjects.filter((g) => !/^AP\b/i.test(g.label));
  return [...tagged, ...starters];
}

// Trim, drop blanks/duplicates within a group, cap sizes. The same subject may appear in
// several groups (e.g. Biology for IB and for IGCSE).
function cleanGroups(groups) {
  if (!Array.isArray(groups)) return null;
  return groups.slice(0, 80).map((g) => {
    const seen = new Set();
    const out = {
      label: String(g?.label || "").trim().slice(0, 60) || "Other",
      options: (Array.isArray(g?.options) ? g.options : [])
        .map((o) => String(o || "").trim().slice(0, 120))
        .filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase()))
        .slice(0, 300)
    };
    if (Array.isArray(g?.curriculums)) out.curriculums = [...new Set(g.curriculums.map((c) => String(c || "").trim().slice(0, 120)).filter(Boolean))].slice(0, 30);
    return out;
  }).filter((g) => g.options.length);
}

async function setOptionList(key, groups) {
  const all = await getOptionLists();
  const next = { ...all, [key]: groups };
  await pool.query(
    "INSERT INTO app_settings (skey, sval) VALUES ('option_lists', ?) ON DUPLICATE KEY UPDATE sval = VALUES(sval)",
    [JSON.stringify(next)]
  );
  return next;
}

module.exports = { OPTION_LIST_KEYS, DEFAULT_OPTION_LISTS, getOptionLists, cleanGroups, setOptionList };
