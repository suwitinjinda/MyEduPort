const jwt = require("jsonwebtoken");
const { isLimited } = require("../services/consents");

// Students under 20 waiting for a parent's consent (MyEduPort_Consent_Form_202611.docx:
// "full access only after a parent confirms"; "accounts waiting for parent confirmation keep
// only the data needed"). Until then they can sign in, read pages, fill in the basics in
// Personal and manage the parent request — but nothing is sent to MEPAi (processing abroad
// needs the parent's cross-border consent) and nothing else is saved or uploaded.
//
// Accounts from before the consent form keep full access while their request is open; they
// are limited only once it has expired without an answer.

const ALLOWED_WRITES = [
  /^\/api\/auth\//,          // sign in/out, consents, account deletion
  /^\/api\/consent\//,       // the parent request itself
  /^\/api\/students\/me$/,   // Personal basics (PUT)
  /^\/api\/email\//,         // unsubscribe links
  /^\/api\/ref\//            // referral visit counting
];

async function parentConsentGate(req, res, next) {
  if (!req.path.startsWith("/api/")) return next();
  const isRead = /^(GET|HEAD|OPTIONS)$/i.test(req.method);
  const isAi = req.path.startsWith("/api/ai/");
  if (isRead && !isAi) return next();
  if (!isAi && ALLOWED_WRITES.some((re) => re.test(req.path))) return next();

  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return next();
  let payload;
  try { payload = jwt.verify(header.slice(7), process.env.JWT_SECRET); } catch { return next(); }
  if (payload.role !== "student") return next();

  try {
    if (!(await isLimited(payload.id))) return next();
    return res.status(403).json({
      error: "Your parent or guardian needs to give consent before you can use this. Check “Waiting for your parent” for the link to send them.",
      code: "parent_consent_pending"
    });
  } catch (err) {
    return next(); // migration not run yet — don't block anyone
  }
}

module.exports = { parentConsentGate };
