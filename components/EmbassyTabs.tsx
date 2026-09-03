'use client'

import { useState } from 'react'

import { EmbassyCasesList } from '@/components/EmbassyCasesList'
import { EmailIntakeQueue, type EmailIntake } from '@/components/EmailIntakeQueue'
import { EmbassyActionCenter } from '@/components/dashboard/EmbassyActionCenter'
import { EmbassyDashboard } from '@/components/dashboard/EmbassyDashboard'
import type { PanelCase, PanelOfficer } from '@/components/dashboard/CaseSidePanel'

type Tab = 'overview' | 'action' | 'cases' | 'email'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Command Overview' },
  { key: 'action',   label: 'Action Center' },
  { key: 'cases',    label: 'Case Registry' },
  { key: 'email',    label: 'Email Queue' },
]

export function EmbassyTabs({
  cases,
  userFullName,
  emirateName,
  showEmirateSplit,
  actionCount,
  employerCounts,
  repliedAt,
  emailIntakes,
  officers = [],
}: {
  cases: PanelCase[]
  userFullName: string
  emirateName: string
  showEmirateSplit: boolean
  actionCount: number
  employerCounts: Map<string, number>
  repliedAt: Map<string, string>
  emailIntakes: EmailIntake[]
  officers?: PanelOfficer[]
}) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const pendingEmailCount = emailIntakes.filter(i => i.status === 'pending').length

  return (
    <>
      {/* Tab navigation */}
      <div className="mb-4 flex overflow-x-auto border-b border-brand-border sm:mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`-mb-px flex-shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors sm:px-5 ${
              activeTab === t.key
                ? 'border-brand-navy text-brand-navy'
                : 'border-transparent text-brand-muted hover:text-brand-navy'
            }`}
          >
            {t.label}
            {t.key === 'action' && actionCount > 0 && (
              <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {actionCount}
              </span>
            )}
            {t.key === 'cases' && (
              <span className="ml-2 text-brand-muted">({cases.length})</span>
            )}
            {t.key === 'email' && pendingEmailCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                {pendingEmailCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <EmbassyDashboard
          cases={cases}
          userFullName={userFullName}
          emirateName={emirateName}
          showEmirateSplit={showEmirateSplit}
          officers={officers}
        />
      )}

      {activeTab === 'action' && (
        <EmbassyActionCenter
          cases={cases}
          userFullName={userFullName}
          employerCounts={employerCounts}
          repliedAt={repliedAt}
        />
      )}

      {activeTab === 'cases' && (
        <EmbassyCasesList
          cases={cases}
          userFullName={userFullName}
        />
      )}

      {activeTab === 'email' && (
        <EmailIntakeQueue initialIntakes={emailIntakes} />
      )}
    </>
  )
}
