type LoanMode = "CHECKIN" | "RETURN";

const LOOKUP_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "ต้องเข้าสู่ระบบก่อนใช้งาน",
  FORBIDDEN: "ไม่มีสิทธิ์ใช้งานหน้านี้",
  BAD_BODY: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
  ERROR: "ระบบไม่สามารถประมวลผลคำขอได้",
  NO_MATCHING_RESERVATION: "ไม่พบรายการยืมหรือคืนกุญแจที่ตรงกับผู้ใช้นี้",
  NO_MATCHING_CHECKEDIN_RESERVATION: "ไม่พบรายการที่กำลังยืมกุญแจอยู่",
  NO_MATCHING_APPROVED_RESERVATION: "ไม่พบรายการที่อนุมัติแล้วสำหรับการรับกุญแจ",
  NO_MATCHING_APPROVED_RESERVATION_TODAY: "ไม่พบรายการที่อนุมัติแล้วของวันนี้",
  NO_MATCHING_CHECKEDIN_RESERVATION_TODAY: "ไม่พบรายการที่กำลังยืมของวันนี้",
  BAD_QR_TOKEN: "QR หรือ Token ของผู้ใช้ไม่ถูกต้อง",
  USER_NOT_FOUND: "ไม่พบข้อมูลผู้ใช้",
  NOT_FOUND: "ไม่พบรายการที่ระบุ",
  RESERVATION_NOT_FOUND: "ไม่พบรายการจองที่ระบุ",
  ROOM_NOT_FOUND: "ไม่พบข้อมูลห้องที่เลือก",
  ROLE_NOT_ALLOWED: "รองรับเฉพาะนักศึกษาและอาจารย์",
  KIOSK_DEVICE_INVALID: "อุปกรณ์นี้ยังไม่ได้จับคู่หรือถูกยกเลิกแล้ว",
};

const ACTION_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "ต้องเข้าสู่ระบบก่อนทำรายการ",
  FORBIDDEN: "ไม่มีสิทธิ์ทำรายการนี้",
  BAD_BODY: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
  ERROR: "ระบบไม่สามารถบันทึกรายการได้",
  BAD_QR_TOKEN: "QR หรือ Token ของผู้ใช้ไม่ถูกต้อง",
  USER_NOT_FOUND: "ไม่พบข้อมูลผู้ใช้",
  NOT_FOUND: "ไม่พบรายการที่ระบุ",
  RESERVATION_NOT_FOUND: "ไม่พบรายการจองที่ระบุ",
  ROLE_NOT_ALLOWED: "รองรับเฉพาะนักศึกษาและอาจารย์",
  NOT_APPROVED: "รายการนี้ยังไม่พร้อมสำหรับการรับกุญแจ",
  INVALID_STATUS: "สถานะรายการปัจจุบันไม่ตรงกับการทำรายการนี้",
  ALREADY_CHECKED_IN: "รายการนี้รับกุญแจไปแล้ว",
  ALREADY_HAS_LOAN: "รายการนี้รับกุญแจไปแล้ว",
  MISSING_SECTION: "ไม่พบข้อมูลคลาสที่เชื่อมกับรายการนี้",
  NOT_ALLOWED: "ผู้ใช้รายนี้ไม่มีสิทธิ์ทำรายการตามรายการจองนี้",
  NOT_OWNER: "ผู้ใช้รายนี้ไม่มีสิทธิ์ทำรายการตามรายการจองนี้",
  NO_AVAILABLE_KEY: "ไม่มีกุญแจว่างสำหรับห้องนี้",
  LATE_CHECKIN_NO_SHOW: "เลยเวลาเช็กอินเกิน 30 นาที ระบบเปลี่ยนเป็นไม่มาใช้งานแล้ว",
  NOT_CHECKED_IN: "รายการนี้ยังไม่ได้ยืมกุญแจ",
  NO_LOAN: "ไม่พบข้อมูลการยืมของรายการนี้",
  KIOSK_DEVICE_INVALID: "อุปกรณ์นี้ยังไม่ได้จับคู่หรือถูกยกเลิกแล้ว",
};

