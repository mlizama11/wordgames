import { createHash, randomUUID, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config.js";
import { query } from "./db.js";

const jwtSecret = new TextEncoder().encode(config.JWT_SECRET);

export type AuthUser = { id: string; email: string };
export type TokenPair = { accessToken: string; refreshToken: string };

export function hashRefreshToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueAccessToken(user: AuthUser) {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(config.ACCESS_TOKEN_TTL)
    .sign(jwtSecret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, jwtSecret, {
    algorithms: ["HS256"],
  });
  if (!payload.sub || typeof payload.email !== "string")
    throw new Error("Invalid token claims");
  return { id: payload.sub, email: payload.email } satisfies AuthUser;
}

export async function issueRefreshToken(userId: string) {
  const refreshToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + config.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  );
  await query(
    "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [randomUUID(), userId, hashRefreshToken(refreshToken), expiresAt],
  );
  return refreshToken;
}

export async function issueTokenPair(user: AuthUser): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    issueAccessToken(user),
    issueRefreshToken(user.id),
  ]);
  return { accessToken, refreshToken };
}
