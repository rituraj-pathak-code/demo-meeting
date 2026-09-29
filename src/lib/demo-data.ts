import { Building2, Rocket, Sparkles } from 'lucide-react'

import type { User } from '@/components/nav-user'
import type { Organization } from '@/components/org-switcher'

// Placeholder data until auth and organizations are backed by an API.
export const DEMO_ORGANIZATIONS = [
  { id: 'leapcast', name: 'Leapcast', plan: 'Enterprise', logo: Sparkles },
  { id: 'trueleap', name: 'TrueLeap', plan: 'Pro', logo: Rocket },
  { id: 'acme', name: 'Acme Inc.', plan: 'Free', logo: Building2 },
] as const satisfies readonly [Organization, ...Organization[]]

export const DEMO_USER: User = {
  name: 'Rituraj Pathak',
  email: 'rituraj@trueleap.io',
}
