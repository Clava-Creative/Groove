import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { name, email } = body

  if (!name) {
    return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  }

  const { data: agency, error } = await admin
    .from('agencies')
    .insert({ name, email: email ?? null })
    .select()
    .single()

  if (error || !agency) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar agência' }, { status: 500 })
  }

  return NextResponse.json({ success: true, agencyId: agency.id })
}
