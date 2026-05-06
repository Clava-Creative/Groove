import { createClient } from '@/lib/supabase/server'
import ApprovalCard from '@/components/approval-card'
import { Lightbulb } from 'lucide-react'

export default async function ClientInsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('client_id').eq('auth_id', user.id).single()
  if (!profile?.client_id) return null

  const { data: insights } = await supabase
    .from('insights')
    .select('*')
    .eq('client_id', profile.client_id)
    .order('created_at', { ascending: false })

  const pendingCount = insights?.filter((i) => i.status === 'pending').length ?? 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-5 h-5 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
        </div>
        <p className="text-sm text-gray-500">
          {pendingCount > 0 ? `${pendingCount} aguardando aprovação` : 'Todos revisados'}
        </p>
      </div>

      {insights?.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum insight ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights?.map((insight) => (
            <ApprovalCard key={insight.id} item={insight} type="insight" />
          ))}
        </div>
      )}
    </div>
  )
}
