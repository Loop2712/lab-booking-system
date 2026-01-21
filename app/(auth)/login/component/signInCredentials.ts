import { signIn } from "next-auth/react";

export type SignInResult = {
  ok?: boolean;
  error?: string | null;
  url?: string | null;
};

export async function signInCredentials(payload: Record<string, unknown>) {
  // เรา fix ให้ redirect: false เสมอ จะได้คุม redirect เอง
  const res = (await signIn("credentials", {
    redirect: false,
    ...payload,
  })) as SignInResult | undefined;

  return res;
}
