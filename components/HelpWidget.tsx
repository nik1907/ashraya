'use client'

import { ChevronDown, MessageCircleQuestion, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/types'

type QA = { q: string; a: string }
type Category = { title: string; items: QA[] }

// ── Shared ─────────────────────────────────────────────────────────────────
const GETTING_STARTED: Category = {
  title: 'Getting started',
  items: [
    {
      q: 'What is Ashraya?',
      a: 'Ashraya is a community welfare case-reporting tool built by Telangana Friends Association. It lets community volunteers report welfare cases for Indian nationals in the UAE and automatically forwards a formal summary to the relevant Indian mission.',
    },
    {
      q: 'I forgot my password.',
      a: 'On the sign-in screen click "Forgot password?", enter your email, and a reset link will be sent. Check your spam folder if it does not arrive within a few minutes.',
    },
    {
      q: 'What do the case statuses mean?',
      a: 'Submitted → saved. Sent → emailed to the mission. Acknowledged → the mission has seen it. In progress → actively being worked on. Resolved / Closed → completed.',
    },
    {
      q: 'Who can I contact for help?',
      a: 'For account issues contact your TFA admin. For technical problems write to the TFA admin team who manage the system.',
    },
  ],
}

// ── Volunteer ───────────────────────────────────────────────────────────────
const VOLUNTEER_HELP: Category = {
  title: 'Submitting & tracking cases',
  items: [
    {
      q: 'How do I report a case?',
      a: 'Click "Report a case" on your dashboard. Pick the case type, fill in the affected person\'s details and a description, attach any documents, and click Submit.',
    },
    {
      q: 'What happens after I submit?',
      a: 'Ashraya generates a case ID, drafts a formal summary, and emails it to the relevant Indian mission. The reporter also receives an automatic confirmation email with the case reference and a copy of the summary.',
    },
    {
      q: 'Which mission receives the email?',
      a: 'Abu Dhabi cases go to the Embassy of India, Abu Dhabi. Cases in other emirates (Dubai, Sharjah, etc.) go to the Consulate General of India, Dubai — with Abu Dhabi copied as the head mission.',
    },
    {
      q: 'What files can I attach?',
      a: 'Passport copies, medical reports, employment contracts, photos — any document relevant to the case. Maximum 5 MB per file.',
    },
    {
      q: 'Why are numbers not allowed in name fields?',
      a: 'The name fields accept letters only (including Unicode / Indian scripts) to prevent data-entry errors — for example "nickel1234" would be rejected.',
    },
    {
      q: 'Will the reporter get a confirmation?',
      a: 'Yes — if a reporter email is entered in the form, they receive a confirmation with the case reference number and a summary of what was forwarded to the embassy.',
    },
    {
      q: 'Can I track cases I submitted?',
      a: 'Yes — "My reported cases" on your dashboard lists all cases you have submitted, with their current status.',
    },
  ],
}

// ── TFA Admin ───────────────────────────────────────────────────────────────
const ADMIN_HELP: Category = {
  title: 'Admin tasks',
  items: [
    {
      q: 'How do I approve a new volunteer?',
      a: 'On your dashboard, the "Volunteers awaiting approval" section lists new sign-ups. Click Approve to activate their account. You can also manage all users under "Team members".',
    },
    {
      q: 'How do I change someone\'s role?',
      a: 'In "Team members", use the Role dropdown next to the person\'s name (Volunteer / TFA Admin / Embassy — Abu Dhabi / Consulate General — Dubai / Ambassador / Mission Official) and save.',
    },
    {
      q: 'How do I update a case\'s status?',
      a: 'Open any case and use the Status control at the top. The change is logged in the case history with a timestamp.',
    },
    {
      q: 'The embassy email failed — can I resend?',
      a: 'Yes. Open the case and click "Re-send email". This sends the formal summary again to the routed mission.',
    },
    {
      q: 'How are cases routed to missions?',
      a: 'Abu Dhabi cases → Embassy of India, Abu Dhabi only. All other emirates → Consulate General of India, Dubai (Abu Dhabi copied). Routing is based on the emirate field in the case.',
    },
    {
      q: 'Can I see all cases across every organisation?',
      a: 'Yes — TFA admins have full visibility across all cases submitted by any organisation and any volunteer.',
    },
    {
      q: 'How do I suspend or remove a user?',
      a: 'In "Team members", change the user\'s status to Suspended. Contact TFA leadership if a permanent removal is needed.',
    },
  ],
}

// ── Embassy (Abu Dhabi & Dubai) ─────────────────────────────────────────────
const EMBASSY_HELP: Category = {
  title: 'Viewing & managing cases',
  items: [
    {
      q: 'Which cases are visible to me?',
      a: 'The Embassy of India, Abu Dhabi sees all cases across the UAE. The Consulate General of India, Dubai sees only cases routed to Dubai (i.e. non-Abu Dhabi emirates).',
    },
    {
      q: 'What information is shown on each case?',
      a: 'You see the formal case summary (the same text emailed to your mission), structured details (case type, location, status), case history, and any attached documents. The volunteer\'s raw draft is not shown.',
    },
    {
      q: 'Can I update a case\'s status?',
      a: 'Yes — you can move cases to Acknowledged, In progress, Resolved, or Closed for cases within your mission.',
    },
    {
      q: 'How do I open attachments?',
      a: 'On the case page, click the document links under "Attachments". They are secure, time-limited download links — they expire after a short period for security.',
    },
    {
      q: 'Can I search or filter cases?',
      a: 'Yes — use the search bar on your dashboard to filter by keyword, case type, status, or date range.',
    },
    {
      q: 'Who submitted this case?',
      a: 'Each case shows the submitting volunteer\'s organisation and the submission date. For further detail on a submitter, contact the TFA admin team.',
    },
  ],
}

// ── Ambassador ──────────────────────────────────────────────────────────────
const AMBASSADOR_HELP: Category = {
  title: 'Ambassador overview',
  items: [
    {
      q: 'What is my access in Ashraya?',
      a: 'As Ambassador you have full visibility across all welfare cases in both Abu Dhabi and Dubai. You can monitor trends, review individual cases, update statuses, and use the AI briefing for a high-level picture.',
    },
    {
      q: 'What is the AI briefing?',
      a: 'The AI briefing provides a plain-language summary of patterns across recent cases — top issue types, urgent open cases, and geographic distribution — so you can get a fast strategic picture without reading every file.',
    },
    {
      q: 'Can I update case statuses?',
      a: 'Yes — you can move any case to Acknowledged, In progress, Resolved, or Closed across both missions.',
    },
    {
      q: 'How do I open attachments?',
      a: 'On any case page, click the document links under "Attachments". They are secure, time-limited download links.',
    },
    {
      q: 'Who submitted a particular case?',
      a: 'Each case shows the submitting volunteer\'s organisation and date. For further detail on a specific submitter, contact the TFA admin team.',
    },
    {
      q: 'How often is the case data updated?',
      a: 'Cases appear in real time — as soon as a volunteer submits, the case is visible on your dashboard.',
    },
  ],
}

// ── IFS Officer ─────────────────────────────────────────────────────────────
const IFS_HELP: Category = {
  title: 'For IFS officers',
  items: [
    {
      q: 'What can I access in Ashraya?',
      a: 'As an IFS officer you have full visibility of all welfare cases across the UAE — both Abu Dhabi and Dubai — along with case history, attachments, and formal summaries.',
    },
    {
      q: 'What does the formal summary contain?',
      a: 'The formal summary is an AI-drafted structured brief — case type, affected individual\'s details, situation description, and emirate. It is the exact text emailed to the mission.',
    },
    {
      q: 'Can I update or close cases?',
      a: 'Yes — you can update case status (Acknowledged, In progress, Resolved, Closed) as needed.',
    },
    {
      q: 'How do I view attachments?',
      a: 'On any case page, click the document links under "Attachments". They are secure, time-limited download links.',
    },
    {
      q: 'Can I search across all cases?',
      a: 'Yes — use the search bar and filters on your dashboard to find cases by keyword, type, emirate, or status.',
    },
  ],
}

// ── Role → categories map ───────────────────────────────────────────────────
function categoriesForRole(role: Role | null): Category[] {
  switch (role) {
    case 'volunteer':      return [VOLUNTEER_HELP, GETTING_STARTED]
    case 'tfa_admin':      return [ADMIN_HELP, GETTING_STARTED]
    case 'ambassador':     return [AMBASSADOR_HELP, GETTING_STARTED]
    case 'ifs_officer':    return [IFS_HELP, GETTING_STARTED]
    case 'embassy_abu_dhabi':
    case 'embassy_dubai':  return [EMBASSY_HELP, GETTING_STARTED]
    default:               return [GETTING_STARTED]
  }
}

function footerText(role: Role | null): string {
  if (!role)                                        return 'Sign in to see role-specific guidance.'
  if (role === 'tfa_admin')                         return 'Still stuck? Contact TFA leadership.'
  if (role === 'ambassador' || role === 'ifs_officer') return 'For system issues, contact the TFA admin team.'
  return 'Still stuck? Contact your TFA admin.'
}

// ── Component ───────────────────────────────────────────────────────────────
export function HelpWidget() {
  const [open, setOpen]     = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [role, setRole]     = useState<Role | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.role) setRole(data.role as Role)
        })
    })
  }, [])

  const categories = categoriesForRole(role)

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Help"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-navy-hover"
      >
        {open ? <X size={24} /> : <MessageCircleQuestion size={26} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex max-h-[70vh] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-card shadow-2xl">
          <div className="tricolour" />
          <div className="bg-brand-navy px-4 py-3 text-white">
            <p className="font-semibold">Ashraya Help</p>
            <p className="text-xs text-white/70">Tap a question to see the answer.</p>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {categories.map((cat) => (
              <div key={cat.title} className="mb-4">
                <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-brand-saffron">
                  {cat.title}
                </p>
                <div className="space-y-1">
                  {cat.items.map((item) => {
                    const id = cat.title + item.q
                    const isOpen = active === id
                    return (
                      <div key={id} className="overflow-hidden rounded-lg border border-brand-border">
                        <button
                          onClick={() => setActive(isOpen ? null : id)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-brand-navy hover:bg-brand-navy/5"
                        >
                          {item.q}
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-brand-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isOpen && (
                          <p className="border-t border-brand-border bg-brand-navy/5 px-3 py-2 text-sm leading-relaxed text-brand-navy">
                            {item.a}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <p className="px-1 pb-1 text-center text-xs text-brand-muted">
              {footerText(role)}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
