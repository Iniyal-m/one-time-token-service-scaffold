
// token-service.js
// A single-use, expiring token service backed by Redis.

import crypto from "node:crypto";
import Redis from "ioredis";
import "dotenv/config";

const redis = new Redis(process.env.REDIS_URL);

// Helper: build the Redis key for a token id.
const keyFor = (id) => "token:" + id;

/**
 * Issue a single-use token that expires after ttlSeconds.
 */
export async function issueToken(payload, ttlSeconds) {
  // 1. Generate a random 32-character token ID
  const tokenId = crypto.randomBytes(16).toString("hex");

  // 2. Convert payload into JSON
  const value = JSON.stringify(payload);

  // 3. Store token with TTL atomically
  await redis.set(keyFor(tokenId), value, "EX", ttlSeconds, "NX");

  // 4. Return token ID
  return tokenId;
}

/**
 * Consume a token exactly once.
 */
export async function consumeToken(tokenId) {
  // 1. Read and delete token atomically
  const value = await redis.getdel(keyFor(tokenId));

  // 2. If token does not exist or has expired
  if (value === null) {
    return {
      ok: false,
      reason: "invalid"
    };
  }

  // 3. Return the parsed payload
  return {
    ok: true,
    payload: JSON.parse(value)
  };
}

// Allow other files to close the connection cleanly.
export function closeRedis() {
  return redis.quit();
}
