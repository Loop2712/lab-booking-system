import { signInCredentials } from "./signInCredentials";

export async function loginAdmin(args: {
  callbackUrl: string;
  email: string;
  password: string;
}) {
  const { callbackUrl, email, password } = args;

  return signInCredentials({
    callbackUrl,
    email: email.trim().toLowerCase(),
    password: password,
  });
}
