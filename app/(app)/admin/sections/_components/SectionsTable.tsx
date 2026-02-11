"use client";

import type { Section, Term } from "../types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  sections: Section[];
  onEdit: (section: Section) => void;
  termLabel: (term: Term) => string;
  dayLabel: (dayCode: string) => string;
};

export default function SectionsTable({ sections, onEdit, termLabel, dayLabel }: Props) {
  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead className="w-[30%]">วิชา</TableHead>
            <TableHead>วัน/เวลา</TableHead>
            <TableHead>ห้อง</TableHead>
            <TableHead>อาจารย์</TableHead>
            <TableHead>เทอม/ปี</TableHead>
            <TableHead>นักศึกษา (สูงสุด 40)</TableHead>
            <TableHead className="w-[120px]">แก้ไข</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.length ? (
            sections.map((section) => (
              <TableRow key={section.id}>
                <TableCell className="font-medium max-w-[420px] whitespace-normal break-words">
                  {section.course.code} {section.course.name}
                </TableCell>
                <TableCell>
                  {dayLabel(section.dayOfWeek)} {section.startTime}-{section.endTime}
                </TableCell>
                <TableCell>{section.room.code}</TableCell>
                <TableCell>
                  {section.teacher.firstName} {section.teacher.lastName}
                </TableCell>
                <TableCell>{section.term ? termLabel(section.term) : "-"}</TableCell>
                <TableCell>{section._count.enrollments}/40</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => onEdit(section)}>
                    แก้ไข
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                ยังไม่มีข้อมูล Section
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
