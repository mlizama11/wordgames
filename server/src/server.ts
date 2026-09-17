import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import { timingSafeEqual } from "node:crypto";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ZodError, z } from "zod";
import { config } from "./config.js";
import { pool, query, withTransaction } from "./db.js";
import {
  loginUser,
  registerUser,
  revokeRefreshToken,
  rotateRefreshToken,
} from "./auth.js";
import { verifyAccessToken } from "./tokens.js";

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
});
const refreshSchema = z.object({ refreshToken: z.string().min(1).max(200) });
const guessSchema = z.object({ guess: z.string().trim().min(1).max(32) });
const clueDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const clueInputSchema = z.object({
  clueDate: clueDateSchema,
  clue: z.string().trim().min(5).max(500),
  answer: z
    .string()
    .trim()
    .min(1)
    .max(32)
    .transform((value) => value.toUpperCase()),
});
const clueFieldsSchema = clueInputSchema.omit({ clueDate: true });

export function buildServer() {
  const app = Fastify({
    logger: true,
    trustProxy: config.TRUST_PROXY,
    bodyLimit: 10_000,
  });
  app.register(helmet);
  app.register(cors, {
    origin: (origin, callback) => {
      if (
        config.NODE_ENV !== "production" &&
        (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))
      ) {
        callback(null, true);
        return;
      }

      const allowedOrigins = config.CORS_ORIGIN.split(",").map((value) =>
        value.trim(),
      );
      callback(null, origin ? allowedOrigins.includes(origin) : false);
    },
  });
  app.register(rateLimit, { max: 100, timeWindow: "1 minute" });

  app.get("/", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Wordly API</title>
    <style>
      :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f4ec; color: #17221f; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; }
      main { width: min(680px, calc(100% - 40px)); }
      .brand { font-size: 14px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #7d8780; }
      h1 { margin: 14px 0 10px; font-size: clamp(38px, 8vw, 68px); line-height: 1; letter-spacing: -.05em; }
      p { color: #52605a; font-size: 17px; line-height: 1.6; }
      .status { display: inline-flex; align-items: center; gap: 10px; margin: 24px 0 34px; padding: 12px 16px; background: #d9ee77; font-weight: 800; }
      .dot { width: 10px; height: 10px; border-radius: 50%; background: #17221f; }
      section { border-top: 1px solid #d8d9ce; padding-top: 20px; }
      dl { display: grid; grid-template-columns: 120px 1fr; gap: 12px 20px; margin: 0; }
      dt { color: #7d8780; font-weight: 700; }
      dd { margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 14px; }
      a { color: #17221f; font-weight: 800; }
    </style>
  </head>
  <body>
    <main>
      <div class="brand">Wordly API</div>
      <h1>Server is running.</h1>
      <p>The authentication service is online and ready to receive requests.</p>
      <div class="status"><span class="dot" aria-hidden="true"></span> Operational</div>
      <section>
        <dl>
          <dt>Environment</dt><dd>${config.NODE_ENV}</dd>
          <dt>Health</dt><dd><a href="/health">/health</a></dd>
          <dt>Auth API</dt><dd>/v1/auth/*</dd>
          <dt>Database</dt><dd>PostgreSQL</dd>
        </dl>
      </section>
    </main>
  </body>
</html>`);
  });

  app.get("/health", async (_request, reply) => {
    try {
      await pool.query("SELECT 1");
      return { status: "ok" };
    } catch {
      return reply.code(503).send({ status: "error" });
    }
  });

  app.post(
    "/v1/auth/register",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { email, password } = credentialsSchema.parse(request.body);
      try {
        return reply.code(201).send(await registerUser(email, password));
      } catch (error: unknown) {
        if (isUniqueViolation(error))
          return reply
            .code(409)
            .send({ error: "An account with that email already exists." });
        throw error;
      }
    },
  );

  app.post(
    "/v1/auth/login",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { email, password } = credentialsSchema.parse(request.body);
      const result = await loginUser(email, password);
      if (!result)
        return reply.code(401).send({ error: "Invalid email or password." });
      return reply.send(result);
    },
  );

  app.post("/v1/auth/refresh", async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    const result = await rotateRefreshToken(refreshToken);
    if (!result)
      return reply
        .code(401)
        .send({ error: "Invalid or expired refresh token." });
    return reply.send(result);
  });

  app.post("/v1/auth/logout", async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    await revokeRefreshToken(refreshToken);
    return reply.code(204).send();
  });

  app.get("/v1/admin/daily-clues", async (request, reply) => {
    if (!authenticateAdmin(request, reply)) return;
    const result = await query<{
      clue_date: string;
      clue: string;
      answer: string;
      created_at: Date;
    }>(
      "SELECT clue_date, clue, answer, created_at FROM daily_clues ORDER BY clue_date",
    );
    return reply.send(
      result.rows.map((row) => ({
        clueDate: row.clue_date,
        clue: row.clue,
        answer: row.answer,
        createdAt: row.created_at,
      })),
    );
  });

  app.post("/v1/admin/daily-clues", async (request, reply) => {
    if (!authenticateAdmin(request, reply)) return;
    const input = clueInputSchema.parse(request.body);
    try {
      await query(
        "INSERT INTO daily_clues (clue_date, clue, answer) VALUES ($1, $2, $3)",
        [input.clueDate, input.clue, input.answer],
      );
    } catch (error: unknown) {
      if (isUniqueViolation(error))
        return reply
          .code(409)
          .send({ error: "A clue already exists for that date." });
      throw error;
    }
    return reply.code(201).send(input);
  });

  app.put("/v1/admin/daily-clues/:clueDate", async (request, reply) => {
    if (!authenticateAdmin(request, reply)) return;
    const clueDate = clueDateSchema.parse(
      (request.params as { clueDate: string }).clueDate,
    );
    const fields = clueFieldsSchema.parse(request.body);
    const input = { ...fields, clueDate };
    const result = await query(
      "UPDATE daily_clues SET clue = $2, answer = $3 WHERE clue_date = $1",
      [clueDate, input.clue, input.answer],
    );
    if (!result.rowCount)
      return reply.code(404).send({ error: "Clue not found." });
    return reply.send(input);
  });

  app.delete("/v1/admin/daily-clues/:clueDate", async (request, reply) => {
    if (!authenticateAdmin(request, reply)) return;
    const clueDate = clueDateSchema.parse(
      (request.params as { clueDate: string }).clueDate,
    );
    const result = await query("DELETE FROM daily_clues WHERE clue_date = $1", [
      clueDate,
    ]);
    if (!result.rowCount)
      return reply.code(404).send({ error: "Clue not found." });
    return reply.code(204).send();
  });

  app.get("/v1/games/daily-clue", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;

    const result = await query<{
      clue_date: string;
      clue: string;
      answer_length: number;
      completed_at: Date | null;
    }>(
      `SELECT daily_clues.clue_date, daily_clues.clue,
              CHAR_LENGTH(daily_clues.answer) AS answer_length,
              daily_clue_completions.completed_at
       FROM daily_clues
       LEFT JOIN daily_clue_completions
         ON daily_clue_completions.clue_date = daily_clues.clue_date
        AND daily_clue_completions.user_id = $1
       WHERE daily_clues.clue_date = CURRENT_DATE`,
      [user.id],
    );
    const clue = result.rows[0];
    if (!clue)
      return reply.code(404).send({ error: "Today's puzzle is unavailable." });
    return reply.send({
      clueDate: clue.clue_date,
      clue: clue.clue,
      answerLength: clue.answer_length,
      completed: Boolean(clue.completed_at),
    });
  });

  app.post("/v1/games/daily-clue/guess", async (request, reply) => {
    const user = await authenticate(request, reply);
    if (!user) return;
    const { guess } = guessSchema.parse(request.body);

    const result = await withTransaction(async (client) => {
      const clueResult = await client.query<{
        clue_date: string;
        answer: string;
      }>(
        "SELECT clue_date, answer FROM daily_clues WHERE clue_date = CURRENT_DATE FOR UPDATE",
      );
      const clue = clueResult.rows[0];
      if (!clue) return null;

      const correct = guess.toUpperCase() === clue.answer;
      if (correct) {
        await client.query(
          `INSERT INTO daily_clue_completions (user_id, clue_date)
           VALUES ($1, $2)
           ON CONFLICT (user_id, clue_date) DO NOTHING`,
          [user.id, clue.clue_date],
        );
      }
      return { correct };
    });

    if (!result)
      return reply.code(404).send({ error: "Today's puzzle is unavailable." });
    return reply.send({ correct: result.correct, completed: result.correct });
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError)
      return reply.code(400).send({ error: "Invalid request." });
    app.log.error(error);
    return reply.code(500).send({ error: "Internal server error." });
  });

  return app;
}

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Authentication required." });
    return null;
  }
  try {
    return await verifyAccessToken(header.slice("Bearer ".length));
  } catch {
    reply.code(401).send({ error: "Invalid or expired access token." });
    return null;
  }
}

function authenticateAdmin(request: FastifyRequest, reply: FastifyReply) {
  const configuredKey = config.ADMIN_API_KEY;
  const providedKey = request.headers["x-admin-key"];
  if (!configuredKey || typeof providedKey !== "string") {
    reply.code(401).send({ error: "Admin authentication required." });
    return false;
  }

  const configuredBytes = Buffer.from(configuredKey);
  const providedBytes = Buffer.from(providedKey);
  const validLength = configuredBytes.length === providedBytes.length;
  const validKey =
    validLength && timingSafeEqual(configuredBytes, providedBytes);
  if (!validKey) {
    reply.code(401).send({ error: "Admin authentication required." });
    return false;
  }
  return true;
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

if (process.env.NODE_ENV !== "test") {
  const app = buildServer();
  app.listen({ port: config.PORT, host: "0.0.0.0" }).catch(async (error) => {
    app.log.error(error);
    await pool.end();
    process.exit(1);
  });
}
