import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export type Organization = {
  id: string
  name: string
  plan: string
  logo: LucideIcon
}

type OrgSwitcherProps = {
  organizations: readonly [Organization, ...Organization[]]
}

export function OrgSwitcher({ organizations }: OrgSwitcherProps) {
  const { isMobile } = useSidebar()
  const [activeOrgId, setActiveOrgId] = useState(organizations[0].id)
  const activeOrg =
    organizations.find((org) => org.id === activeOrgId) ?? organizations[0]

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <activeOrg.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{activeOrg.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeOrg.plan}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organizations
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onSelect={() => setActiveOrgId(org.id)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <org.logo className="size-3.5 shrink-0" />
                </div>
                <span className="flex-1 truncate">{org.name}</span>
                {org.id === activeOrg.id && <Check className="ml-auto" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <span className="font-medium text-muted-foreground">
                Add organization
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
