'use client'

import { assignCase } from '@/app/admin/actions'
import { SubmitButton } from '@/components/SubmitButton'

interface Props {
  caseId: string
  currentAssignedTo: string | null
  currentAssignedName: string | null
  teamMembers: Array<{ id: string; full_name: string | null }>
}

export function CaseAssignSelect({
  caseId,
  currentAssignedTo,
  currentAssignedName,
  teamMembers,
}: Props) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-3 text-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
        Assigned to
      </p>

      {currentAssignedTo && currentAssignedName && (
        <span className="mb-2 inline-flex items-center rounded-full border border-brand-border bg-white px-2.5 py-0.5 text-xs font-medium text-brand-navy">
          {currentAssignedName}
        </span>
      )}
      {!currentAssignedTo && (
        <span className="mb-2 inline-flex items-center rounded-full border border-brand-border bg-white px-2.5 py-0.5 text-xs text-brand-muted">
          Unassigned
        </span>
      )}

      <form action={assignCase} className="mt-2 flex items-center gap-2">
        <input type="hidden" name="case_id" value={caseId} />

        <select
          name="assigned_to"
          defaultValue={currentAssignedTo ?? ''}
          onChange={(e) => {
            const option = e.target.options[e.target.selectedIndex]
            const hiddenInput = e.target.form?.elements.namedItem('assigned_name') as HTMLInputElement | null
            if (hiddenInput) hiddenInput.value = option.dataset.name ?? ''
          }}
          className="flex-1 rounded border border-brand-border bg-white px-2 py-1 text-sm text-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy/30"
        >
          <option value="" data-name="">— Unassigned —</option>
          {teamMembers.map((m) => (
            <option key={m.id} value={m.id} data-name={m.full_name ?? ''}>
              {m.full_name ?? 'Unknown'}
            </option>
          ))}
        </select>

        {/* Hidden field to carry the selected name to the server action */}
        <input
          type="hidden"
          name="assigned_name"
          defaultValue={currentAssignedName ?? ''}
        />

        <SubmitButton
          pendingText="Saving…"
          className="rounded border border-brand-border px-3 py-1 text-sm text-brand-navy transition-colors hover:bg-brand-navy/5"
        >
          Assign
        </SubmitButton>
      </form>
    </div>
  )
}
