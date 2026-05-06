import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: clientCount },
    { data: pendingPosts },
    { data: pendingCampaigns },
    { data: pendingInsights },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*, clients(name)').eq('status', 'pending').order('scheduled_date').limit(5),
    supabase.from('campaigns').select('*, clients(name)').eq('status', 'pending').limit(5),
    supabase.from('insights').select('*, clients(name)').eq('status', 'pending').limit(5),
    supabase.from('posts').select('id, title, status, reviewed_at, clients(name)')
      .neq('status', 'pending').order('reviewed_at', { ascending: false }).limit(8),
  ])

  const totalPending = (pendingPosts?.length ?? 0) + (pendingCampaigns?.length ?? 0) + (pendingInsights?.length ?? 0)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral das aprovações pendentes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{clientCount ?? 0}</p>
                <p className="text-xs text-gray-500">Clientes ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalPending}</p>
                <p className="text-xs text-gray-500">Itens pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {recentActivity?.filter((a) => a.status === 'approved').length ?? 0}
                </p>
                <p className="text-xs text-gray-500">Aprovados recentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {recentActivity?.filter((a) => a.status === 'rejected').length ?? 0}
                </p>
                <p className="text-xs text-gray-500">Rejeitados recentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Pending Posts */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Posts pendentes</CardTitle>
              <Link href="/admin/posts" className="text-xs text-violet-600 hover:underline">Ver todos</Link>
            </div>
          </CardHeader>
          <CardContent>
            {pendingPosts?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhum post pendente</p>
            ) : (
              <div className="space-y-3">
                {pendingPosts?.map((post) => (
                  <Link key={post.id} href="/admin/posts" className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{post.title}</p>
                      <p className="text-xs text-gray-500">
                        {(post.clients as unknown as { name: string } | null)?.name} · {format(new Date(post.scheduled_date), "d MMM", { locale: ptBR })}
                      </p>
                    </div>
                    <StatusBadge status={post.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhuma atividade ainda</p>
            ) : (
              <div className="space-y-3">
                {recentActivity?.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.title}</p>
                      <p className="text-xs text-gray-500">
                        {(item.clients as unknown as { name: string } | null)?.name}
                        {item.reviewed_at && ` · ${format(new Date(item.reviewed_at), "d MMM", { locale: ptBR })}`}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
