"use client";

import type { UserRow } from "../types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toYmd } from "../toYmd";

type Props = {
  items: UserRow[];
  busy: boolean;
  onDeactivate: (id: string) => Promise<void>;
  onToggleActive: (user: UserRow) => Promise<void>;
};

export default function UsersTableCard({ items, busy, onDeactivate, onToggleActive }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">ListUser</CardTitle>
        <Badge variant="secondary">{items.length} users</Badge>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>รหัสนักศึกษา/อีเมล</TableHead>
              <TableHead>BirthDate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {items.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Badge variant="outline">{u.role}</Badge>
                </TableCell>

                <TableCell className="font-medium">
                  {u.firstName} {u.lastName}
                </TableCell>

                <TableCell className="text-sm">
                  {u.role === "STUDENT" ? (
                    <span className="font-mono">{u.studentId ?? "-"}</span>
                  ) : (
                    <span className="font-mono">{u.email ?? "-"}</span>
                  )}
                </TableCell>

                <TableCell className="font-mono text-sm">{toYmd(u.birthDate)}</TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={u.isActive} onCheckedChange={() => onToggleActive(u)} disabled={busy} />
                    <span className="text-sm text-muted-foreground">{u.isActive ? "ACTIVE" : "INACTIVE"}</span>
                  </div>
                </TableCell>

                <TableCell className="text-right">
                  <Button variant="destructive" size="sm" onClick={() => onDeactivate(u.id)} disabled={busy || !u.isActive}>
                    ปิดใช้งาน
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  ไม่พบผู้ใช้
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
