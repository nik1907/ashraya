'use client'

import { useState } from 'react'

import { EmbassyCasesList } from '@/components/EmbassyCasesList'
import { EmbassyActionCenter } from '@/components/dashboard/EmbassyActionCenter'
import { EmbassyDashboard } from '@/components/dashboard/EmbassyDashboard'
import type { PanelCase } from '@/components/dashboard/CaseSidePanel'

type Tab = 'overview' | 'action' | 'cases'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Command Overview' },
  { key: 'action',   label: 'Action Center' },
  { key: 'cases',    label: 'Case Registry' },
]

export function EmbassyTabs({
  cases,
  userFullName,
  emirateName,
  showEmirateSplit,
  actionCount,
  employerCounts,
  repliedAt,
}: {
  cases: PanelCase[]
  userFullName: string
  emirateName: string
  showEmirateSplit: boolean
  actionCount: number
  employerCounts: Map<string, number>
  repliedAt: Map<string, string>
}) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

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
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <EmbassyDashboard
          cases={cases}
          userFullName={userFullName}
          emirateName={emirateName}
          showEmirateSplit={showEmirateSplit}
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
    </>
  )
}
