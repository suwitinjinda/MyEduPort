// The five Admission Resources sections. Keys match blog_posts.category in the backend.
export const SECTIONS = [
  { key: "articles", label: "Articles", description: "Expert guidance on applications, essay strategy, extracurricular planning, and profile building." },
  { key: "university", label: "University", description: "University profiles, admission requirements, acceptance trends, and academic fit." },
  { key: "scholarship", label: "Scholarship", description: "Scholarships, eligibility, and deadlines for financial support." },
  { key: "practice-tests", label: "Practice Tests", description: "Practice material, score goals, and test strategy for standardized exams." },
  { key: "ebooks", label: "eBook & Guides", description: "Step-by-step guides for application planning and portfolio development." }
];

export const sectionLabel = (key) => SECTIONS.find((s) => s.key === key)?.label || key;
