"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PasswordForm from "./password-form";

type Profile = {
  id: string;
  role: string;
  firstName: string;
  lastName: string;
  birthDate: string; // YYYY-MM-DD
  gender: "MALE" | "FEMALE" | "OTHER" | null;
  major: string | null;
};

const GENDER_OPTIONS = [
  { value: "MALE", label: "MALE" },
  { value: "FEMALE", label: "FEMALE" },
  { value: "OTHER", label: "OTHER" },
] as const;

type EditableField = "firstName" | "lastName" | "birthDate" | "gender" | "major";

const FIELD_LABEL: Record<EditableField, string> = {
  firstName: "ชื่อ",
  lastName: "นามสกุล",
  birthDate: "วันเดือนปีเกิด",
  gender: "เพศ",
  major: "สาขา",
};

export default function ProfileSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeField, setActiveField] = useState<EditableField | null>(null);
  const [fieldValue, setFieldValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const displayMajor = profile?.major?.trim() || "-";
  const displayGender = profile?.gender || "-";
  const displayBirthDate = profile?.birthDate || "-";

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/profile", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      setLoading(false);

      if (!res.ok || !json?.ok) {
        setError(json?.message || "โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      setProfile(json.user as Profile);
    }

    load();
  }, []);

  function getFieldValue(p: Profile, field: EditableField) {
    if (field === "gender") return p.gender ?? "";
    if (field === "major") return p.major ?? "";
    return p[field] ?? "";
  }

  function openEdit(field: EditableField) {
    if (!profile) return;
    setActiveField(field);
    setFieldValue(String(getFieldValue(profile, field) ?? ""));
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setActiveField(null);
    setFieldValue("");
  }

  async function save() {
    if (!activeField) return;
    setSaving(true);
    setError(null);

    const payload: Record<string, any> = {};
    if (activeField === "gender") {
      payload.gender = fieldValue || null;
    } else if (activeField === "major") {
      payload.major = fieldValue.trim() ? fieldValue.trim() : null;
    } else {
      payload[activeField] = fieldValue.trim();
    }

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok || !json?.ok) {
      setError(json?.message || "บันทึกข้อมูลไม่สำเร็จ");
      return;
    }

    setProfile(json.user as Profile);
    closeDialog();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">ข้อมูลส่วนตัว</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">กำลังโหลด...</div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {profile ? (
          <div className="rounded-xl border">
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="text-xs text-muted-foreground">ชื่อ</div>
                <div className="font-medium">{profile.firstName}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit("firstName")}>
                แก้ไข
              </Button>
            </div>
            <div className="border-t" />
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="text-xs text-muted-foreground">นามสกุล</div>
                <div className="font-medium">{profile.lastName}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit("lastName")}>
                แก้ไข
              </Button>
            </div>
            <div className="border-t" />
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="text-xs text-muted-foreground">วันเดือนปีเกิด</div>
                <div className="font-medium">{displayBirthDate}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit("birthDate")}>
                แก้ไข
              </Button>
            </div>
            <div className="border-t" />
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="text-xs text-muted-foreground">เพศ</div>
                <div className="font-medium">{displayGender}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit("gender")}>
                แก้ไข
              </Button>
            </div>
            <div className="border-t" />
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="text-xs text-muted-foreground">สาขา</div>
                <div className="font-medium">{displayMajor}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => openEdit("major")}>
                แก้ไข
              </Button>
            </div>
            <div className="border-t" />
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="text-xs text-muted-foreground">รหัสผ่าน</div>
                <div className="font-medium">แก้พาสเวิร์ด</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
                แก้ไข
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(v) => (v ? setDialogOpen(true) : closeDialog())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไข {activeField ? FIELD_LABEL[activeField] : ""}</DialogTitle>
            <DialogDescription>กรอกข้อมูลใหม่แล้วบันทึก</DialogDescription>
          </DialogHeader>

          {activeField === "gender" ? (
            <div className="space-y-2">
              <Label>เพศ</Label>
              <Select value={fieldValue} onValueChange={setFieldValue}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกเพศ" />
                </SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : activeField === "birthDate" ? (
            <div className="space-y-2">
              <Label>วันเดือนปีเกิด</Label>
              <Input
                type="date"
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{activeField ? FIELD_LABEL[activeField] : ""}</Label>
              <Input value={fieldValue} onChange={(e) => setFieldValue(e.target.value)} />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              ยกเลิก
            </Button>
            <Button onClick={save} disabled={saving || !activeField}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>แก้ไขรหัสผ่าน</DialogTitle>
            <DialogDescription>กรอกรหัสผ่านเดิมและรหัสผ่านใหม่</DialogDescription>
          </DialogHeader>
          <PasswordForm />
        </DialogContent>
      </Dialog>
    </Card>
  );
}
