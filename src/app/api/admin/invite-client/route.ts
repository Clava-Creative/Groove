import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('users').select('role').eq('auth_id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { clientId, email, name, password } = await request.json()
  if (!clientId || !email || !name || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const admin = await createAdminClient()

  // Create auth user
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar usuário' }, { status: 500 })
  }

  // Create user profile
  const { error: profileError } = await admin.from('users').insert({
    auth_id: newUser.user.id,
    client_id: clientId,
    role: 'client',
    name,
    email,
  })

  if (profileError) {
    // Rollback auth user
    await admin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
