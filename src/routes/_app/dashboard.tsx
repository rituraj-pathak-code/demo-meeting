import { createFileRoute } from '@tanstack/react-router'

import { ActionItemsCard } from '@/components/dashboard/action-items-card'
import { MeetingsCard } from '@/components/dashboard/meetings-card'
import { QuickStart } from '@/components/dashboard/quick-start'
import { UpNextCard } from '@/components/dashboard/up-next-card'
import { YesterdayRecapCard } from '@/components/dashboard/yesterday-recap-card'
import { PageHeader } from '@/components/page-header'
import {
  ACTION_ITEMS,
  DASHBOARD_NOW,
  PAST_MEETINGS,
  TODAY_SUMMARY,
  UPCOMING_MEETINGS,
  UP_NEXT,
  YESTERDAY_RECAP,
} from '@/lib/demo-dashboard'
import { DEMO_USER } from '@/lib/demo-data'

export const Route = createFileRoute('/_app/dashboard')({
  staticData: { title: 'Dashboard' },
  component: DashboardPage,
})

function DashboardPage() {
  const firstName = DEMO_USER.name.split(' ')[0]

  return (
    <>
      <PageHeader
        title={`${DASHBOARD_NOW.greeting}, ${firstName}`}
        description={`${DASHBOARD_NOW.dateLabel} · ${TODAY_SUMMARY.remaining} meetings left today`}
      />

      <QuickStart />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <UpNextCard meeting={UP_NEXT} />
          <MeetingsCard
            className="flex-1"
            upcoming={UPCOMING_MEETINGS}
            past={PAST_MEETINGS}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <YesterdayRecapCard recap={YESTERDAY_RECAP} />
          <ActionItemsCard className="flex-1" items={ACTION_ITEMS} />
        </div>
      </div>
    </>
  )
}
