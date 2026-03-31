"use client"

import * as React from "react"
import {
  IconBell,
  IconCheck,
  IconWorld,
  IconHome,
  IconKeyboard,
  IconLink,
  IconLock,
  IconMenu,
  IconMessageQuestion,
  IconPalette,
  IconSettings,
  IconVideoPlus,
} from "@tabler/icons-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ES } from "@/lib/spanish"

const iconMap = {
  notifications: IconBell,
  navigation: IconMenu,
  home: IconHome,
  appearance: IconPalette,
  messages: IconMessageQuestion,
  language: IconWorld,
  accessibility: IconKeyboard,
  markAsRead: IconCheck,
  audio: IconVideoPlus,
  accounts: IconLink,
  privacy: IconLock,
  advanced: IconSettings,
}

const data = {
  nav: [
    { name: ES.settings.notifications, key: "notifications", icon: iconMap.notifications },
    { name: ES.settings.navigation, key: "navigation", icon: iconMap.navigation },
    { name: ES.settings.home, key: "home", icon: iconMap.home },
    { name: ES.settings.appearance, key: "appearance", icon: iconMap.appearance },
    { name: ES.settings.messagesMedia, key: "messages", icon: iconMap.messages },
    { name: ES.settings.languageRegion, key: "language", icon: iconMap.language },
    { name: ES.settings.accessibility, key: "accessibility", icon: iconMap.accessibility },
    { name: ES.settings.markAsRead, key: "markAsRead", icon: iconMap.markAsRead },
    { name: ES.settings.audioVideo, key: "audio", icon: iconMap.audio },
    { name: ES.settings.connectedAccounts, key: "accounts", icon: iconMap.accounts },
    { name: ES.settings.privacyVisibility, key: "privacy", icon: iconMap.privacy },
    { name: ES.settings.advanced, key: "advanced", icon: iconMap.advanced },
  ],
}

interface SettingsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}

export function SettingsDialog({
  open: controlledOpen,
  onOpenChange,
  trigger,
}: SettingsDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("messages")

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  const activeItem = data.nav.find((item) => item.key === activeTab)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button size="sm">{ES.nav.settings}</Button>}
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">{ES.nav.settings}</DialogTitle>
        <DialogDescription className="sr-only">
          {ES.settingsDesc}
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {data.nav.map((item) => {
                      const IconComponent = item.icon
                      return (
                        <SidebarMenuItem key={item.key}>
                          <SidebarMenuButton
                            asChild
                            isActive={item.key === activeTab}
                            onClick={() => setActiveTab(item.key)}
                          >
                            <button className="flex items-center gap-2 w-full cursor-pointer">
                              <IconComponent className="h-4 w-4" />
                              <span>{item.name}</span>
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">{ES.nav.settings}</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeItem?.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {activeItem && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">{activeItem.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Configuración en construcción...
                  </p>
                </div>
              )}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
