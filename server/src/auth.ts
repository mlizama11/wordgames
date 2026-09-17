import argon2 from "argon2";
import { randomBytes, randomUUID } from "node:crypto";
import { config } from "./config.js";
import { query, withTransaction } from "./db.js";
import {
  hashRefreshToken,
  issueAccessToken,
  issueTokenPair,
  type AuthUser,
} from "./tokens.js";

export async function registerUser(email: string, password: string) {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await withTransaction(async (client) => {
    const result = await client.query<AuthUser>(
      "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email",
      [randomUUID(), email, passwordHash],
    );
    return result.rows[0];
  });
  return { user, tokens: await issueTokenPair(user) };
}

export async function loginUser(email: string, password: string) {
  const result = await query<{
    id: string;
    email: string;
    password_hash: string;
  }>("SELECT id, email, password_hash FROM users WHERE email = $1", [email]);
  const user = result.rows[0];
  if (!user || !(await argon2.verify(user.password_hash, password)))
    return null;
  const authUser = { id: user.id, email: user.email } satisfies AuthUser;
  return { user: authUser, tokens: await issueTokenPair(authUser) };
}

export async function rotateRefreshToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  return withTransaction(async (client) => {
    const result = await client.query<{
      id: string;
      user_id: string;
      email: string;
    }>(
      `SELECT refresh_tokens.id, refresh_tokens.user_id, users.email
       FROM refresh_tokens JOIN users ON users.id = refresh_tokens.user_id
       WHERE refresh_tokens.token_hash = $1
         AND refresh_tokens.revoked_at IS NULL
         AND refresh_tokens.expires_at > NOW()
       FOR UPDATE`,
      [tokenHash],
    );
    const stored = result.rows[0];
    if (!stored) return null;
    await client.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1",
      [stored.id],
    );
    const user = { id: stored.user_id, email: stored.email } satisfies AuthUser;
    const refreshToken = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + config.REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    );
    const accessToken = await issueAccessToken(user);
    await client.query(
      "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)",
      [randomUUID(), user.id, hashRefreshToken(refreshToken), expiresAt],
    );
    return { user, tokens: { accessToken, refreshToken } };
  });
}

export async function revokeRefreshToken(refreshToken: string) {
  await query(
    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL",
    [hashRefreshToken(refreshToken)],
  );
}
