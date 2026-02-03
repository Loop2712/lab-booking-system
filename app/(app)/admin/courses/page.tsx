"use client";
import type { Course } from "./types";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminCoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [openCreate, setOpenCreate] = useState(false);

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
    setOpenCreate(false);
  }

  async function del(id: string) {
    const r = await fetch(`/api/admin/courses/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (!j.ok) return alert(j.message ?? "ERROR");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-sm text-muted-foreground">จัดการรายวิชา</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button>เพิ่มรายวิชา</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เพิ่มรายวิชา</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <Input placeholder="Code (เช่น SCS409)" value={code} onChange={(e) => setCode(e.target.value)} />
              <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>
                ยกเลิก
              </Button>
              <Button onClick={create}>บันทึก</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>รายการรายวิชา</CardTitle>
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
          {items.length === 0 && <div className="text-sm text-muted-foreground">ยังไม่มีรายวิชา</div>}
        </CardContent>
      </Card>
    </div>
  );
}
