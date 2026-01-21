import { signInCredentials } from "./signInCredentials";

export async function loginTeacher(args: {
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
