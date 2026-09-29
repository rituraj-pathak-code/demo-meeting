import { Link, useMatchRoute } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export type NavItem = {
  title: string
  to: NonNullable<LinkProps['to']>
  icon: LucideIcon
}

type NavMainProps = {
  label: string
  items: readonly NavItem[]
}

export function NavMain({ label, items }: NavMainProps) {
  const matchRoute = useMatchRoute()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              isActive={Boolean(matchRoute({ to: item.to, fuzzy: true }))}
            >
              <Link to={item.to}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
