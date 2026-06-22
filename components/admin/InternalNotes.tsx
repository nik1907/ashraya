'use client'

import { addCaseNote } from '@/app/admin/actions'
import { SubmitButton } from '@/components/SubmitButton'

type CaseNote = {
  id: string
  body: string
  created_at: string
  author: { full_name: string | null } | null
}

interface Props {
  caseId: string
  notes: CaseNote[]
}

function formatNoteDate(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate()
  const month = d.toLocaleString('en-AE', { month: 'short' })
  const time = d.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${day} ${month} · ${time}`
}

export function InternalNotes({ caseId, notes }: Props) {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
      <h2 className="mb-0.5 flex items-center gap-2 text-sm font-semibold text-amber-900">
        🔒 Staff Notes
      </h2>
      <p className="mb-4 text-xs text-amber-700">Only visible to admin and embassy staff</p>

      {notes.length === 0 ? (
        <p className="mb-4 text-xs text-amber-700/70 italic">No staff notes yet</p>
      ) : (
        <ol className="mb-4 space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-amber-200 bg-white px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">
                  {note.author?.full_name ?? 'Unknown'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatNoteDate(note.created_at)}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{note.body}</p>
            </li>
          ))}
        </ol>
      )}

      <form action={addCaseNote} className="flex flex-col gap-2">
        <input type="hidden" name="case_id" value={caseId} />
        <textarea
          name="body"
          rows={2}
          placeholder="Add a private note…"
          required
          className="w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        <div className="flex justify-end">
          <SubmitButton
            pendingText="Saving…"
            className="rounded border border-amber-300 bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-200"
          >
            Add note
          </SubmitButton>
        </div>
      </form>
    </section>
  )
}
