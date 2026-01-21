import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Safe ratelimit:
 * - If Upstash env vars are missing, we disable ratelimiting (dev-friendly).
 * - If Upstash is misconfigured, callers should catch errors and allow login (see auth/options.ts).
 */
const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export const loginRatelimit = hasUpstash
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 ครั้ง/นาที
      analytics: true,
    })
  : {
      // Prisma/NextAuth call site expects .limit()
      limit: async () => ({ success: true }),
    };
