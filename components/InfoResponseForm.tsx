'use client'

import { useRef, useState, useTransition } from 'react'
import { Paperclip, X } from 'lucide-react'

import { submitInfoResponse } from '@/app/cases/actions'

export function InfoResponseForm({ caseId }: { caseId: string }) {
  const [message,   setMessage]   = useState('')
  const [files,     setFiles]     = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [pending,   startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <p className="text-sm font-semibold text-green-800">Response sent to the embassy.</p>
        <p className="mt-0.5 text-xs text-green-700">
          They have been notified and will update the case once they review your information.
        </p>
      </div>
    )
  }

  function addFiles(incoming: FileList | null) {
    if (!incoming) return
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size))
      const fresh = Array.from(incoming).filter(f => !existing.has(f.name + f.size))
      return [...prev, ...fresh]
    })
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function handleSubmit() {
    if (!message.trim()) { setError('Please write a message before sending.'); return }
    setError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('case_id', caseId)
      fd.set('message', message.trim())
      for (const f of files) fd.append('files', f)
      const result = await submitInfoResponse(fd)
      if (result.ok) {
        setSubmitted(true)
      } else {
        setError(result.error ?? 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy">
        Provide the requested information
      </p>

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        rows={4}
        disabled={pending}
        className="w-full rounded-lg border border-brand-border px-3 py-2.5 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-brand-navy/30 disabled:opacity-60"
        placeholder="Type your response here. Be as specific as possible — include documents, dates, reference numbers, etc."
      />

      {/* File attachments */}
      <div>
        <button
          type="button"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-xs text-brand-muted hover:text-brand-navy disabled:opacity-50"
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
              <li key={i} className="flex items-center gap-2 text-xs text-brand-muted">
                <Paperclip size={11} className="shrink-0" />
                <span className="truncate">{f.name}</span>
                <span className="text-brand-muted/50">({Math.round(f.size / 1024)}KB)</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
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

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending || !message.trim()}
        className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-navy/90 disabled:opacity-40"
      >
        {pending ? 'Sending…' : 'Send to embassy'}
      </button>
    </div>
  )
}
