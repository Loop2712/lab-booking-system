import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import type { NavItem } from "./nav";

export default async function AppShell({
  nav,
  headerTitle,
  children,
}: {
  nav: NavItem[];
  headerTitle: string;
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name ?? "User";

  return (
    <div className="min-h-screen flex">
      <Sidebar nav={nav} headerTitle={headerTitle} />

      <div className="flex-1 flex flex-col">
        <Topbar nav={nav} headerTitle={headerTitle} userLabel={name} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
