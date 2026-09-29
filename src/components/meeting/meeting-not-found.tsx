import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'

export function MeetingNotFound() {
  return (
    <div className="flex flex-col items-center gap-2 py-24 text-center">
      <h1 className="text-lg font-semibold">Meeting not found</h1>
      <p className="text-sm text-muted-foreground">
        It may have been cancelled, or the link is wrong.
      </p>
      <Button asChild variant="outline" className="mt-2">
        <Link to="/meetings">Back to my meetings</Link>
      </Button>
    </div>
  )
}
