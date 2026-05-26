import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const clientId = params.id
  if (!clientId) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  // Verify caller is admin or operator
  const { data: profile } = await admin
    .from('users')
    .select('role, agency_id')
    .eq('auth_id', user.id)
    .single()

  if (!profile || !['admin', 'operator'].includes(profile.role)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Verify the client belongs to the operator's agency (or caller is admin)
  const { data: targetClient } = await admin
    .from('clients')
    .select('id, agency_id')
    .eq('id', clientId)
    .single()

  if (!targetClient) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  if (profile.role === 'operator' && targetClient.agency_id !== profile.agency_id) {
    return NextResponse.json({ error: 'Sem permissão para excluir este cliente' }, { status: 403 })
  }

  // ─── Cascade delete ───────────────────────────────────────────────────────

  // 1. Get all post/campaign/insight IDs for this client
  const [{ data: posts }, { data: campaigns }, { data: insights }] = await Promise.all([
    admin.from('posts').select('id').eq('client_id', clientId),
    admin.from('campaigns').select('id').eq('client_id', clientId),
    admin.from('insights').select('id').eq('client_id', clientId),
  ])

  const postIds = (posts ?? []).map((p) => p.id)
  const campaignIds = (campaigns ?? []).map((c) => c.id)
  const insightIds = (insights ?? []).map((i) => i.id)
  const allContentIds = [...postIds, ...campaignIds, ...insightIds]

  // 2. Delete notifications referencing this client's content
  if (allContentIds.length > 0) {
    await admin.from('notifications').delete().in('ref_id', allContentIds)
  }

  // 3. Delete post_items (children of posts)
  if (postIds.length > 0) {
    await admin.from('post_items').delete().in('post_id', postIds)
  }

  // 4. Delete posts, campaigns, insights, results
  await Promise.all([
    admin.from('posts').delete().eq('client_id', clientId),
    admin.from('campaigns').delete().eq('client_id', clientId),
    admin.from('insights').delete().eq('client_id', clientId),
    admin.from('results').delete().eq('client_id', clientId),
  ])

  // 5. Delete client user accounts (auth + users table)
  const { data: clientUsers } = await admin
    .from('users')
    .select('id, auth_id')
    .eq('client_id', clientId)

  if (clientUsers && clientUsers.length > 0) {
    await Promise.all(
      clientUsers.map(async (u) => {
        await admin.auth.admin.deleteUser(u.auth_id)
      })
    )
    await admin.from('users').delete().eq('client_id', clientId)
  }

  // 6. Delete the client itself
  const { error } = await admin.from('clients').delete().eq('id', clientId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
