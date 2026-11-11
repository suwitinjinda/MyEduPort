const crypto = require("crypto");

// Small AES-256-GCM helper for values that must be readable later but not stored in plain
// text (the SMTP password, parent consent links). The key is derived from JWT_SECRET and a
// purpose label, so each use has its own key.
const keyFor = (purpose) => crypto.createHash("sha256").update(`${purpose}:${process.env.JWT_SECRET || ""}`).digest();

function seal(purpose, text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", keyFor(purpose), iv);
  const enc = Buffer.concat([c.update(String(text), "utf8"), c.final()]);
  return `v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${enc.toString("base64")}`;
}

function open(purpose, blob) {
  const [v, iv, tag, data] = String(blob || "").split(":");
  if (v !== "v1") return "";
  const d = crypto.createDecipheriv("aes-256-gcm", keyFor(purpose), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}

module.exports = { seal, open };
