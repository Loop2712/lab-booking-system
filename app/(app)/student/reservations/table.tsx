"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

type Item = {
  id: string;
  type: string;
  status: string;
  date: string;
  slot: string;
  startAt: string;
  endAt: string;
  note: string | null;
  createdAt: string;
  room: { code: string; name: string; roomNumber: string; floor: number };
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function statusVariant(status: string) {
  if (status === "PENDING") return "secondary";
  if (status === "APPROVED") return "default";
  if (status === "REJECTED") return "destructive";
  if (status === "CANCELLED") return "outline";
  return "secondary";
}

const STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

type SortOrder = "ASC" | "DESC";

export default function MyReservationsTable() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ NEW: filter + sort controls
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");

  async function load() {
    setError(null);
    setLoading(true);

    const res = await fetch("/api/reservations/my", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !json?.ok) {
      setError("โหลดรายการไม่สำเร็จ กรุณาลองใหม่");
      return;
    }

    setItems(json.items as Item[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function cancel(id: string) {
    setBusyId(id);
    setError(null);

    const res = await fetch(`/api/reservations/${id}/cancel`, { method: "POST" });
    const json = await res.json().catch(() => ({}));

    setBusyId(null);

    if (!res.ok || !json?.ok) {
      const msg =
        json?.message === "CANNOT_CANCEL_NON_PENDING"
          ? "ยกเลิกได้เฉพาะรายการที่ยังเป็น PENDING"
          : "ยกเลิกไม่สำเร็จ กรุณาลองใหม่";
      setError(msg);
      return;
    }

    await load();
  }

  // ✅ NEW: filter + sort by startAt
  const rows = useMemo(() => {
    const filtered =
      statusFilter === "ALL"
        ? items
        : items.filter((r) => r.status === statusFilter);

    const sorted = [...filtered].sort((a, b) => {
      const ta = new Date(a.startAt).getTime();
      const tb = new Date(b.startAt).getTime();
      return sortOrder === "ASC" ? ta - tb : tb - ta;
    });

    return sorted;
  }, [items, statusFilter, sortOrder]);

  if (loading) return <div className="text-sm text-muted-foreground">กำลังโหลด...</div>;

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ✅ NEW: controls */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "ALL" ? "ALL (ทั้งหมด)" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-44">
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DESC">วันใช้งานใหม่ → เก่า</SelectItem>
                  <SelectItem value="ASC">วันใช้งานเก่า → ใหม่</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button variant="outline" onClick={load}>
            รีเฟรช
          </Button>
        </div>

        <div className="rounded-2xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ห้อง</TableHead>
                <TableHead>วันที่ใช้งาน</TableHead>
                <TableHead>ช่วงเวลา</TableHead>

                {/* ✅ NEW: note column */}
                <TableHead>หมายเหตุ</TableHead>

                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">การทำงาน</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    ยังไม่มีรายการจอง (หรือตัวกรองไม่พบข้อมูล)
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">
                        {r.room.code} • {r.room.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.room.roomNumber} ชั้น {r.room.floor}
                      </div>
                    </TableCell>

                    {/* ✅ sort uses startAt; display uses date */}
                    <TableCell>{formatDate(r.startAt)}</TableCell>

                    <TableCell>
                      <span className="font-mono text-sm">{r.slot}</span>
                    </TableCell>

                    {/* ✅ tooltip note */}
                    <TableCell>
                      {r.note ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
                            >
                              <Info className="h-4 w-4" />
                              ดู
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">{r.note}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={statusVariant(r.status) as any}>{r.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.type === "AD_HOC" &&
                        !["CHECKED_IN", "COMPLETED", "CANCELLED", "REJECTED", "NO_SHOW"].includes(r.status) && (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/student/reservations/${r.id}/participants`}>ผู้ร่วม</Link>
                          </Button>
                        )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={r.status !== "PENDING" || busyId === r.id}
                        onClick={() => cancel(r.id)}
                      >
                        {busyId === r.id ? "กำลังยกเลิก..." : "ยกเลิก"}
                      </Button>
                    </TableCell>


                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
