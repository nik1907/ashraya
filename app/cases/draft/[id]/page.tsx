import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AppHeader } from '@/components/AppHeader'
import { CaseForm } from '@/components/CaseForm'
import { requireProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export default async function DraftPage(props: { params: Promise<{ id: string }> }) {
  const profile = await requireProfile(['volunteer', 'tfa_admin'])
  const { id } = await props.params

  const supabase = await createClient()
  const { data: draft } = await supabase
    .from('case_drafts')
    .select('id, label, form_data')
    .eq('id', id)
    .single()

  if (!draft) notFound()

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">Resume draft</h1>
            {draft.label && (
              <p className="mt-0.5 text-sm text-brand-muted">{draft.label}</p>
            )}
          </div>
          <Link href="/dashboard" className="text-sm text-brand-navy-light underline">
            ← Back
          </Link>
        </div>
        <CaseForm
          draftId={draft.id}
          initialData={(draft.form_data as Record<string, string>) ?? {}}
        />
      </main>
    </div>
  )
}
