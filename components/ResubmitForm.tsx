'use client'

import { useRef, useState, useTransition } from 'react'
import { Paperclip, X } from 'lucide-react'

export function ResubmitForm({
  caseId,
  adminReturnNote,
  resubmitAction,
}: {
  caseId: string
  adminReturnNote: string
  resubmitAction: (fd: FormData) => Promise<void>
}) {
  const [note,      setNote]      = useState('')
  const [files,     setFiles]     = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [pending,   startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (submitted) {
    return (
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-sm font-semibold text-blue-800">Submitted for admin review.</p>
        <p className="mt-0.5 text-xs text-blue-700">
          An admin will review your case and forward it to the Embassy if everything looks good.
          You will receive an email once it has been processed.
        </p>
      </div>
    )
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      return [...prev, ...Array.from(list).filter(f => !existing.has(f.name + f.size))]
    })
  }

  function handleSubmit() {
    startTransition(async () => {
      const fd = new FormData()
      fd.set('case_id', caseId)
      fd.set('volunteer_note', note.trim())
      for (const f of files) fd.append('resubmit_files', f)
      await resubmitAction(fd)
      setSubmitted(true)
    })
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-800">Action required before Embassy notification</p>
      <p className="mt-1 text-sm text-amber-700">{adminReturnNote}</p>

      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-amber-800">
            Describe what you&apos;ve updated{' '}
            <span className="font-normal text-amber-600">(optional — helps the admin review faster)</span>
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            disabled={pending}
            placeholder="e.g. Added the employer's phone number and updated the incident date…"
            className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-brand-navy placeholder:text-brand-muted/60 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
          />
        </div>

        {/* File attachments */}
        <div>
          <button
            type="button"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 disabled:opacity-50"
          >
            <Paperclip size={13} />
            Attach supporting documents
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => addFiles(e.target.files)}
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-amber-700">
                  <Paperclip size={11} className="shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-amber-500">({Math.round(f.size / 1024)}KB)</span>
                  <button
                    type="button"
                    onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="ml-auto shrink-0 text-red-400 hover:text-red-600"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          disabled={pending}
          onClick={handleSubmit}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          {pending ? 'Submitting…' : 'I\'ve updated the case — resubmit for review'}
        </button>
      </div>
    </div>
  )
}
