import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * In development (or when Upstash env is not configured), we should not break login.
 * If UPSTASH vars are missing, we provide a no-op limiter that always succeeds.
 */
const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

export const loginRatelimit = hasUpstash
  ? new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 ครั้ง/นาที
      analytics: true,
    })
  : {
      limit: async () => ({ success: true }),
    };
