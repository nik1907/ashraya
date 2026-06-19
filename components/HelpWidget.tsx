'use client'

import { ChevronDown, MessageCircleQuestion, X } from 'lucide-react'
import { useState } from 'react'

type QA = { q: string; a: string }
type Category = { title: string; items: QA[] }

const CATEGORIES: Category[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'What is Ashraya?',
        a: 'Ashraya is a community welfare case-reporting tool by Telangana Friends Association. It helps report cases of Indian nationals in distress in the UAE — and forwards a formal summary to the relevant Indian mission (Embassy, Abu Dhabi or Consulate, Dubai).',
      },
      {
        q: 'How do I create an account?',
        a: 'On the sign-in screen click "Need an account? Sign up", choose your organisation, and enter your name, email and a password. A TFA admin then activates your account.',
      },
      {
        q: 'My account says "pending approval" — what now?',
        a: 'Every new account must be activated by a TFA admin before you can submit or view cases. Please contact your TFA admin; once approved, refresh the page.',
      },
      {
        q: 'I forgot my password.',
        a: 'On the sign-in screen click "Forgot password?", enter your email, and you will receive a link to set a new password. Check your spam folder if it does not arrive in a few minutes.',
      },
      {
        q: 'What are the different roles?',
        a: 'Volunteer — reports and tracks cases. TFA Admin — manages all cases and the team. Embassy — views cases routed to their mission. You are given a role by a TFA admin.',
      },
    ],
  },
  {
    title: 'For volunteers',
    items: [
      {
        q: 'How do I report a case?',
        a: 'Sign in, click "Report a case", pick the case type, fill in the affected person\'s details and a description, attach any documents, and click Submit.',
      },
      {
        q: 'What happens after I submit?',
        a: 'Ashraya generates a case ID, writes a formal summary, and automatically emails it to the relevant Indian mission. The case then appears in "My reported cases".',
      },
      {
        q: 'Can I attach documents?',
        a: 'Yes — in the "Documents" section of the form you can attach passport copies, medical reports, and other supporting files.',
      },
      {
        q: 'Will I get a copy of what was sent?',
        a: 'If you enter your email in the "Reported by" section, you are copied (CC) on the email sent to the mission, so you have a record.',
      },
      {
        q: 'What do the case statuses mean?',
        a: 'Submitted → saved. Sent → emailed to the mission. Acknowledged → the mission has seen it. In progress → being worked on. Resolved / Closed → completed.',
      },
    ],
  },
  {
    title: 'For TFA admins',
    items: [
      {
        q: 'How do I approve a new volunteer?',
        a: 'On the admin dashboard, the "Volunteers awaiting approval" box lists new sign-ups — click Approve. You can also manage everyone under "Team members".',
      },
      {
        q: 'How do I give someone the admin or embassy role?',
        a: 'In "Team members", change the person\'s Role dropdown (Volunteer / TFA Admin / Embassy — Abu Dhabi / Consulate — Dubai) and click Save.',
      },
      {
        q: 'How do I change a case\'s status?',
        a: 'Open any case and use the Status control at the top to update it. The change is recorded in the case\'s history.',
      },
      {
        q: 'An email did not reach the embassy — can I resend?',
        a: 'Yes. Open the case and click "Re-send email". It will send the formal summary again to the routed mission.',
      },
      {
        q: 'How are cases routed to the missions?',
        a: 'Abu Dhabi cases go to the Abu Dhabi mission only. "Other emirates" cases go to Dubai, with Abu Dhabi copied (as the head mission).',
      },
    ],
  },
  {
    title: 'For the embassy / consulate',
    items: [
      {
        q: 'Which cases can I see?',
        a: 'The Abu Dhabi mission sees all cases across the UAE. The Dubai consulate sees only cases routed to Dubai.',
      },
      {
        q: 'Do I see the volunteer\'s raw notes?',
        a: 'No. You see the formal case summary (the same text emailed to you), plus the structured details and any attachments — not the volunteer\'s original draft.',
      },
      {
        q: 'Can I update a case?',
        a: 'Yes — you can change a case\'s status (for example to Acknowledged, In progress, or Resolved) for cases within your mission.',
      },
      {
        q: 'How do I open the attachments?',
        a: 'On a case page, click the document links under "Attachments". They are secure, time-limited download links.',
      },
    ],
  },
]

export function HelpWidget() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Help"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-navy-hover"
      >
        {open ? <X size={24} /> : <MessageCircleQuestion size={26} />}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex max-h-[70vh] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-brand-border bg-brand-card shadow-2xl">
          <div className="tricolour" />
          <div className="bg-brand-navy px-4 py-3 text-white">
            <p className="font-semibold">Ashraya Help</p>
            <p className="text-xs text-white/70">
              Tap a question to see the answer.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.title} className="mb-4">
                <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-brand-saffron">
                  {cat.title}
                </p>
                <div className="space-y-1">
                  {cat.items.map((item) => {
                    const id = cat.title + item.q
                    const isOpen = active === id
                    return (
                      <div
                        key={id}
                        className="overflow-hidden rounded-lg border border-brand-border"
                      >
                        <button
                          onClick={() => setActive(isOpen ? null : id)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm font-medium text-brand-navy hover:bg-brand-navy/5"
                        >
                          {item.q}
                          <ChevronDown
                            size={16}
                            className={`shrink-0 text-brand-muted transition-transform ${
                              isOpen ? 'rotate-180' : ''
                            }`}
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
              Still stuck? Contact your TFA admin.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
