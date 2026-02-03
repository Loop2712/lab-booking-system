"use client"

import * as React from "react"
import Link from "next/link"
import { IconInnerShadowTop } from "@tabler/icons-react"

import type { NavItem } from "@/components/app-shell/nav"
import { navIconMap } from "@/components/app-shell/nav-icons"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  nav: NavItem[]
  user: {
    name: string
    email: string
    avatar: string
  }
  brand?: {
    title: string
    href?: string
  }
}

export function AppSidebar({ nav, user, brand, ...props }: AppSidebarProps) {
  const navMain = nav.map((item) => ({
    title: item.title,
    url: item.href,
    icon: navIconMap[item.icon],
  }))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href={brand?.href ?? "#"}>
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">
                  {brand?.title ?? "Lab Booking"}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
