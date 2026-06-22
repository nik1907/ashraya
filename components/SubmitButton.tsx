'use client'

import { useFormStatus } from 'react-dom'

/**
 * Drop-in replacement for any <button type="submit"> inside a form with a
 * server action. Automatically shows a spinner + pending text while the
 * action is in flight — no extra state needed in the parent.
 */
export function SubmitButton({
  children,
  pendingText = 'Processing…',
  className,
  disabled,
  formAction,
}: {
  children: React.ReactNode
  pendingText?: string
  className?: string
  disabled?: boolean
  formAction?: (formData: FormData) => void | Promise<void>
}) {
  const { pending } = useFormStatus()
  const busy = pending || disabled === true

  return (
    <button
      type="submit"
      disabled={busy}
      className={className}
      formAction={formAction as never}
      style={{ opacity: busy ? 0.65 : undefined, cursor: busy ? 'not-allowed' : undefined }}
    >
      {pending ? (
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText}
        </span>
      ) : children}
    </button>
  )
}
