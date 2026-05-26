import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SwipeReviewStack from '@/components/swipe-review-stack'
import type { SwipeItem } from '@/components/swipe-review-stack'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function SwipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('client_id')
    .eq('auth_id', user.id)
    .single()

  if (!profile?.client_id) redirect('/client')

  const cid = profile.client_id

  // Fetch all pending items
  const [{ data: posts }, { data: campaigns }, { data: insights }] = await Promise.all([
    supabase.from('posts').select('id, title, caption, media_url, media_type, scheduled_date').eq('client_id', cid).eq('status', 'pending').eq('is_package', false),
    supabase.from('campaigns').select('id, title, description, objective').eq('client_id', cid).eq('status', 'pending'),
    supabase.from('insights').select('id, title, body, specialist_name').eq('client_id', cid).eq('status', 'pending'),
  ])

  const items: SwipeItem[] = [
    ...(posts ?? []).map((p) => ({ ...p, type: 'post' as const })),
    ...(campaigns ?? []).map((c) => ({ ...c, type: 'campaign' as const })),
    ...(insights ?? []).map((i) => ({ ...i, type: 'insight' as const })),
  ]

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 p-8 text-center bg-gray-50">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">Nada pendente!</p>
          <p className="text-sm text-gray-500 mt-1">Todos os itens já foram revisados</p>
        </div>
        <Link href="/client">
          <Button className="bg-violet-600 hover:bg-violet-700">Voltar ao início</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <SwipeReviewStack items={items} clientId={cid} />
    </div>
  )
}
