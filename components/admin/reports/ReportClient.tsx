"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  FileDown,
  KeyRound,
  LogIn,
  RotateCcw,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ymd } from "@/lib/date/ymd";
import { cn } from "@/lib/utils";
import {
  formatReportDateLabel,
  formatReportDateRangeLabel,
  formatReportDateTimeLabel,
  formatReportDurationLabel,
  formatReportShortDateLabel,
  formatReportStatusLabel,
  formatReportTimeLabel,
  formatReportTimeRangeLabel,
  formatReportTypeLabel,
  REPORT_STATUS_OPTIONS,
  REPORT_TYPE_OPTIONS,
} from "@/lib/reports/presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type RoomOption = {
  id: string;
  roomNumber: string;
  floor: number;
  code: string;
  name: string;
  isActive?: boolean;
};

type KeyOption = {
  id: string;
  keyCode: string;
  room?: { roomNumber: string; floor: number } | null;
};

type SummaryResponse = {
  totalReservations: number;
  totalCompleted: number;
  totalCancelled: number;
  totalNoShow: number;
  totalCheckedIn: number;
  breakdownByType: { type: string; count: number }[];
};

type ReservationItem = {
  id: string;
  type: string;
  status: string;
  startAt: string;
  endAt: string;
  room: {
    roomNumber: string;
    floor: number;
    code?: string | null;
    name?: string | null;
  };
  section?: {
    course?: { code: string; name: string } | null;
  } | null;
  requester: {
    firstName: string;
    lastName: string;
    role: string;
    studentId: string | null;
    email: string | null;
  };
  loan: {
    checkedInAt: string | null;
    checkedOutAt: string | null;
    key: { keyCode: string };
    borrower: {
      firstName: string;
      lastName: string;
      role: string;
      studentId: string | null;
      email: string | null;
    } | null;
    returnedBy: {
      firstName: string;
      lastName: string;
      role: string;
      studentId: string | null;
      email: string | null;
    } | null;
    handledBy: {
      firstName: string;
      lastName: string;
      role: string;
      studentId: string | null;
      email: string | null;
    } | null;
  } | null;
};

type FilterState = {
  dateFrom: string;
  dateTo: string;
  type: string;
  status: string;
  roomId: string;
  roomQuery: string;
  keyId: string;
  keyQuery: string;
  requester: string;
  page: number;
  pageSize: number;
};

const PAGE_SIZES = [10, 20, 50, 100] as const;

