"use client";

import type { Gender, Role, StudentType } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  role: Role;
  onRoleChange: (value: Role) => void;
  birthDate: string;
  onBirthDateChange: (value: string) => void;
  firstName: string;
  onFirstNameChange: (value: string) => void;
  lastName: string;
  onLastNameChange: (value: string) => void;
  studentId: string;
  onStudentIdChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  major: string;
  onMajorChange: (value: string) => void;
  gender: Gender | "";
  onGenderChange: (value: Gender | "") => void;
  studentType: StudentType | "";
  onStudentTypeChange: (value: StudentType | "") => void;
  onCreate: () => Promise<boolean>;
};

export default function CreateUserDialog({
  open,
  onOpenChange,
  busy,
  role,
  onRoleChange,
  birthDate,
  onBirthDateChange,
  firstName,
  onFirstNameChange,
  lastName,
  onLastNameChange,
  studentId,
  onStudentIdChange,
  email,
  onEmailChange,
  major,
  onMajorChange,
  gender,
  onGenderChange,
  studentType,
  onStudentTypeChange,
  onCreate,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>สร้างผู้ใช้</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>สร้างผู้ใช้</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={role} onValueChange={(v) => onRoleChange(v as Role)}>
            <SelectTrigger>
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="STUDENT">STUDENT</SelectItem>
              <SelectItem value="TEACHER">TEACHER</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
            </SelectContent>
          </Select>

          <Input
            placeholder="วันเกิด (YYYY-MM-DD)"
            value={birthDate}
            onChange={(e) => onBirthDateChange(e.target.value)}
          />

          <Input placeholder="ชื่อ" value={firstName} onChange={(e) => onFirstNameChange(e.target.value)} />
          <Input placeholder="นามสกุล" value={lastName} onChange={(e) => onLastNameChange(e.target.value)} />

          {role === "STUDENT" ? (
            <Input
              placeholder="รหัสนักศึกษา 11 หลัก"
              value={studentId}
              onChange={(e) => onStudentIdChange(e.target.value)}
            />
          ) : (
            <Input placeholder="Email (Teacher/Admin)" value={email} onChange={(e) => onEmailChange(e.target.value)} />
          )}

          <Input placeholder="สาขา (optional)" value={major} onChange={(e) => onMajorChange(e.target.value)} />

          <Select value={gender} onValueChange={(v) => onGenderChange(v as Gender | "")}>
            <SelectTrigger>
              <SelectValue placeholder="เพศ (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">MALE</SelectItem>
              <SelectItem value="FEMALE">FEMALE</SelectItem>
              <SelectItem value="OTHER">OTHER</SelectItem>
            </SelectContent>
          </Select>

          <Select value={studentType} onValueChange={(v) => onStudentTypeChange(v as StudentType | "")}>
            <SelectTrigger>
              <SelectValue placeholder="ประเภทนักศึกษา (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REGULAR">REGULAR</SelectItem>
              <SelectItem value="SPECIAL">SPECIAL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            ยกเลิก
          </Button>
          <Button
            onClick={async () => {
              const ok = await onCreate();
              if (ok) onOpenChange(false);
            }}
            disabled={busy}
          >
            {busy ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
