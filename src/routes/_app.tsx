import {
  Outlet,
  createFileRoute,
  useMatches,
  useNavigate,
} from '@tanstack/react-router'

import { AppSidebar } from '@/components/app-sidebar'
import { AskAiButton } from '@/components/assistant/ask-ai-button'
import { AssistantProvider } from '@/components/assistant/assistant-provider'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { DEMO_ORGANIZATIONS, DEMO_USER } from '@/lib/demo-data'

export const Route = createFileRoute('/_app')({ component: AppLayout })

function AppLayout() {
  const navigate = useNavigate()
  const pageTitle = useMatches({
    select: (matches) => matches.at(-1)?.staticData.title,
  })

  function handleSignOut() {
    // TODO: call the auth provider's sign-out once auth is wired up.
    void navigate({ to: '/' })
  }

  return (
    <SidebarProvider>
      <AssistantProvider>
        <AppSidebar
          variant="inset"
          organizations={DEMO_ORGANIZATIONS}
          user={DEMO_USER}
          onSignOut={handleSignOut}
        />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <AskAiButton className="ml-auto" />
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
        <Toaster position="bottom-right" />
      </AssistantProvider>
    </SidebarProvider>
  )
}
