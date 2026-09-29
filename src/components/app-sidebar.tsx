import type { ComponentProps } from 'react'
import { CalendarDays, LayoutDashboard, Video } from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import type { NavItem } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import type { User } from '@/components/nav-user'
import { OrgSwitcher } from '@/components/org-switcher'
import type { Organization } from '@/components/org-switcher'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'

const NAV_ITEMS = [
  { title: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { title: 'Calendar', to: '/calendar', icon: CalendarDays },
  { title: 'My meetings', to: '/meetings', icon: Video },
] as const satisfies readonly NavItem[]

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  organizations: readonly [Organization, ...Organization[]]
  user: User
  onSignOut: () => void
}

export function AppSidebar({
  organizations,
  user,
  onSignOut,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <OrgSwitcher organizations={organizations} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Workspace" items={NAV_ITEMS} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onSignOut={onSignOut} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