const KIOSK_PAIR_MESSAGES: Record<string, string> = {
  BAD_BODY: "ข้อมูลสำหรับจับคู่ไม่ถูกต้อง",
  UNAUTHORIZED: "ต้องเข้าสู่ระบบแอดมินก่อนจึงจะจับคู่ได้",
  ALREADY_PAIRED: "อุปกรณ์นี้จับคู่ไว้แล้ว",
  PAIR_CODE_INVALID: "รหัส Pair ไม่ถูกต้อง",
  TOKEN_REVOKED: "Token นี้ถูกยกเลิกแล้ว",
  TOKEN_ALREADY_ACTIVE: "Token นี้ถูกใช้งานอยู่แล้ว",
  PAIR_FAILED: "จับคู่อุปกรณ์ไม่สำเร็จ",
};

const QR_REASON_MESSAGES: Record<string, string> = {
  EXPIRED: "QR หมดอายุแล้ว กรุณาเปิด QR ใหม่หรือกดรีเฟรชก่อนทำรายการ",
  BAD_FORMAT: "รูปแบบ QR ไม่ถูกต้อง กรุณาใช้ QR ล่าสุดจากหน้าของผู้ใช้",
  BAD_SIGNATURE: "QR นี้ไม่ตรงกับข้อมูลที่ระบบออกให้ กรุณาสร้าง QR ใหม่",
  BAD_PAYLOAD: "ข้อมูลใน QR ไม่สมบูรณ์ กรุณาลองใหม่อีกครั้ง",
  CONFIG_ERROR: "ระบบ QR ยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
};

export function getQrTokenReasonMessage(reason?: string | null) {
  if (!reason) return "QR หรือ Token ของผู้ใช้ไม่ถูกต้อง";
  return QR_REASON_MESSAGES[reason] ?? `QR ไม่ถูกต้อง (${reason})`;
}

export function getLoanLookupMessage(code?: string | null, reason?: string | null) {
  if (!code) return "ค้นหารายการไม่สำเร็จ";
  if (code === "BAD_QR_TOKEN") return getQrTokenReasonMessage(reason);
  return LOOKUP_MESSAGES[code] ?? code;
}

export function getLoanActionMessage(
  code?: string | null,
  mode: LoanMode = "CHECKIN",
  reason?: string | null
) {
  if (!code) {
    return mode === "CHECKIN" ? "ทำรายการรับกุญแจไม่สำเร็จ" : "ทำรายการคืนกุญแจไม่สำเร็จ";
  }

  if (code === "BAD_QR_TOKEN") return getQrTokenReasonMessage(reason);
  return ACTION_MESSAGES[code] ?? code;
}

export function getKioskPairMessage(code?: string | null, detail?: string | null) {
  if (!code) return "จับคู่อุปกรณ์ไม่สำเร็จ";
  if (code === "PAIR_FAILED" && detail) return `${KIOSK_PAIR_MESSAGES[code]}: ${detail}`;
  return KIOSK_PAIR_MESSAGES[code] ?? code;
}

export function getLoanModeLabel(mode?: LoanMode | null) {
  if (mode === "CHECKIN") return "ยืมกุญแจ";
  if (mode === "RETURN") return "คืนกุญแจ";
  return "-";
}

export function getReservationTypeLabel(type?: string | null) {
  if (type === "IN_CLASS") return "ตารางเรียน";
  if (type === "AD_HOC") return "จองทั่วไป";
  return type ?? "-";
}

export function getReservationStatusLabelText(status?: string | null) {
  switch (status) {
    case "PENDING":
      return "รออนุมัติ";
    case "APPROVED":
      return "อนุมัติแล้ว";
    case "REJECTED":
      return "ไม่อนุมัติ";
    case "CANCELLED":
      return "ยกเลิกแล้ว";
    case "NO_SHOW":
      return "ไม่มาใช้งาน";
    case "CHECKED_IN":
      return "รับกุญแจแล้ว";
    case "COMPLETED":
      return "คืนกุญแจแล้ว";
    default:
      return status ?? "-";
  }
}
