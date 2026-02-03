"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"

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
              size="lg"
              className="h-16 px-2 py-2"
            >
              <Link href="/" className="flex h-full items-center">
                <Image
                  src="/logo.png"
                  alt={brand?.title ?? "Lab Booking"}
                  width={1536}
                  height={1024}
                  className="h-full w-auto object-contain"
                  priority
                />
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
