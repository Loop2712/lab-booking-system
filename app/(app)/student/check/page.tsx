"use client";

import Link from "next/link";
import { Camera, ImageUp, ShieldCheck } from "lucide-react";
import MyQrToken from "@/components/qr/MyQrToken";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    icon: Camera,
    title: "เปิดหน้านี้เมื่อถึงจุดยืม-คืน",
    description: "แสดง QR บนหน้าจอให้เจ้าหน้าที่หรืออาจารย์ใช้งานได้ทันที",
  },
  {
    icon: ImageUp,
    title: "หากยังไม่มีเครื่องสแกน",
    description: "จุดยืม-คืนสามารถอัปโหลดรูป QR จากหน้าจอนี้เพื่ออ่าน token แทนได้",
  },
  {
    icon: ShieldCheck,
    title: "QR จะรีเฟรชอัตโนมัติ",
    description: "ระบบสร้าง token ใหม่เป็นระยะเพื่อใช้ยืนยันตัวตนหน้างานอย่างปลอดภัย",
  },
];

export default function StudentCheckPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <section className="overflow-hidden rounded-[28px] border bg-gradient-to-br from-stone-100 via-white to-emerald-50">
        <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-stone-300 bg-white/90 px-3 py-1 text-xs font-medium text-stone-700">
                Student Check-in QR
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
                  แสดง QR สำหรับยืม-คืนกุญแจ
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
                  ใช้หน้านี้สำหรับยืนยันตัวตนเมื่อมีการรับหรือคืนกุญแจห้องเรียน โดยเจ้าหน้าที่สามารถสแกน QR
                  ได้ทันที หรืออัปโหลดรูป QR แทนได้หากยังไม่มีอุปกรณ์สแกน
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {STEPS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-2xl border bg-white/85 p-4 shadow-sm ring-1 ring-black/5">
                    <div className="flex items-center gap-2 text-stone-900">
                      <div className="rounded-xl bg-stone-100 p-2">
                        <Icon className="size-4" />
                      </div>
                      <div className="text-sm font-semibold">{item.title}</div>
                    </div>
                    <div className="mt-3 text-xs leading-5 text-stone-600">{item.description}</div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/student/qr">เปิดหน้า QR แบบเต็ม</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/student/reservations">ดูรายการจองของฉัน</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-[28px] border bg-white/90 p-5 shadow-sm ring-1 ring-black/5">
            <MyQrToken checkOnly />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border bg-white p-5 shadow-sm ring-1 ring-black/5">
          <div className="text-sm font-semibold text-stone-900">คำแนะนำการใช้งานหน้างาน</div>
          <div className="mt-3 space-y-3 text-sm text-stone-600">
            <p>แสดง QR ให้เห็นเต็มจอและไม่ให้มีแสงสะท้อน เพื่อให้สแกนหรืออัปโหลดภาพได้ง่ายขึ้น</p>
            <p>หากใช้งานผ่านโทรศัพท์ สามารถเพิ่มความสว่างหน้าจอชั่วคราวเพื่อให้ QR ชัดขึ้น</p>
            <p>หาก QR หมดอายุ ระบบจะรีเฟรชให้อัตโนมัติบนหน้านี้โดยไม่ต้องเปิดหน้าใหม่เอง</p>
          </div>
        </div>

        <div className="rounded-3xl border bg-stone-950 p-5 text-stone-50 shadow-sm">
          <div className="text-sm font-semibold">กรณีไม่มีเครื่องสแกน QR</div>
          <div className="mt-3 space-y-3 text-sm text-stone-300">
            <p>เจ้าหน้าที่สามารถอัปโหลดรูป screenshot หรือรูปถ่าย QR จากหน้าจอนี้ในหน้ายืม-คืนได้โดยตรง</p>
            <p>จึงยังใช้งาน flow ยืม-คืนได้ แม้ไม่มีอุปกรณ์อ่าน QR เชื่อมต่ออยู่ที่เครื่อง</p>
          </div>
        </div>
      </section>
    </div>
  );
}
