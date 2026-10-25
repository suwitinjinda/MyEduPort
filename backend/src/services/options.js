const pool = require("../db");

// Admin-editable dropdown lists used on the student Portfolio pages:
//   majors       Personal  > Intended Majors
//   curriculums  Academics > Section I > Curriculums
//   subjects     Academics > Section I > Subject
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
        "IB Diploma (IBDP)",
        "IB Middle Years (MYP)",
        "Cambridge IGCSE",
        "A-Level"
      ]
    },
    {
      "label": "American",
      "options": [
        "AP / US High School",
        "US Honors"
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
        "Other"
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
      return out;
    }
  } catch (err) { /* table missing → defaults */ }
  return DEFAULT_OPTION_LISTS;
}

// Trim, drop blanks/duplicates, cap sizes
function cleanGroups(groups) {
  if (!Array.isArray(groups)) return null;
  const seen = new Set();
  return groups.slice(0, 50).map((g) => ({
    label: String(g?.label || "").trim().slice(0, 60) || "Other",
    options: (Array.isArray(g?.options) ? g.options : [])
      .map((o) => String(o || "").trim().slice(0, 120))
      .filter((o) => o && !seen.has(o.toLowerCase()) && seen.add(o.toLowerCase()))
      .slice(0, 300)
  })).filter((g) => g.options.length);
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
