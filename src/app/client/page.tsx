import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function ClientDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('client_id, name, clients(name)')
    .eq('auth_id', user.id)
    .single()

  if (!profile?.client_id) return <div className="p-8 text-gray-500">Conta não configurada.</div>

  const clientId = profile.client_id

  const [
    { data: pendingPosts },
    { data: pendingCampaigns },
    { data: pendingInsights },
    { data: latestResults },
    { data: recentPosts },
  ] = await Promise.all([
    supabase.from('posts').select('*').eq('client_id', clientId).eq('status', 'pending').order('scheduled_date').limit(3),
    supabase.from('campaigns').select('*').eq('client_id', clientId).eq('status', 'pending').limit(3),
    supabase.from('insights').select('*').eq('client_id', clientId).eq('status', 'pending').limit(3),
    supabase.from('results').select('*').eq('client_id', clientId).order('created_at', { ascending: false }).limit(1),
    supabase.from('posts').select('*').eq('client_id', clientId).neq('status', 'pending').order('reviewed_at', { ascending: false }).limit(5),
  ])

  const totalPending = (pendingPosts?.length ?? 0) + (pendingCampaigns?.length ?? 0) + (pendingInsights?.length ?? 0)
  const latestResult = latestResults?.[0]
  const clientName = (profile.clients as unknown as { name: string } | null)?.name

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-sm text-gray-400 mb-1">Bem-vindo,</p>
        <h1 className="text-2xl font-bold text-gray-900">{clientName ?? profile.name}</h1>
      </div>

      {/* Pending banner */}
      {totalPending > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-900">
                {totalPending} {totalPending === 1 ? 'item pendente' : 'itens pendentes'} de aprovação
              </p>
              <p className="text-xs text-amber-600">Revise e aprove para liberar a publicação</p>
            </div>
          </div>
          <div className="flex gap-2">
            {(pendingPosts?.length ?? 0) > 0 && (
              <Link href="/client/calendar"><Button size="sm" variant="outline" className="text-amber-700 border-amber-200">Calendário</Button></Link>
            )}
            {(pendingCampaigns?.length ?? 0) > 0 && (
              <Link href="/client/campaigns"><Button size="sm" variant="outline" className="text-amber-700 border-amber-200">Campanhas</Button></Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        {latestResult && (
          <>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-gray-900">{latestResult.followers?.toLocaleString('pt-BR') ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-1">Seguidores</p>
                <p className="text-xs text-gray-400">{latestResult.period}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-gray-900">{latestResult.reach?.toLocaleString('pt-BR') ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-1">Alcance</p>
                <p className="text-xs text-gray-400">{latestResult.period}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6">
                <p className="text-2xl font-bold text-gray-900">{latestResult.roi != null ? `${latestResult.roi}%` : '—'}</p>
                <p className="text-xs text-gray-500 mt-1">ROI</p>
                <p className="text-xs text-gray-400">{latestResult.period}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Pending items */}
      {totalPending > 0 && (
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Aguardando sua aprovação</h2>
              <Link href="/client/calendar" className="text-xs text-violet-600 hover:underline flex items-center gap-1">
                Ver calendário <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {pendingPosts?.map((post) => (
                <Link key={post.id} href="/client/calendar" className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    {post.media_url ? (
                      <img src={post.media_url} alt={post.title} className="w-10 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-100" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{post.title}</p>
                      <p className="text-xs text-gray-400">{format(new Date(post.scheduled_date), "d 'de' MMMM", { locale: ptBR })}</p>
                    </div>
                  </div>
                  <StatusBadge status={post.status} />
                </Link>
              ))}
              {pendingInsights?.map((insight) => (
                <Link key={insight.id} href="/client/insights" className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                    {insight.specialist_name && <p className="text-xs text-gray-400">Por {insight.specialist_name}</p>}
                  </div>
                  <StatusBadge status={insight.status} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      {(recentPosts?.length ?? 0) > 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <h2 className="font-semibold text-gray-900 mb-4">Atividade recente</h2>
            <div className="space-y-2">
              {recentPosts?.map((post) => (
                <div key={post.id} className="flex items-center gap-3 py-2">
                  {post.status === 'approved' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{post.title}</p>
                  </div>
                  <StatusBadge status={post.status} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
