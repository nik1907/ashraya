import Link from 'next/link'

import { saveSettings } from '@/app/admin/actions'
import { AppHeader } from '@/components/AppHeader'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

type AppSetting = {
  key: string
  value: string | null
  label: string | null
  description: string | null
}

const KNOWN_KEYS = [
  'sla_crisis_hours',
  'sla_standard_hours',
  'email_abu_dhabi',
  'email_dubai',
  'org_name',
  'org_address',
  'stale_threshold_days',
] as const

type KnownKey = (typeof KNOWN_KEYS)[number]

type FieldDef = {
  key: KnownKey
  type: 'number' | 'email' | 'text'
  min?: number
  max?: number
  defaultLabel: string
  defaultDesc: string
}

const FIELD_DEFS: FieldDef[] = [
  {
    key: 'sla_crisis_hours',
    type: 'number',
    min: 1,
    max: 168,
    defaultLabel: 'Crisis SLA (hours)',
    defaultDesc: 'Target response time for crisis cases, in hours.',
  },
  {
    key: 'sla_standard_hours',
    type: 'number',
    min: 1,
    max: 720,
    defaultLabel: 'Standard SLA (hours)',
    defaultDesc: 'Target response time for standard cases, in hours.',
  },
  {
    key: 'email_abu_dhabi',
    type: 'email',
    defaultLabel: 'Abu Dhabi embassy email',
    defaultDesc: 'Cases from Abu Dhabi are routed to this address.',
  },
  {
    key: 'email_dubai',
    type: 'email',
    defaultLabel: 'Dubai embassy email',
    defaultDesc: 'Cases from other emirates are routed to this address.',
  },
  {
    key: 'org_name',
    type: 'text',
    defaultLabel: 'Organisation name',
    defaultDesc: 'Displayed in emails and reports.',
  },
  {
    key: 'org_address',
    type: 'text',
    defaultLabel: 'Organisation address',
    defaultDesc: 'Displayed in the footer of outbound emails.',
  },
  {
    key: 'stale_threshold_days',
    type: 'number',
    min: 1,
    max: 30,
    defaultLabel: 'Stale case threshold (days)',
    defaultDesc: 'Cases not updated within this many days are flagged as stale on the dashboard.',
  },
]

const SECTIONS: { title: string; keys: KnownKey[] }[] = [
  {
    title: 'SLA Targets',
    keys: ['sla_crisis_hours', 'sla_standard_hours'],
  },
  {
    title: 'Email Routing',
    keys: ['email_abu_dhabi', 'email_dubai'],
  },
  {
    title: 'Organisation',
    keys: ['org_name', 'org_address'],
  },
  {
    title: 'Dashboard',
    keys: ['stale_threshold_days'],
  },
]

export default async function SettingsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const profile    = await requireProfile(['tfa_admin'])
  const sp         = await props.searchParams
  const wasSaved   = sp?.saved === '1'
  const supabase   = await createClient()

  const { data: rows } = await supabase
    .from('app_settings')
    .select('key, value, label, description')

  const settingsMap = Object.fromEntries(
    ((rows ?? []) as unknown as AppSetting[]).map((r) => [r.key, r]),
  ) as Record<string, AppSetting | undefined>

  function getValue(key: KnownKey) {
    return settingsMap[key]?.value ?? ''
  }

  function getFieldDef(key: KnownKey): FieldDef {
    return FIELD_DEFS.find((f) => f.key === key)!
  }

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-6">

        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">Settings</h1>
            <p className="mt-1 text-sm text-brand-muted">
              Platform configuration — changes take effect immediately
            </p>
          </div>
          <Link href="/admin" className="text-sm text-brand-navy-light underline">
            ← Back to admin
          </Link>
        </div>

        {/* Success banner */}
        {wasSaved && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Settings saved successfully.
          </div>
        )}

        <form action={saveSettings} className="space-y-8">
          {SECTIONS.map((section) => (
            <div key={section.title} className="rounded-xl border border-brand-border bg-brand-card shadow-sm">
              <div className="border-b border-brand-border px-6 py-3">
                <h2 className="text-sm font-semibold text-brand-navy">{section.title}</h2>
              </div>
              <div className="divide-y divide-brand-border">
                {section.keys.map((key) => {
                  const def   = getFieldDef(key)
                  const label = settingsMap[key]?.label ?? def.defaultLabel
                  const desc  = settingsMap[key]?.description ?? def.defaultDesc
                  const value = getValue(key)
                  return (
                    <div key={key} className="px-6 py-4">
                      <label
                        htmlFor={key}
                        className="mb-0.5 block text-sm font-medium text-brand-navy"
                      >
                        {label}
                      </label>
                      <p className="mb-2 text-xs text-brand-muted">{desc}</p>
                      <input
                        id={key}
                        name={key}
                        type={def.type}
                        defaultValue={value}
                        min={def.min}
                        max={def.max}
                        className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          <div>
            <button
              type="submit"
              className="rounded bg-brand-navy px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-navy-hover"
            >
              Save changes
            </button>
          </div>
        </form>

      </main>
    </div>
  )
}
