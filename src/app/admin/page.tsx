import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Clock, CheckCircle, XCircle, ImageIcon, Megaphone, Lightbulb } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: clientCount },
    // Pending by type
    { data: pendingPosts },
    { data: pendingCampaigns },
    { data: pendingInsights },
    // Approved/rejected counts across all types
    { count: approvedPostsCount },
    { count: approvedCampaignsCount },
    { count: approvedInsightsCount },
    { count: rejectedPostsCount },
    { count: rejectedCampaignsCount },
    { count: rejectedInsightsCount },
    // Recent activity from all types
    { data: recentPosts },
    { data: recentCampaigns },
    { data: recentInsights },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('id, title, scheduled_date, is_package, clients(name)').eq('status', 'pending').order('scheduled_date').limit(4),
    supabase.from('campaigns').select('id, title, objective, clients(name)').eq('status', 'pending').limit(3),
    supabase.from('insights').select('id, title, specialist_name, clients(name)').eq('status', 'pending').limit(3),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('insights').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('campaigns').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('insights').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('posts').select('id, title, status, reviewed_at, clients(name)').neq('status', 'pending').order('reviewed_at', { ascending: false }).limit(5),
    supabase.from('campaigns').select('id, title, status, reviewed_at, clients(name)').neq('status', 'pending').order('reviewed_at', { ascending: false }).limit(5),
    supabase.from('insights').select('id, title, status, reviewed_at, clients(name)').neq('status', 'pending').order('reviewed_at', { ascending: false }).limit(5),
  ])

  const totalPending = (pendingPosts?.length ?? 0) + (pendingCampaigns?.length ?? 0) + (pendingInsights?.length ?? 0)
  const totalApproved = (approvedPostsCount ?? 0) + (approvedCampaignsCount ?? 0) + (approvedInsightsCount ?? 0)
  const totalRejected = (rejectedPostsCount ?? 0) + (rejectedCampaignsCount ?? 0) + (rejectedInsightsCount ?? 0)

  // Merge and sort recent activity
  type ActivityItem = { id: string; title: string; status: string; reviewed_at: string | null; clientName: string | null; type: 'post' | 'campaign' | 'insight' }
  const recentActivity: ActivityItem[] = [
    ...(recentPosts ?? []).map((p) => ({ id: p.id, title: p.title, status: p.status, reviewed_at: p.reviewed_at, clientName: (p.clients as unknown as { name: string } | null)?.name ?? null, type: 'post' as const })),
    ...(recentCampaigns ?? []).map((c) => ({ id: c.id, title: c.title, status: c.status, reviewed_at: c.reviewed_at, clientName: (c.clients as unknown as { name: string } | null)?.name ?? null, type: 'campaign' as const })),
    ...(recentInsights ?? []).map((i) => ({ id: i.id, title: i.title, status: i.status, reviewed_at: i.reviewed_at, clientName: (i.clients as unknown as { name: string } | null)?.name ?? null, type: 'insight' as const })),
  ].sort((a, b) => {
    if (!a.reviewed_at) return 1
    if (!b.reviewed_at) return -1
    return new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime()
  }).slice(0, 8)

  const typeIcon = { post: ImageIcon, campaign: Megaphone, insight: Lightbulb }
  const typeLabel = { post: 'Post', campaign: 'Campanha', insight: 'Insight' }
  const typeHref = { post: '/admin/posts', campaign: '/admin/campaigns', insight: '/admin/insights' }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Visão geral das aprovações</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/admin/clients">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                  <Users className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{clientCount ?? 0}</p>
                  <p className="text-xs text-gray-500">Clientes ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/posts">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalPending}</p>
                  <p className="text-xs text-gray-500">Aguardando aprovação</p>
                </div>
              </div>
              {totalPending > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {(pendingPosts?.length ?? 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingPosts!.length} post{pendingPosts!.length !== 1 ? 's' : ''}</span>
                  )}
                  {(pendingCampaigns?.length ?? 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingCampaigns!.length} campanha{pendingCampaigns!.length !== 1 ? 's' : ''}</span>
                  )}
                  {(pendingInsights?.length ?? 0) > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">{pendingInsights!.length} insight{pendingInsights!.length !== 1 ? 's' : ''}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalApproved}</p>
                <p className="text-xs text-gray-500">Total aprovados</p>
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
                <p className="text-2xl font-bold text-gray-900">{totalRejected}</p>
                <p className="text-xs text-gray-500">Total rejeitados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending items — all types */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Aguardando aprovação</CardTitle>
              <Link href="/admin/posts" className="text-xs text-violet-600 hover:underline">Ver posts</Link>
            </div>
          </CardHeader>
          <CardContent>
            {totalPending === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Tudo em dia! Nenhum item pendente.</p>
            ) : (
              <div className="space-y-1">
                {/* Pending posts */}
                {pendingPosts?.map((post) => {
                  const Icon = ImageIcon
                  return (
                    <Link key={post.id} href={`/admin/posts/${post.id}`} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{post.title}</p>
                        <p className="text-xs text-gray-500">
                          {(post.clients as unknown as { name: string } | null)?.name}
                          {post.scheduled_date && ` · ${format(new Date(post.scheduled_date), "d MMM", { locale: ptBR })}`}
                        </p>
                      </div>
                      <StatusBadge status="pending" />
                    </Link>
                  )
                })}
                {/* Pending campaigns */}
                {pendingCampaigns?.map((campaign) => (
                  <Link key={campaign.id} href="/admin/campaigns" className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                      <Megaphone className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{campaign.title}</p>
                      <p className="text-xs text-gray-500">{(campaign.clients as unknown as { name: string } | null)?.name}</p>
                    </div>
                    <StatusBadge status="pending" />
                  </Link>
                ))}
                {/* Pending insights */}
                {pendingInsights?.map((insight) => (
                  <Link key={insight.id} href="/admin/insights" className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{insight.title}</p>
                      <p className="text-xs text-gray-500">{(insight.clients as unknown as { name: string } | null)?.name}</p>
                    </div>
                    <StatusBadge status="pending" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity — all types */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhuma atividade ainda</p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((item) => {
                  const Icon = typeIcon[item.type]
                  const href = typeHref[item.type]
                  return (
                    <Link key={`${item.type}-${item.id}`} href={item.type === 'post' ? `/admin/posts/${item.id}` : href} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        <p className="text-xs text-gray-500">
                          {item.clientName}
                          {item.reviewed_at && ` · ${format(new Date(item.reviewed_at), "d MMM", { locale: ptBR })}`}
                        </p>
                      </div>
                      <StatusBadge status={item.status as 'approved' | 'rejected' | 'pending'} />
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
