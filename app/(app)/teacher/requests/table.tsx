"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type Item = {
  id: string;
  type: string;
  status: string;
  date: string;
  slot: string;
  startAt: string;
  endAt: string;
  note: string | null;
  room: { code: string; name: string; roomNumber: string; floor: number };
  requester: { firstName: string; lastName: string; studentId?: string | null; email?: string | null };
  section?: { code: string; name: string } | null;
};

function statusBadge() {
  return <Badge variant="secondary">PENDING</Badge>;
}

export default function TeacherRequestsTable() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load({ initial }: { initial?: boolean } = {}) {
    if (!initial) {
      setLoading(true);
      setError(null);
    }
    const res = await fetch("/api/teacher/reservations/pending", { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || !json?.ok) {
      setError("โหลดข้อมูลไม่สำเร็จ");
      return;
    }
    setError(null);
    setItems(json.items as Item[]);
  }

  useEffect(() => {
    void load({ initial: true });
  }, []);

  async function decide(id: string, action: "APPROVE" | "REJECT") {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/teacher/reservations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok || !json?.ok) {
      setError("ทำรายการไม่สำเร็จ");
      return;
    }
    await load();
  }

  if (loading) return <div className="text-sm text-muted-foreground">กำลังโหลด...</div>;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ผู้ขอ</TableHead>
              <TableHead>ห้อง</TableHead>
              <TableHead>วันที่</TableHead>
              <TableHead>ช่วงเวลา</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>หมายเหตุ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">การทำงาน</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-sm text-muted-foreground">
                  ไม่มีคำขอที่รออนุมัติ
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">
                      {r.requester.firstName} {r.requester.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {r.requester.studentId ?? r.requester.email ?? "-"}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="font-medium">{r.room.code} • {r.room.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.room.roomNumber} ชั้น {r.room.floor}
                    </div>
                  </TableCell>

                  <TableCell>{new Date(r.startAt).toISOString().slice(0,10)}</TableCell>
                  <TableCell><span className="font-mono text-sm">{r.slot}</span></TableCell>
                  <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>

                  <TableCell>
                    {r.note ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="link" size="sm">ดู</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>หมายเหตุ</DialogTitle>
                          </DialogHeader>
                          <p className="text-sm whitespace-pre-wrap">{r.note}</p>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  <TableCell>{statusBadge()}</TableCell>

                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, "APPROVE")}
                      >
                        อนุมัติ
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, "REJECT")}
                      >
                        ปฏิเสธ
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