function statusBadgeClass(status: string) {
  if (status === "COMPLETED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "APPROVED") {
    return "border-teal-200 bg-teal-50 text-teal-700";
  }
  if (status === "CHECKED_IN") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (status === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (status === "REJECTED" || status === "CANCELLED" || status === "NO_SHOW") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function formatNameOnly(user?: {
  firstName?: string | null;
  lastName?: string | null;
} | null) {
  if (!user) return "-";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || "-";
}

function formatIdentityLine(user?: {
  studentId?: string | null;
  email?: string | null;
  role?: string | null;
} | null) {
  if (!user) return "ไม่พบข้อมูลผู้ใช้";
  const parts = [user.studentId, user.email].filter(Boolean);
  if (parts.length > 0) return parts.join(" • ");
  return user.role ? `บทบาท ${user.role}` : "ไม่พบรหัสนักศึกษา/อีเมล";
}

function formatRoomTitle(room?: {
  roomNumber?: string | null;
  name?: string | null;
} | null) {
  const number = room?.roomNumber ? `ห้อง ${room.roomNumber}` : "ไม่พบห้อง";
  return room?.name ? `${number} • ${room.name}` : number;
}

function formatRoomMeta(room?: {
  floor?: number | null;
  code?: string | null;
} | null) {
  const parts = [
    room?.code ? `รหัส ${room.code}` : null,
    room?.floor !== null && room?.floor !== undefined ? `ชั้น ${room.floor}` : null,
  ].filter(Boolean);
  return parts.join(" • ") || "ไม่พบรายละเอียดห้อง";
}

function formatCourseLine(item: ReservationItem) {
  const course = item.section?.course;
  if (!course) return "ไม่มีวิชาที่เชื่อมโยง";
  const code = course.code ?? "";
  const name = course.name ?? "";
  return [code, name].filter(Boolean).join(" • ") || "ไม่มีวิชาที่เชื่อมโยง";
}

function formatEventLine(value?: string | null, emptyLabel = "-") {
  if (!value) return emptyLabel;
  return `${formatReportShortDateLabel(value)} • ${formatReportTimeLabel(value)}`;
}

function buildDefaultFilters(): FilterState {
  const today = ymd(new Date());
  return {
    dateFrom: today,
    dateTo: today,
    type: "ALL",
    status: "ALL",
    roomId: "ALL",
    roomQuery: "",
    keyId: "ALL",
    keyQuery: "",
    requester: "",
    page: 1,
    pageSize: 20,
  };
}

export default function ReportClient() {
  const [filters, setFilters] = useState<FilterState>(() =>
    buildDefaultFilters()
  );
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [keys, setKeys] = useState<KeyOption[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const activeRooms = useMemo(
    () => rooms.filter((room) => room.isActive !== false),
    [rooms]
  );

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === filters.roomId),
    [filters.roomId, rooms]
  );

  const selectedKey = useMemo(
    () => keys.find((key) => key.id === filters.keyId),
    [filters.keyId, keys]
  );

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / filters.pageSize));
  }, [filters.pageSize, totalCount]);

  const reportRangeLabel = useMemo(
    () => formatReportDateRangeLabel(filters.dateFrom, filters.dateTo),
    [filters.dateFrom, filters.dateTo]
  );

  const activeFilterChips = useMemo(() => {
    const chips = [
      {
        label: "ช่วงวันที่",
        value: reportRangeLabel,
      },
    ];

    if (filters.type !== "ALL") {
      chips.push({
        label: "ประเภท",
        value: formatReportTypeLabel(filters.type),
      });
    }

    if (filters.status !== "ALL") {
      chips.push({
        label: "สถานะ",
        value: formatReportStatusLabel(filters.status),
      });
    }

    if (filters.roomId !== "ALL") {
      chips.push({
        label: "ห้อง",
        value: selectedRoom
          ? `${selectedRoom.roomNumber} • ชั้น ${selectedRoom.floor}`
          : filters.roomId,
      });
    } else if (filters.roomQuery.trim()) {
      chips.push({
        label: "ค้นหาห้อง",
        value: filters.roomQuery.trim(),
      });
    }

    if (filters.keyId !== "ALL") {
      chips.push({
        label: "กุญแจ",
        value: selectedKey?.keyCode ?? filters.keyId,
      });
    } else if (filters.keyQuery.trim()) {
      chips.push({
        label: "ค้นหากุญแจ",
        value: filters.keyQuery.trim(),
      });
    }

    if (filters.requester.trim()) {
      chips.push({
        label: "ผู้จอง",
        value: filters.requester.trim(),
      });
    }

    return chips;
  }, [
    filters.keyId,
    filters.keyQuery,
    filters.requester,
    filters.roomId,
    filters.roomQuery,
    filters.status,
    filters.type,
    reportRangeLabel,
    selectedKey,
    selectedRoom,
  ]);

  const exportCount = summary
    ? Math.min(summary.totalReservations, 200)
    : Math.min(totalCount, 200);

  const summaryCards = [
    {
      title: "รายการทั้งหมด",
      value: summary?.totalReservations ?? "-",
      note: "ตามตัวกรองปัจจุบัน",
      icon: ClipboardList,
      accent: "bg-slate-100 text-slate-700",
    },
    {
      title: "เสร็จสิ้น",
      value: summary?.totalCompleted ?? "-",
      note: "ใช้งานสำเร็จแล้ว",
      icon: CheckCircle2,
      accent: "bg-emerald-100 text-emerald-700",
    },
    {
      title: "เช็คอินแล้ว",
      value: summary?.totalCheckedIn ?? "-",
      note: "กำลังใช้งานห้อง",
      icon: LogIn,
      accent: "bg-sky-100 text-sky-700",
    },
    {
      title: "ยกเลิก",
      value: summary?.totalCancelled ?? "-",
      note: "รายการที่ถูกยกเลิก",
      icon: XCircle,
      accent: "bg-rose-100 text-rose-700",
    },
    {
      title: "No Show",
      value: summary?.totalNoShow ?? "-",
      note: "จองแต่ไม่มาใช้งาน",
      icon: AlertTriangle,
      accent: "bg-amber-100 text-amber-700",
    },
  ] as const;

  const pageStart = totalCount === 0 ? 0 : (filters.page - 1) * filters.pageSize + 1;
  const pageEnd = Math.min(filters.page * filters.pageSize, totalCount);

  useEffect(() => {
    void loadRooms();
    void loadKeys();
    void applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRooms() {
    const res = await fetch("/api/admin/rooms", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) return;
    setRooms(json.rooms ?? []);
  }

  async function loadKeys() {
    const res = await fetch("/api/admin/keys", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) return;
    setKeys(json.keys ?? []);
  }

  function buildQueryParams(state: FilterState, includePagination: boolean) {
    const params = new URLSearchParams();
    params.set("dateFrom", state.dateFrom);
    params.set("dateTo", state.dateTo);

    if (state.type !== "ALL") params.set("type", state.type);
    if (state.status !== "ALL") params.set("status", state.status);

    if (state.roomId !== "ALL") {
      params.set("roomId", state.roomId);
    } else if (state.roomQuery.trim()) {
      params.set("room", state.roomQuery.trim());
    }

    if (state.keyId !== "ALL") {
      params.set("keyId", state.keyId);
    } else if (state.keyQuery.trim()) {
      params.set("key", state.keyQuery.trim());
    }

    if (state.requester.trim()) {
      params.set("requester", state.requester.trim());
    }

    if (includePagination) {
      params.set("page", String(state.page));
      params.set("pageSize", String(state.pageSize));
    }

    return params;
  }

  function buildExportPayload(state: FilterState) {
    const payload: Record<string, string | number> = {
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
    };

    if (state.type !== "ALL") payload.type = state.type;
    if (state.status !== "ALL") payload.status = state.status;

    if (state.roomId !== "ALL") {
      payload.roomId = state.roomId;
    } else if (state.roomQuery.trim()) {
      payload.room = state.roomQuery.trim();
    }

    if (state.keyId !== "ALL") {
      payload.keyId = state.keyId;
    } else if (state.keyQuery.trim()) {
      payload.key = state.keyQuery.trim();
    }

    if (state.requester.trim()) {
      payload.requester = state.requester.trim();
    }

    return payload;
  }

  async function fetchSummary(state: FilterState) {
    const qs = buildQueryParams(state, false);
    const res = await fetch(`/api/admin/reports/summary?${qs.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setSummary(null);
      toast.error("Failed to load summary.");
      return;
    }
    setSummary(json as SummaryResponse);
  }

  async function fetchReservations(state: FilterState) {
    const qs = buildQueryParams(state, true);
    const res = await fetch(`/api/admin/reports/reservations?${qs.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      setItems([]);
      setTotalCount(0);
      toast.error("Failed to load reservations.");
      return;
    }
    setItems(json.items ?? []);
    setTotalCount(json.totalCount ?? 0);
  }

  async function applyFilters(next?: Partial<FilterState>) {
    const current = { ...filters, ...next };
    setFilters(current);

    if (!current.dateFrom || !current.dateTo) {
      toast.error("Date range is required.");
      return;
    }
    if (new Date(current.dateFrom) > new Date(current.dateTo)) {
      toast.error("Invalid date range.");
      return;
    }

    setLoading(true);
    try {
      await Promise.all([fetchSummary(current), fetchReservations(current)]);
    } finally {
      setLoading(false);
    }
  }

  async function resetFilters() {
    const defaults = buildDefaultFilters();
    await applyFilters(defaults);
  }

  async function exportPdf() {
    setExporting(true);
    try {
      const payload = buildExportPayload(filters);
      const res = await fetch("/api/admin/reports/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let detail = "";
        try {
          const json = JSON.parse(text);
          detail = json?.detail || json?.message || "";
        } catch {
          detail = text;
        }
        toast.error(detail ? `Export failed: ${detail}` : "Failed to export PDF.");
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `admin-report-${filters.dateFrom}-to-${filters.dateTo}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-[var(--brand-line-green)] bg-gradient-to-br from-[var(--brand-light-green)] via-white to-[var(--brand-bg)] shadow-sm">
        <CardContent className="grid gap-6 px-6 py-6 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="space-y-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--brand-line-green)] bg-white/80 px-3 py-1 text-xs font-medium text-[var(--brand-gray-dark)]">
              <FileDown className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
              Admin PDF Report
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--brand-gray-dark)]">
                รายงานการจองและการส่งออก PDF
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                ดูภาพรวมการจองห้อง การยืมกุญแจ และพฤติกรรมการใช้งานในช่วงเวลาที่เลือก
                พร้อมสร้าง PDF ที่จัดวางให้อ่านง่ายสำหรับส่งต่อหรือเก็บเป็นรายงาน
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-sm">
                <CalendarRange className="h-4 w-4 text-[var(--brand-primary)]" />
                <div>
                  <div className="text-xs text-muted-foreground">ช่วงรายงาน</div>
                  <div className="font-medium">{reportRangeLabel}</div>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-sm">
                <ClipboardList className="h-4 w-4 text-[var(--brand-primary)]" />
                <div>
                  <div className="text-xs text-muted-foreground">ผลลัพธ์ที่พบ</div>
                  <div className="font-medium">
                    {summary?.totalReservations ?? totalCount} รายการ
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/85 px-4 py-3 text-sm shadow-sm">
                <DoorOpen className="h-4 w-4 text-[var(--brand-primary)]" />
                <div>
                  <div className="text-xs text-muted-foreground">ห้องที่พร้อมเลือก</div>
                  <div className="font-medium">{activeRooms.length} ห้อง</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--brand-gray-dark)]">
                พร้อมส่งออกตามตัวกรองนี้
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                PDF จะสรุปช่วงวันที่ เงื่อนไขที่เลือก ภาพรวมตัวเลขสำคัญ และรายการจองในรูปแบบที่อ่านต่อได้ง่าย
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[var(--brand-light-gray)] px-4 py-3">
                <div className="text-xs text-muted-foreground">รายการใน PDF</div>
                <div className="mt-1 text-xl font-semibold">{exportCount}</div>
              </div>
              <div className="rounded-2xl bg-[var(--brand-light-gray)] px-4 py-3">
                <div className="text-xs text-muted-foreground">ตัวกรองที่ใช้งาน</div>
                <div className="mt-1 text-xl font-semibold">
                  {activeFilterChips.length}
                </div>
              </div>
            </div>

            {summary && summary.totalReservations > 200 ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                PDF ปัจจุบันส่งออกสูงสุด 200 รายการล่าสุดตามตัวกรองนี้
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={exportPdf}
                disabled={exporting || loading}
                className="rounded-xl"
              >
                <FileDown className="mr-2 h-4 w-4" />
                {exporting ? "กำลังสร้าง PDF..." : "Export PDF"}
              </Button>
              <Button
                variant="outline"
                onClick={() => applyFilters({ page: 1 })}
                disabled={loading}
                className="rounded-xl"
              >
                <Search className="mr-2 h-4 w-4" />
                {loading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed border-[var(--brand-line-green)] bg-[var(--brand-light-gray)]/40">
        <CardHeader>
          <CardTitle>ตัวกรองรายงาน</CardTitle>
          <CardDescription>
            ปรับช่วงเวลา ประเภท ห้อง กุญแจ หรือข้อมูลผู้จองก่อนค้นหาและส่งออก PDF
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <div className="text-sm font-medium">Date From</div>
              <Input
                className="h-11 bg-white"
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Date To</div>
              <Input
                className="h-11 bg-white"
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Type</div>
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatReportTypeLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Status</div>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="เลือกสถานะ" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatReportStatusLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Room (Select)</div>
              <Select
                value={filters.roomId}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, roomId: value }))
                }
              >
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="เลือกห้อง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทุกห้อง</SelectItem>
                  {activeRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.roomNumber} • ชั้น {room.floor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Room Search</div>
              <Input
                className="h-11 bg-white"
                value={filters.roomQuery}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, roomQuery: e.target.value }))
                }
                placeholder="เลขห้อง หรือชั้น"
                disabled={filters.roomId !== "ALL"}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Key (Select)</div>
              <Select
                value={filters.keyId}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, keyId: value }))
                }
              >
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="เลือกกุญแจ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ทุกกุญแจ</SelectItem>
                  {keys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      {key.keyCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Key Search</div>
              <Input
                className="h-11 bg-white"
                value={filters.keyQuery}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, keyQuery: e.target.value }))
                }
                placeholder="รหัสกุญแจ"
                disabled={filters.keyId !== "ALL"}
              />
            </div>
            <div className="space-y-2 xl:col-span-1">
              <div className="text-sm font-medium">Requester</div>
              <Input
                className="h-11 bg-white"
                value={filters.requester}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, requester: e.target.value }))
                }
                placeholder="รหัสนักศึกษา อีเมล หรือชื่อ"
              />
            </div>
          </div>

          <div className="rounded-[1.5rem] border bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="text-sm font-medium">ตัวกรองที่กำลังใช้งาน</div>
                <div className="flex flex-wrap gap-2">
                  {activeFilterChips.map((chip) => (
                    <div
                      key={`${chip.label}-${chip.value}`}
                      className="rounded-full border border-[var(--brand-line-green)] bg-[var(--brand-light-green)] px-3 py-1.5 text-xs text-[var(--brand-gray-dark)]"
                    >
                      <span className="font-medium">{chip.label}:</span>{" "}
                      {chip.value}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => applyFilters({ page: 1 })}
                  disabled={loading}
                  className="rounded-xl"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? "กำลังค้นหา..." : "ค้นหารายงาน"}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetFilters}
                  disabled={loading}
                  className="rounded-xl"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  รีเซ็ตตัวกรอง
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((entry) => (
          <Card key={entry.title} className="border-[var(--brand-light-gray-line)]">
            <CardContent className="flex items-start justify-between px-6 py-5">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">{entry.title}</div>
                <div className="text-3xl font-semibold tracking-tight">
                  {entry.value}
                </div>
                <div className="text-xs text-muted-foreground">{entry.note}</div>
              </div>
              <div className={cn("rounded-2xl p-3 shadow-sm", entry.accent)}>
                <entry.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>สัดส่วนประเภทการจอง</CardTitle>
            <CardDescription>
              เปรียบเทียบจำนวนรายการระหว่างตารางเรียนและการจองทั่วไป
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(summary?.breakdownByType ?? []).length === 0 ? (
              <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                ยังไม่มีข้อมูลสรุปในช่วงเวลานี้
              </div>
            ) : (
              (summary?.breakdownByType ?? []).map((item) => {
                const total = summary?.totalReservations ?? 0;
                const percent =
                  total > 0 ? Math.round((item.count / total) * 100) : 0;

                return (
                  <div
                    key={item.type}
                    className="rounded-2xl border border-[var(--brand-light-gray-line)] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">
                          {formatReportTypeLabel(item.type)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.count} รายการ
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-[var(--brand-gray-dark)]">
                        {percent}%
                      </div>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[var(--brand-light-gray)]">
                      <div
                        className="h-2 rounded-full bg-[var(--brand-primary)]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ภาพรวมการส่งออก</CardTitle>
            <CardDescription>
              ตรวจสอบรายละเอียดสำคัญก่อนดาวน์โหลดรายงาน PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-2xl bg-[var(--brand-light-gray)] px-4 py-3">
              <div className="flex items-center gap-2 font-medium text-[var(--brand-gray-dark)]">
                <CalendarRange className="h-4 w-4 text-[var(--brand-primary)]" />
                ช่วงวันที่ในรายงาน
              </div>
              <div className="mt-2 text-muted-foreground">{reportRangeLabel}</div>
            </div>
            <div className="rounded-2xl bg-[var(--brand-light-gray)] px-4 py-3">
              <div className="flex items-center gap-2 font-medium text-[var(--brand-gray-dark)]">
                <UserRound className="h-4 w-4 text-[var(--brand-primary)]" />
                รายการที่แสดงในตาราง
              </div>
              <div className="mt-2 text-muted-foreground">
                แสดง {pageStart}-{pageEnd} จากทั้งหมด {totalCount} รายการ
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--brand-light-gray)] px-4 py-3">
              <div className="flex items-center gap-2 font-medium text-[var(--brand-gray-dark)]">
                <KeyRound className="h-4 w-4 text-[var(--brand-primary)]" />
                ขนาดหน้ารายการ
              </div>
              <div className="mt-2 text-muted-foreground">
                ปัจจุบันแสดง {filters.pageSize} รายการต่อหน้า
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <CardTitle>รายการการจอง</CardTitle>
            <CardDescription>
              แสดงรายละเอียดห้อง ช่วงเวลา ผู้จอง สถานะ และข้อมูลการยืมคืนกุญแจในมุมมองที่อ่านง่ายขึ้น
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">รายการต่อหน้า</div>
            <Select
              value={String(filters.pageSize)}
              onValueChange={(value) =>
                applyFilters({ pageSize: Number(value), page: 1 })
              }
            >
              <SelectTrigger className="h-11 w-32">
                <SelectValue placeholder="เลือกจำนวน" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / หน้า
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[1.5rem] border border-[var(--brand-light-gray-line)]">
            <Table className="min-w-[1040px]">
              <TableHeader className="bg-[var(--brand-light-gray)]/70">
                <TableRow className="hover:bg-[var(--brand-light-gray)]/70">
                  <TableHead className="w-[220px]">ห้อง</TableHead>
                  <TableHead className="w-[250px]">รายละเอียดการจอง</TableHead>
                  <TableHead className="w-[220px]">ผู้จอง</TableHead>
                  <TableHead className="w-[170px]">สถานะ</TableHead>
                  <TableHead className="w-[220px]">รับกุญแจ</TableHead>
                  <TableHead className="w-[220px]">คืนกุญแจ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="whitespace-normal px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      ไม่พบรายการจองตามเงื่อนไขที่เลือก
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} className="align-top">
                      <TableCell className="whitespace-normal align-top">
                        <div className="space-y-1">
                          <div className="font-semibold text-[var(--brand-gray-dark)]">
                            {formatRoomTitle(item.room)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatRoomMeta(item.room)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-normal align-top">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-700"
                            >
                              {formatReportTypeLabel(item.type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatReportDurationLabel(item.startAt, item.endAt)}
                            </span>
                          </div>
                          <div className="font-medium text-[var(--brand-gray-dark)]">
                            {formatReportDateLabel(item.startAt)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatReportTimeRangeLabel(item.startAt, item.endAt)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatCourseLine(item)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-normal align-top">
                        <div className="space-y-1">
                          <div className="font-medium text-[var(--brand-gray-dark)]">
                            {formatNameOnly(item.requester)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatIdentityLine(item.requester)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-normal align-top">
                        <div className="space-y-2">
                          <Badge
                            variant="outline"
                            className={cn("rounded-full", statusBadgeClass(item.status))}
                          >
                            {formatReportStatusLabel(item.status)}
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            สร้างรายการสำหรับ{" "}
                            {formatReportDateTimeLabel(item.startAt)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-normal align-top">
                        <div className="space-y-1">
                          <div className="font-medium text-[var(--brand-gray-dark)]">
                            {item.loan?.key?.keyCode
                              ? `กุญแจ ${item.loan.key.keyCode}`
                              : "ยังไม่มีข้อมูลกุญแจ"}
                          </div>
                          <div className="text-sm">
                            {formatNameOnly(item.loan?.borrower ?? undefined)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatIdentityLine(item.loan?.borrower ?? undefined)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            เช็คอิน:{" "}
                            {formatEventLine(
                              item.loan?.checkedInAt,
                              "ยังไม่มีการเช็คอิน"
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-normal align-top">
                        <div className="space-y-1">
                          <div className="font-medium text-[var(--brand-gray-dark)]">
                            {formatNameOnly(item.loan?.returnedBy ?? undefined)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatIdentityLine(item.loan?.returnedBy ?? undefined)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            เช็คเอาท์:{" "}
                            {formatEventLine(
                              item.loan?.checkedOutAt,
                              "ยังไม่มีการคืนกุญแจ"
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              แสดง {pageStart}-{pageEnd} จากทั้งหมด {totalCount} รายการ
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => applyFilters({ page: filters.page - 1 })}
                disabled={filters.page === 1 || loading}
                className="rounded-xl"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                ก่อนหน้า
              </Button>
              <div className="rounded-full bg-[var(--brand-light-gray)] px-4 py-2 text-sm">
                หน้า {filters.page} / {totalPages}
              </div>
              <Button
                variant="outline"
                onClick={() => applyFilters({ page: filters.page + 1 })}
                disabled={filters.page >= totalPages || loading}
                className="rounded-xl"
              >
                ถัดไป
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
