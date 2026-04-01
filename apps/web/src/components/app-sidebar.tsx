"use client"

import * as React from "react"
import { useAuth } from "@/lib/supabase/auth-provider"
import { NavMain } from "@/components/nav-main"
import { NavAdmin } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { 
  IconHome, 
  IconMessages, 
  IconBox, 
  IconChecklist, 
  IconFlask, 
  IconUsers,
  IconHotelService,
} from "@tabler/icons-react"
import { ES } from "@/lib/spanish"

// Sample data structure
const data = {
  teams: [
    {
      name: "Casa Mädi",
      logo: <IconHotelService className="h-5 w-5" />,
      plan: "Hotel",
    },
  ],
  navMain: [
    {
      title: ES.nav.dashboard,
      url: "/dashboard",
      icon: <IconHome className="h-4 w-4" />,
      isActive: true,
    },
    {
      title: ES.nav.conversations,
      url: "/conversations",
      icon: <IconMessages className="h-4 w-4" />,
    },
    {
      title: ES.nav.orders,
      url: "/orders",
      icon: <IconBox className="h-4 w-4" />,
    },
    {
      title: ES.nav.tasks,
      url: "/tasks",
      icon: <IconChecklist className="h-4 w-4" />,
    },
  ],
  admin: [
    {
      title: ES.nav.sandbox,
      url: "/sandbox",
      icon: <IconFlask className="h-4 w-4" />,
    },
    {
      title: ES.nav.users,
      url: "/admin/users",
      icon: <IconUsers className="h-4 w-4" />,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()
  const userRole = (user?.user_metadata as any)?.role || 'staff'

  // Show admin items based on role
  const adminItems = userRole === 'admin' ? data.admin : []

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        {adminItems.length > 0 && <NavAdmin items={adminItems} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser 
          user={{
            name: user?.user_metadata?.name || user?.email || 'Staff',
            email: user?.email || '',
            avatar: user?.user_metadata?.avatar_url || '',
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
