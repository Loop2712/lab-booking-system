"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ymd } from "@/lib/date/ymd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const TYPE_OPTIONS = ["ALL", "IN_CLASS", "AD_HOC"] as const;
const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "NO_SHOW",
  "CHECKED_IN",
  "COMPLETED",
] as const;
const PAGE_SIZES = [10, 20, 50, 100] as const;

function statusVariant(status: string) {
  if (status === "APPROVED" || status === "COMPLETED") return "default";
  if (status === "REJECTED" || status === "CANCELLED" || status === "NO_SHOW")
    return "destructive";
  if (status === "CHECKED_IN") return "secondary";
  return "outline";
}

function formatTypeLabel(value: string) {
  if (value === "IN_CLASS") return "ตารางเรียน";
  if (value === "AD_HOC") return "จอง";
  return value;
}

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatNameOnly(user?: {
  firstName?: string | null;
  lastName?: string | null;
} | null) {
  if (!user) return "-";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || "-";
}

function formatStudentId(user?: { studentId?: string | null } | null) {
  return user?.studentId ?? "-";
}

function formatCourseLine(item: ReservationItem) {
  const course = item.section?.course;
  if (!course) return "-";
  const code = course.code ?? "";
  const name = course.name ?? "";
  return [code, name].filter(Boolean).join(" ");
}

function formatDateLines(value?: string | null) {
  if (!value) return { time: "-", date: "-" };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { time: "-", date: "-" };
  return {
    time: timeFormatter.format(d),
    date: dateFormatter.format(d),
  };
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

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalCount / filters.pageSize));
  }, [totalCount, filters.pageSize]);

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
      <Card>
        <CardHeader>
          <CardTitle>Admin Reports</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <div className="text-sm">Date From</div>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm">Date To</div>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateTo: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <div className="text-sm">Type</div>
            <Select
              value={filters.type}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="text-sm">Status</div>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm">Room (Select)</div>
            <Select
              value={filters.roomId}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, roomId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All rooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {activeRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.roomNumber} / Floor {room.floor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="text-sm">Room Search</div>
            <Input
              value={filters.roomQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, roomQuery: e.target.value }))
              }
              placeholder="Room number or floor"
              disabled={filters.roomId !== "ALL"}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm">Key (Select)</div>
            <Select
              value={filters.keyId}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, keyId: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All keys" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {keys.map((key) => (
                  <SelectItem key={key.id} value={key.id}>
                    {key.keyCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="text-sm">Key Search</div>
            <Input
              value={filters.keyQuery}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, keyQuery: e.target.value }))
              }
              placeholder="Key code"
              disabled={filters.keyId !== "ALL"}
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm">Requester</div>
            <Input
              value={filters.requester}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, requester: e.target.value }))
              }
              placeholder="Student ID, email, or name"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 md:col-span-4">
            <Button onClick={() => applyFilters({ page: 1 })} disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </Button>
            <Button variant="outline" onClick={resetFilters} disabled={loading}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle>Total Reservations</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary?.totalReservations ?? "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary?.totalCompleted ?? "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cancelled</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary?.totalCancelled ?? "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>No Show</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary?.totalNoShow ?? "-"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Checked In</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {summary?.totalCheckedIn ?? "-"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown By Type</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          {(summary?.breakdownByType ?? []).map((item) => (
            <div
              key={item.type}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <span>{item.type}</span>
              <span className="font-medium">{item.count}</span>
            </div>
          ))}
          {(summary?.breakdownByType ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground">No data</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Reservations</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(filters.pageSize)}
              onValueChange={(value) =>
                applyFilters({ pageSize: Number(value), page: 1 })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportPdf} disabled={exporting}>
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ห้อง</TableHead>
                  <TableHead>กุญแจ</TableHead>
                  <TableHead>ผู้จอง</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>ผู้ยืมกุญแจ</TableHead>
                  <TableHead>เช็คอิน</TableHead>
                  <TableHead>ผู้คืนกุญแจ</TableHead>
                  <TableHead>เช็คเอาท์</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-sm text-muted-foreground"
                    >
                      No reservations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {item.room?.roomNumber ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.loan?.key?.keyCode ?? "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>{formatNameOnly(item.requester)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatCourseLine(item)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatTypeLabel(item.type)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(item.status) as any}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>
                            {formatNameOnly(item.loan?.borrower ?? undefined)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatStudentId(item.loan?.borrower ?? undefined)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const { time, date } = formatDateLines(
                            item.loan?.checkedInAt
                          );
                          return (
                            <div className="flex flex-col">
                              <span>{time}</span>
                              <span className="text-xs text-muted-foreground">
                                {date}
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex flex-col">
                          <span>
                            {formatNameOnly(item.loan?.returnedBy ?? undefined)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatStudentId(
                              item.loan?.returnedBy ?? undefined
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {(() => {
                          const { time, date } = formatDateLines(
                            item.loan?.checkedOutAt
                          );
                          return (
                            <div className="flex flex-col">
                              <span>{time}</span>
                              <span className="text-xs text-muted-foreground">
                                {date}
                              </span>
                            </div>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-muted-foreground">
              Total {totalCount} reservations
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => applyFilters({ page: 1 })}
                disabled={filters.page === 1 || loading}
              >
                First
              </Button>
              <Button
                variant="outline"
                onClick={() => applyFilters({ page: filters.page - 1 })}
                disabled={filters.page === 1 || loading}
              >
                Prev
              </Button>
              <div className="text-sm">
                Page {filters.page} of {totalPages}
              </div>
              <Button
                variant="outline"
                onClick={() => applyFilters({ page: filters.page + 1 })}
                disabled={filters.page >= totalPages || loading}
              >
                Next
              </Button>
              <Button
                variant="outline"
                onClick={() => applyFilters({ page: totalPages })}
                disabled={filters.page >= totalPages || loading}
              >
                Last
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


