"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LogoutButton({ className }: { className?: string }) {
  return (
    <Button
      variant="outline"
      className={className}
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      ออกจากระบบ
    </Button>
  );
}
