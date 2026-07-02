import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Proxy to Sarvam AI speech-to-text (Saarika / Saaras).
 * Accepts: multipart/form-data { audio: Blob, language: e.g. 'en-IN' | 'hi-IN' | 'te-IN' | ... }
 * Returns: { transcript: string }
 *
 * Non-English source languages use saaras:v3 in translate mode → returns English directly.
 * English uses saarika:v2.5 with en-IN language code.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.SARVAM_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'STT not configured' }, { status: 503 })
  }

  const form = await req.formData()
  const audio = form.get('audio') as Blob | null
  const language = (form.get('language') as string | null) ?? 'en-IN'

  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: 'No audio' }, { status: 400 })
  }

  const isEnglish = language === 'en-IN' || language === 'en'

  const sarvamForm = new FormData()
  sarvamForm.append('file', audio, 'recording.webm')

  if (isEnglish) {
    sarvamForm.append('model', 'saarika:v2.5')
    sarvamForm.append('language_code', 'en-IN')
  } else {
    // saaras:v3 translate mode → directly outputs English transcript
    sarvamForm.append('model', 'saaras:v3')
    sarvamForm.append('mode', 'translate')
    sarvamForm.append('language_code', language)
  }

  try {
    const res = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: { 'api-subscription-key': apiKey },
      body: sarvamForm,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Sarvam STT error', res.status, err)
      return NextResponse.json({ error: 'STT failed' }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({ transcript: data.transcript ?? '' })
  } catch (err) {
    console.error('Sarvam STT request failed', err)
    return NextResponse.json({ error: 'STT failed' }, { status: 502 })
  }
}
