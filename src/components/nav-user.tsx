import { Link } from '@tanstack/react-router'
import {
  ChevronsUpDown,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sun,
  UserRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { THEMES, useTheme } from '@/hooks/use-theme'
import type { Theme } from '@/hooks/use-theme'
import { getInitials } from '@/lib/utils'

export type User = {
  name: string
  email: string
  avatarUrl?: string
}

const THEME_OPTIONS: Record<Theme, { label: string; icon: LucideIcon }> = {
  light: { label: 'Light', icon: Sun },
  dark: { label: 'Dark', icon: Moon },
  system: { label: 'System', icon: Monitor },
}

function UserIdentity({ user }: { user: User }) {
  return (
    <>
      <Avatar className="size-8 rounded-lg">
        <AvatarImage src={user.avatarUrl} alt={user.name} />
        <AvatarFallback className="rounded-lg">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {user.email}
        </span>
      </div>
    </>
  )
}

type NavUserProps = {
  user: User
  onSignOut: () => void
}

export function NavUser({ user, onSignOut }: NavUserProps) {
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()

  function handleThemeChange(value: string) {
    const next = THEMES.find((option) => option === value)
    if (next) setTheme(next)
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <UserIdentity user={user} />
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">
                <UserIdentity user={user} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/profile">
                  <UserRound />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="gap-2">
                  <Palette className="size-4 text-muted-foreground" />
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-36">
                  <DropdownMenuRadioGroup
                    value={theme}
                    onValueChange={handleThemeChange}
                  >
                    {THEMES.map((option) => {
                      const { label, icon: Icon } = THEME_OPTIONS[option]
                      return (
                        <DropdownMenuRadioItem key={option} value={option}>
                          <Icon />
                          {label}
                        </DropdownMenuRadioItem>
                      )
                    })}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
