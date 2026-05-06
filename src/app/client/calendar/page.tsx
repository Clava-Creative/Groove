import { createClient } from '@/lib/supabase/server'
import ApprovalCard from '@/components/approval-card'
import { CalendarDays } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function ClientCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('client_id').eq('auth_id', user.id).single()
  if (!profile?.client_id) return null

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('client_id', profile.client_id)
    .order('scheduled_date', { ascending: true })

  // Group by month
  const byMonth: Record<string, typeof posts> = {}
  posts?.forEach((post) => {
    const key = format(new Date(post.scheduled_date), 'MMMM yyyy', { locale: ptBR })
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key]!.push(post)
  })

  const pendingCount = posts?.filter((p) => p.status === 'pending').length ?? 0

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-5 h-5 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-900">Calendário de publicações</h1>
        </div>
        <p className="text-sm text-gray-500">
          {pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? 'post aguardando' : 'posts aguardando'} aprovação` : 'Todos os posts revisados'}
        </p>
      </div>

      {posts?.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum post publicado ainda</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byMonth).map(([month, monthPosts]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 capitalize">
                {month}
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {monthPosts?.map((post) => (
                  <ApprovalCard key={post.id} item={post} type="post" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
