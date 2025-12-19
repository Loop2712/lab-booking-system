"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Course = { id: string; code: string; name: string };

export default function AdminรายวิชาPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  async function load() {
    const r = await fetch("/api/admin/courses");
    const j = await r.json();
    setItems(j.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    const r = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name }),
    });
    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    setCode("");
    setName("");
    load();
  }

  async function del(id: string) {
    const r = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    load();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>รายวิชา</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Code (เช่น SCS409)" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={create}>Add</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายการ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium">{c.code}</div>
                <div className="text-sm text-muted-foreground">{c.name}</div>
              </div>
              <Button variant="destructive" onClick={() => del(c.id)}>
                Delete
              </Button>
            </div>
          ))}
          {items.length === 0 && <div className="text-sm text-muted-foreground">ยังไม่มีข้อมูล</div>}
        </CardContent>
      </Card>
    </div>
  );
}
