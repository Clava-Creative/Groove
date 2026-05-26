import { createClient } from '@/lib/supabase/server'
import ApprovalCard from '@/components/approval-card'
import SendIdeaButton from '@/components/send-idea-button'
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

  // Split: staff insights go through approval flow; client ideas are display-only
  const staffInsights = insights?.filter((i) => (i as unknown as { source?: string }).source !== 'client') ?? []
  const clientIdeas = insights?.filter((i) => (i as unknown as { source?: string }).source === 'client') ?? []
  const pendingCount = staffInsights.filter((i) => i.status === 'pending').length

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-violet-600" />
            <h1 className="text-2xl font-bold text-gray-900">Insights</h1>
          </div>
          <SendIdeaButton clientId={profile.client_id} />
        </div>
        <p className="text-sm text-gray-500">
          {pendingCount > 0 ? `${pendingCount} aguardando aprovação` : 'Todos revisados'}
        </p>
      </div>

      {insights?.length === 0 ? (
        <div className="text-center py-16">
          <Lightbulb className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum insight ainda</p>
          <p className="text-xs text-gray-400 mt-1">Use o botão acima para enviar uma ideia para a equipe</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Staff insights — have approval flow */}
          {staffInsights.length > 0 && (
            <div className="space-y-3">
              {clientIdeas.length > 0 && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Da sua equipe</p>
              )}
              {staffInsights.map((insight) => (
                <ApprovalCard key={insight.id} item={insight} type="insight" clientId={profile.client_id} />
              ))}
            </div>
          )}

          {/* Client ideas — display only */}
          {clientIdeas.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Suas ideias enviadas</p>
              {clientIdeas.map((idea) => (
                <div key={idea.id} className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-sm">{idea.title}</p>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-200 text-violet-700">
                          Sua ideia
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{idea.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
