import crypto from "crypto";

type Payload = {
  uid: string;
  exp: number; // epoch seconds
};

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlToBuffer(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Buffer.from(b64, "base64");
}

function sign(payloadB64: string, secret: string) {
  return b64url(crypto.createHmac("sha256", secret).update(payloadB64).digest());
}

export function makeUserQrToken(uid: string, ttlSeconds = 60 * 60 * 24 * 30) {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret) throw new Error("QR_TOKEN_SECRET is missing");

  const payload: Payload = { uid, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const payloadB64 = b64url(JSON.stringify(payload));
  const sig = sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export function verifyUserQrToken(token: string) {
  const secret = process.env.QR_TOKEN_SECRET;
  if (!secret) throw new Error("QR_TOKEN_SECRET is missing");

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return { ok: false as const, reason: "BAD_FORMAT" };

  const expected = sign(payloadB64, secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false as const, reason: "BAD_SIGNATURE" };
  }

  let payload: Payload;
  try {
    payload = JSON.parse(b64urlToBuffer(payloadB64).toString("utf8"));
  } catch {
    return { ok: false as const, reason: "BAD_PAYLOAD" };
  }

  if (!payload?.uid || !payload?.exp) return { ok: false as const, reason: "BAD_PAYLOAD" };
  if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false as const, reason: "EXPIRED" };

  return { ok: true as const, uid: payload.uid, exp: payload.exp };
}
