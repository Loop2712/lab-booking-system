import crypto from "crypto";

export function generateRawToken() {
  return crypto.randomBytes(32).toString("base64url"); // เดายากมาก
}

export function hashToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
