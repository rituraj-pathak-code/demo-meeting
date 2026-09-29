import { createFileRoute } from '@tanstack/react-router'

import { PageHeader } from '@/components/page-header'

export const Route = createFileRoute('/_app/profile')({
  staticData: { title: 'Profile' },
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your personal information and preferences."
      />
      <div className="min-h-[60vh] flex-1 rounded-xl border border-dashed bg-muted/40" />
    </>
  )
}
