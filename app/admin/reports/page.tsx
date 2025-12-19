"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function plusDaysStr(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
}

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(false);

  const [from, setFrom] = useState(ymd(new Date()));
  const [to, setTo] = useState(plusDaysStr(30));

  const [rooms, setRooms] = useState<any[]>([]);
  const [roomId, setRoomId] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [data, setData] = useState<any>(null);

  async function loadRooms() {
    const r = await fetch("/api/admin/rooms");
    const j = await r.json();
    setRooms(j.rooms ?? []);
  }

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        from,
        to,
        roomId,
        type,
        status,
      });

      const r = await fetch(`/api/admin/reports/summary?${qs.toString()}`);
      const text = await r.text();
      const j = text ? JSON.parse(text) : null;

      if (!r.ok) {
        console.log("report failed:", r.status, j);
        alert(j?.message ?? `HTTP ${r.status}`);
        return;
      }

      setData(j);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reports</CardTitle>
          <Button variant="secondary" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-2">
            <div className="text-sm">From</div>
            <Input value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="text-sm">To</div>
            <Input value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="text-sm">Room</div>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.code} — {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm">Type</div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="AD_HOC">AD_HOC</SelectItem>
                <SelectItem value="IN_CLASS">IN_CLASS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-sm">Status</div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PENDING">PENDING</SelectItem>
                <SelectItem value="APPROVED">APPROVED</SelectItem>
                <SelectItem value="REJECTED">REJECTED</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                <SelectItem value="CHECKED_IN">CHECKED_IN</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                <SelectItem value="NO_SHOW">NO_SHOW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-5">
            <Button onClick={load} disabled={loading}>
              Apply filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Total</CardTitle></CardHeader>
          <CardContent className="text-3xl font-semibold">
            {data?.total ?? "-"}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Type</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.byType ?? []).map((x: any) => (
              <div key={x.type} className="flex justify-between border rounded-md p-2">
                <div>{x.type}</div>
                <div className="font-medium">{x.count}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.byStatus ?? []).map((x: any) => (
              <div key={x.status} className="flex justify-between border rounded-md p-2">
                <div>{x.status}</div>
                <div className="font-medium">{x.count}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Room</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.byRoom ?? []).map((x: any) => (
              <div key={x.roomId} className="flex justify-between border rounded-md p-2">
                <div className="truncate">{x.room}</div>
                <div className="font-medium">{x.count}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Top Requesters</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.topRequesters ?? []).map((x: any) => (
              <div key={x.requesterId} className="flex justify-between border rounded-md p-2">
                <div className="truncate">{x.requester}</div>
                <div className="font-medium">{x.count}</div>
              </div>
            ))}
            {(data?.topRequesters ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground">ไม่มีข้อมูล</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
