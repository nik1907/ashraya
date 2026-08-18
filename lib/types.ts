// Shared domain types for the TFA Community Welfare Case Management app.

export const ROLES = [
  'volunteer',
  'tfa_admin',
  'embassy_abu_dhabi',
  'embassy_dubai',
  'ambassador',
  'ifs_officer',
] as const

export type Role = (typeof ROLES)[number]

export const PROFILE_STATUSES = ['pending', 'active', 'suspended'] as const
export type ProfileStatus = (typeof PROFILE_STATUSES)[number]

export type DashboardView = 'embassy_all' | 'embassy_assigned' | 'ambassador'

export type Profile = {
  id: string
  full_name: string | null
  role: Role
  phone: string | null
  status: ProfileStatus
  org_id: string | null
  designation: string | null
  cases_scope: 'all' | 'assigned'
  dashboard_view: DashboardView
  created_at: string
  updated_at: string
}

export type Organization = {
  id: string
  name: string
  abbreviation: string
}

/** Which emirate an embassy role is scoped to, or null for non-embassy roles. */
export function emirateForRole(role: Role): 'Abu Dhabi' | 'Dubai' | null {
  if (role === 'embassy_abu_dhabi') return 'Abu Dhabi'
  if (role === 'embassy_dubai') return 'Dubai'
  return null
}

/** The landing path each role is sent to after login. */
export function landingPathForRole(role: Role): string {
  switch (role) {
    case 'tfa_admin':
      return '/admin'
    case 'embassy_abu_dhabi':
    case 'embassy_dubai':
      return '/embassy'
    case 'ambassador':
      return '/ambassador'
    case 'ifs_officer':
      return '/embassy'
    case 'volunteer':
    default:
      return '/dashboard'
  }
}

/** Profile-aware landing path — honours per-user dashboard_view for diplomatic roles. */
export function landingPathForProfile(profile: Pick<Profile, 'role' | 'dashboard_view'>): string {
  const diplomaticRoles: Role[] = ['ifs_officer', 'ambassador', 'embassy_abu_dhabi', 'embassy_dubai']
  if (diplomaticRoles.includes(profile.role)) {
    if (profile.dashboard_view === 'ambassador') return '/ambassador'
    return '/embassy'
  }
  return landingPathForRole(profile.role)
}

export const CASE_STATUS_LABELS: Record<string, string> = {
  submitted:        'Processing',
  pending_review:   'Awaiting Admin Review',
  needs_attention:  'Needs Attention',
  sent:             'Received',
  acknowledged:     'Acknowledged',
  need_more_info:   'Awaiting Reporter Response',
  in_progress:      'Under Embassy Action',
  resolved:         'Resolved/Closed',
  closed:           'Resolved/Closed',
}

/** Statuses an embassy/consulate user may set (no system-only ones). */
export const EMBASSY_STATUS_OPTIONS = [
  'acknowledged',
  'need_more_info',
  'in_progress',
  'resolved',
] as const

/** Statuses a TFA admin may set (everything). */
export const ADMIN_STATUS_OPTIONS = [
  'submitted',
  'pending_review',
  'needs_attention',
  'sent',
  'acknowledged',
  'need_more_info',
  'in_progress',
  'resolved',
] as const

export const ROLE_LABELS: Record<Role, string> = {
  volunteer:         'Volunteer',
  tfa_admin:         'Admin',
  embassy_abu_dhabi: 'Embassy of India — Abu Dhabi',
  embassy_dubai:     'Consulate General of India — Dubai',
  ambassador:        'Ambassador',
  ifs_officer:       'IFS Officer',
}
