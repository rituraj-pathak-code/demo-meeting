import { Clock, Hourglass, Timer, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { SessionAnalytics } from '@/lib/demo-meetings'
import { cn } from '@/lib/utils'

type SessionAnalyticsViewProps = {
  analytics: SessionAnalytics
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint: string
}) {
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardDescription className="font-medium">{label}</CardDescription>
        <CardAction>
          <Icon className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-1 px-5">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function topicStatus(planned: number, actual: number) {
  if (actual === 0)
    return {
      label: 'Skipped',
      className: 'border-amber-500/40 text-amber-700 dark:text-amber-400',
    }
  if (actual > planned + 2)
    return {
      label: `+${actual - planned} min`,
      className: 'border-amber-500/40 text-amber-700 dark:text-amber-400',
    }
  return { label: 'On time', className: 'text-muted-foreground' }
}

export function SessionAnalyticsView({ analytics }: SessionAnalyticsViewProps) {
  const attendanceRate = Math.round(
    (analytics.joined / analytics.invited) * 100,
  )
  const overrun = analytics.actualMinutes - analytics.scheduledMinutes
  const engagement = [
    { label: 'Chat messages', value: analytics.engagement.chatMessages },
    { label: 'Reactions', value: analytics.engagement.reactions },
    { label: 'Poll responses', value: analytics.engagement.pollResponses },
    { label: 'Questions', value: analytics.engagement.questions },
  ].filter(
    (item): item is { label: string; value: number } => item.value !== null,
  )

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile
          icon={Users}
          label="Attendance"
          value={`${analytics.joined}/${analytics.invited}`}
          hint={`${attendanceRate}% of people invited`}
        />
        <StatTile
          icon={Clock}
          label="Length"
          value={`${analytics.actualMinutes} min`}
          hint={
            overrun > 0
              ? `${overrun} min over the ${analytics.scheduledMinutes} scheduled`
              : overrun < 0
                ? `Ended ${-overrun} min early`
                : 'Ended right on time'
          }
        />
        <StatTile
          icon={Hourglass}
          label="Avg time in call"
          value={`${analytics.averageMinutesInCall} min`}
          hint="Per person who joined"
        />
        <StatTile
          icon={Timer}
          label="Joined late"
          value={String(analytics.lateJoiners)}
          hint={
            analytics.lateJoiners === 0
              ? 'Everyone was on time'
              : 'More than 2 min after start'
          }
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Agenda coverage</CardTitle>
            <CardDescription>Planned vs actual time per topic</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.topics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This session had no agenda.
              </p>
            ) : (
              <ul className="grid gap-4">
                {analytics.topics.map((topic) => {
                  const status = topicStatus(topic.planned, topic.actual)
                  const max = Math.max(topic.planned, topic.actual, 1)
                  return (
                    <li key={topic.title} className="grid gap-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm">{topic.title}</p>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0', status.className)}
                        >
                          {status.label}
                        </Badge>
                      </div>
                      <Progress
                        value={(topic.actual / max) * 100}
                        aria-label={`${topic.title}: ${topic.actual} of ${topic.planned} minutes`}
                        className="h-1.5"
                      />
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {topic.actual} min spent · {topic.planned} planned
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Talk time</CardTitle>
            <CardDescription>Share of speaking time</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3">
              {analytics.talkTime.map((speaker) => (
                <li
                  key={speaker.name}
                  className="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-3"
                >
                  <span className="truncate text-sm">{speaker.name}</span>
                  <Progress
                    value={speaker.share}
                    aria-label={`${speaker.name}: ${speaker.share}%`}
                    className="h-1.5"
                  />
                  <span className="text-right text-xs text-muted-foreground tabular-nums">
                    {speaker.share}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {engagement.map((item) => (
              <div key={item.label} className="grid gap-0.5">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="text-xl font-semibold tabular-nums">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
