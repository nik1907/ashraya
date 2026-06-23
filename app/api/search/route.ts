import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return NextResponse.json([])

  try {
    const { data } = await supabase
      .from('cases')
      .select('id, case_id, case_type, status, name')
      .or(`case_id.ilike.%${q}%,name.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(8)
    return NextResponse.json(data ?? [])
  } catch {
    return NextResponse.json([])
  }
}
