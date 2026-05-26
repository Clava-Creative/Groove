import { createClient } from '@/lib/supabase/server'
import { CalendarDays, ImageIcon, Package2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import StatusBadge from '@/components/status-badge'

export default async function AdminCalendarPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title, status, scheduled_date, is_package, clients(name, primary_color)')
    .order('scheduled_date', { ascending: true })

  // Group by month
  const byMonth: Record<string, typeof posts> = {}
  posts?.forEach((post) => {
    const key = format(new Date(post.scheduled_date), 'MMMM yyyy', { locale: ptBR })
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key]!.push(post)
  })

  const pendingCount = posts?.filter((p) => p.status === 'pending').length ?? 0
  const totalPosts = posts?.length ?? 0

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-5 h-5 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-900">Calendário</h1>
        </div>
        <p className="text-sm text-gray-500">
          {pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? 'post aguardando' : 'posts aguardando'} aprovação`
            : totalPosts > 0
            ? 'Todos os posts revisados'
            : 'Nenhum post agendado'}
        </p>
      </div>

      {totalPosts === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum post agendado</p>
          <Link href="/admin/posts/new" className="text-sm text-violet-600 hover:underline mt-1 inline-block">
            Criar primeiro post
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byMonth).map(([month, monthPosts]) => (
            <div key={month}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 capitalize">
                {month}
                <span className="ml-2 text-gray-300 font-normal normal-case">({monthPosts?.length} post{(monthPosts?.length ?? 0) !== 1 ? 's' : ''})</span>
              </h2>
              <div className="grid grid-cols-1 gap-2">
                {monthPosts?.map((post) => {
                  const client = post.clients as unknown as { name: string; primary_color: string | null } | null
                  return (
                    <Link
                      key={post.id}
                      href={`/admin/posts/${post.id}`}
                      className="group flex items-center gap-4 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm hover:shadow-md hover:border-violet-100 transition-all"
                    >
                      {/* Day badge */}
                      <div className="shrink-0 w-10 text-center">
                        <p className="text-xl font-bold text-gray-800 leading-none">
                          {format(new Date(post.scheduled_date), 'd')}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase">
                          {format(new Date(post.scheduled_date), 'EEE', { locale: ptBR })}
                        </p>
                      </div>

                      {/* Separator */}
                      <div className="w-px h-10 bg-gray-100 shrink-0" />

                      {/* Icon */}
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                        {post.is_package ? (
                          <Package2 className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-gray-400" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate group-hover:text-violet-700 transition-colors">
                          {post.title}
                        </p>
                        {client && (
                          <span
                            className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: client.primary_color ?? '#7c3aed' }}
                          >
                            {client.name}
                          </span>
                        )}
                      </div>

                      <StatusBadge status={post.status} />
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
