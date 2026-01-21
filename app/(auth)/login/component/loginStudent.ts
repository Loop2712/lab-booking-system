import { signInCredentials } from "./signInCredentials";

export async function loginStudent(args: {
  callbackUrl: string;
  studentId: string;
  password: string;
}) {
  const { callbackUrl, studentId, password } = args;

  // ส่ง studentId + password (ไม่ต้องส่ง role)
  return signInCredentials({
    callbackUrl,
    studentId: studentId.trim(),
    password: password.trim(),
  });
}
