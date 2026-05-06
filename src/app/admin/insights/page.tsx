import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Lightbulb } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'

export default async function AdminInsightsPage() {
  const supabase = await createClient()
  const { data: insights } = await supabase
    .from('insights')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
          <p className="text-sm text-gray-500 mt-1">{insights?.length ?? 0} insights</p>
        </div>
        <Link href="/admin/insights/new">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Novo insight
          </Button>
        </Link>
      </div>

      {insights?.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum insight ainda</p>
            <Link href="/admin/insights/new">
              <Button className="mt-4 gap-2 bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4" /> Novo insight
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {insights?.map((insight) => (
            <Card key={insight.id} className="border-0 shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{insight.title}</p>
                      <StatusBadge status={insight.status} />
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-2">{insight.body}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {(insight.clients as unknown as { name: string } | null)?.name}
                      {insight.specialist_name && ` · Por ${insight.specialist_name}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
