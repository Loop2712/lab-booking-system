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
  containerWidth = "default",
  children,
}: {
  nav: NavItem[];
  headerTitle: string;
  containerWidth?: "default" | "wide";
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
          <div className="@container/main flex flex-1 flex-col">
            <div
              className={[
                "flex flex-1 flex-col gap-6 py-6 px-4 md:px-6",
                "mx-auto w-full",
                containerWidth === "wide" ? "max-w-[1440px]" : "max-w-[1280px]",
              ].join(" ")}
            >
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
