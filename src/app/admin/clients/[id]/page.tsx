import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
import StatusBadge from '@/components/status-badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: client }, { data: posts }, { data: campaigns }, { data: insights }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', params.id).single(),
    supabase.from('posts').select('*').eq('client_id', params.id).order('scheduled_date', { ascending: false }).limit(10),
    supabase.from('campaigns').select('*').eq('client_id', params.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('insights').select('*').eq('client_id', params.id).order('created_at', { ascending: false }).limit(5),
  ])

  if (!client) notFound()

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/admin/clients" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Clientes
        </Link>
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: client.primary_color ?? '#7c3aed' }}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Posts */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Posts</CardTitle>
              <Link href={`/admin/posts/new?client=${params.id}`}>
                <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-3.5 h-3.5" /> Novo post
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {posts?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhum post ainda</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {posts?.map((post) => (
                  <div key={post.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{post.title}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(post.scheduled_date), "d 'de' MMMM", { locale: ptBR })}
                      </p>
                    </div>
                    <StatusBadge status={post.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaigns */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Campanhas</CardTitle>
              <Link href={`/admin/campaigns/new?client=${params.id}`}>
                <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-3.5 h-3.5" /> Nova campanha
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {campaigns?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhuma campanha ainda</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {campaigns?.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{c.title}</p>
                      {c.objective && <p className="text-xs text-gray-400">{c.objective}</p>}
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Insights */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Insights</CardTitle>
              <Link href={`/admin/insights/new?client=${params.id}`}>
                <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-3.5 h-3.5" /> Novo insight
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {insights?.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhum insight ainda</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {insights?.map((insight) => (
                  <div key={insight.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                      {insight.specialist_name && (
                        <p className="text-xs text-gray-400">Por {insight.specialist_name}</p>
                      )}
                    </div>
                    <StatusBadge status={insight.status} />
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
