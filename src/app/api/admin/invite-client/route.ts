import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  // Use service role to verify caller is admin (bypasses RLS)
  const { data: profile } = await admin
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { clientName, clientEmail, clientColor, email, name, password } = body

  if (!clientName || !email || !name || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  // Create client record using service role (bypasses RLS)
  const { data: newClient, error: clientError } = await admin
    .from('clients')
    .insert({ name: clientName, email: clientEmail ?? null, primary_color: clientColor ?? '#7c3aed' })
    .select()
    .single()

  if (clientError || !newClient) {
    return NextResponse.json({ error: clientError?.message ?? 'Erro ao criar cliente' }, { status: 500 })
  }

  // Create auth user
  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    await admin.from('clients').delete().eq('id', newClient.id)
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar usuário' }, { status: 500 })
  }

  // Create user profile
  const { error: profileError } = await admin.from('users').insert({
    auth_id: newUser.user.id,
    client_id: newClient.id,
    role: 'client',
    name,
    email,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    await admin.from('clients').delete().eq('id', newClient.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, clientId: newClient.id })
}
