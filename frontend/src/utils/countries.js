// The study destinations MyEduPort covers. `value` is how the university list stores the
// country (US/UK are short there); `label` is how students choose it in Target Countries.
export const STUDY_COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "UK", label: "United Kingdom" },
  { value: "Canada", label: "Canada" },
  { value: "Australia", label: "Australia" },
  { value: "New Zealand", label: "New Zealand" },
  { value: "China", label: "China" },
  { value: "Hong Kong", label: "Hong Kong" },
  { value: "Taiwan", label: "Taiwan" },
  { value: "Singapore", label: "Singapore" },
  { value: "Japan", label: "Japan" },
  { value: "Thailand", label: "Thailand" },
  { value: "Netherlands", label: "Netherlands" },
  { value: "Germany", label: "Germany" },
  { value: "France", label: "France" },
  { value: "Switzerland", label: "Switzerland" }
];

// "United States" (Target Countries) → "US" (university list)
export const uniCountryOf = (label) => STUDY_COUNTRIES.find((c) => c.label === label)?.value || label;
