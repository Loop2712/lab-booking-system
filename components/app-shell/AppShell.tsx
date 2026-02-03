import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import type { NavItem } from "./nav";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

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
  const email = session?.user?.email ?? "-";
  const avatar = session?.user?.image ?? "/logo1.png";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        nav={nav}
        user={{ name, email, avatar }}
        brand={{ title: "Lab Booking", href: nav[0]?.href ?? "/" }}
        variant="inset"
      />
      <SidebarInset className="md:peer-data-[variant=inset]:ml-4 lg:peer-data-[variant=inset]:ml">
        <SiteHeader title={headerTitle} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 pr-4 pl-6 md:gap-6 md:py-6 md:pr-6 md:pl-8 lg:pl-10">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
