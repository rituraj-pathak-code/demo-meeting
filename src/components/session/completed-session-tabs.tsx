import { useState } from 'react'
import type { ReactNode } from 'react'

import { SessionAnalyticsView } from '@/components/session/session-analytics'
import { SessionAttendees } from '@/components/session/session-attendees'
import { SessionRecapView } from '@/components/session/session-recap'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Meeting, Session } from '@/lib/demo-meetings'
import { getEffectiveSession, setActionItemDone } from '@/lib/sessions'

export const COMPLETED_TABS = [
  'recap',
  'attendees',
  'analytics',
  'details',
] as const
export type CompletedTab = (typeof COMPLETED_TABS)[number]

export function isCompletedTab(value: unknown): value is CompletedTab {
  return COMPLETED_TABS.some((tab) => tab === value)
}

type CompletedSessionTabsProps = {
  meeting: Meeting
  session: Session
  onChange: (update: (meeting: Meeting) => Meeting) => void
  initialTab?: CompletedTab
  /** One-off meetings also show their details here. */
  details?: ReactNode
}

/** After a session: what happened, who came, and how it went. */
export function CompletedSessionTabs({
  meeting,
  session,
  onChange,
  initialTab = 'recap',
  details,
}: CompletedSessionTabsProps) {
  const [tab, setTab] = useState<CompletedTab>(
    initialTab === 'details' && !details ? 'recap' : initialTab,
  )
  const effective = getEffectiveSession(meeting, session)

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (isCompletedTab(value)) setTab(value)
      }}
      className="gap-4"
    >
      <div className="border-b pb-1">
        <TabsList variant="line">
          <TabsTrigger value="recap">Recap</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          {details && <TabsTrigger value="details">Details</TabsTrigger>}
        </TabsList>
      </div>
      <TabsContent value="recap">
        {session.recap ? (
          <SessionRecapView
            recap={session.recap}
            onToggleActionItem={(itemId, done) =>
              onChange((current) =>
                setActionItemDone(current, session.id, itemId, done),
              )
            }
          />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No recap for this session.
          </p>
        )}
      </TabsContent>
      <TabsContent value="attendees">
        {session.analytics ? (
          <SessionAttendees
            invited={effective.guests}
            analytics={session.analytics}
          />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No attendance data for this session.
          </p>
        )}
      </TabsContent>
      <TabsContent value="analytics">
        {session.analytics ? (
          <SessionAnalyticsView analytics={session.analytics} />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No analytics for this session.
          </p>
        )}
      </TabsContent>
      {details && <TabsContent value="details">{details}</TabsContent>}
    </Tabs>
  )
}
