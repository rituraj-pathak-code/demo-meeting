import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Person } from '@/lib/demo-dashboard'
import { getInitials } from '@/lib/utils'

type AttendeeStackProps = {
  people: readonly Person[]
  max?: number
  size?: 'sm' | 'default'
}

export function AttendeeStack({
  people,
  max = 4,
  size = 'default',
}: AttendeeStackProps) {
  const visible = people.slice(0, max)
  const hidden = people.slice(max)

  return (
    <AvatarGroup>
      {visible.map((person) => (
        <Tooltip key={person.email}>
          <TooltipTrigger asChild>
            <Avatar size={size}>
              <AvatarFallback className="bg-secondary text-[0.65rem] font-medium text-secondary-foreground group-data-[size=sm]/avatar:text-[0.55rem]">
                {getInitials(person.name)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent>{person.name}</TooltipContent>
        </Tooltip>
      ))}
      {hidden.length > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <AvatarGroupCount className="text-[0.65rem] font-medium group-has-data-[size=sm]/avatar-group:text-[0.55rem]">
              +{hidden.length}
            </AvatarGroupCount>
          </TooltipTrigger>
          <TooltipContent>
            {hidden.map((person) => person.name).join(', ')}
          </TooltipContent>
        </Tooltip>
      )}
    </AvatarGroup>
  )
}
