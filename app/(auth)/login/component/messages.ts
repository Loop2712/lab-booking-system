export function humanizeSignInError(code: string | undefined | null) {
  if (!code) return null;

  if (code === "RATE_LIMITED") {
    return "พยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่อีกครั้ง";
  }
  if (code === "CredentialsSignin") {
    return "อีเมล/รหัสนักศึกษา หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  }

  return "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่";
}
