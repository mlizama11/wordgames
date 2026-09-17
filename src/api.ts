import { API_URL } from "./config";
import { Session } from "./types";

type AuthResponse = {
  user: { id: string; email: string };
  tokens: { accessToken: string; refreshToken: string };
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function networkError() {
  return new ApiError(
    0,
    `Could not reach the server at ${API_URL}. Check that the API is running and that the device can reach this address.`,
  );
}

async function request<T>(path: string, options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch {
    throw networkError();
  }
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;
  if (!response.ok)
    throw new ApiError(response.status, body.error ?? "Something went wrong.");
  return body as T;
}

function toSession(response: AuthResponse): Session {
  return {
    email: response.user.email,
    accessToken: response.tokens.accessToken,
    refreshToken: response.tokens.refreshToken,
  };
}

export async function register(email: string, password: string) {
  return toSession(
    await request<AuthResponse>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  );
}

export async function login(email: string, password: string) {
  return toSession(
    await request<AuthResponse>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  );
}

export async function refresh(refreshToken: string) {
  return toSession(
    await request<AuthResponse>("/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
  );
}

export async function logout(refreshToken: string) {
  await request("/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export type DailyClue = {
  clueDate: string;
  clue: string;
  answerLength: number;
  completed: boolean;
};

export async function getDailyClue(accessToken: string) {
  return request<DailyClue>("/v1/games/daily-clue", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function submitDailyGuess(accessToken: string, guess: string) {
  return request<{ correct: boolean; completed: boolean }>(
    "/v1/games/daily-clue/guess",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ guess }),
    },
  );
}
