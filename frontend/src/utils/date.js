// Every date the app shows is DD/MM/YYYY.
//
// Don't call toLocaleDateString() directly in a component: with no locale it follows
// whatever the visitor's browser is set to, so the same screen reads 10/15/2026 in the
// US and 15/10/2026 in Thailand. These helpers pin the order.
//
// They accept a Date, an ISO string, or a timestamp, and return "" for anything empty
// or unparseable, so a missing value renders as nothing rather than "Invalid Date".

const toDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const pad = (n) => String(n).padStart(2, "0");

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// 15/10/2026
export function fmtDate(value) {
  const d = toDate(value);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : "";
}

// 15/10/2026 14:30
export function fmtDateTime(value) {
  const d = toDate(value);
  return d ? `${fmtDate(d)} ${fmtTime(d)}` : "";
}

// 14:30
export function fmtTime(value) {
  const d = toDate(value);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "";
}

// 15 Oct — for tight columns where the year is obvious
export function fmtDayMonth(value) {
  const d = toDate(value);
  return d ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` : "";
}

// 15 October 2026 — for printed output such as the PDF portfolio
export function fmtDateLong(value) {
  const d = toDate(value);
  return d ? `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` : "";
}
