import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp, Users, MousePointerClick, ShoppingCart } from 'lucide-react'

export default async function ClientResultsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('client_id').eq('auth_id', user.id).single()
  if (!profile?.client_id) return null

  const { data: results } = await supabase
    .from('results')
    .select('*')
    .eq('client_id', profile.client_id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-violet-600" />
          <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
        </div>
        <p className="text-sm text-gray-500">Acompanhamento das métricas por período</p>
      </div>

      {results?.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum resultado cadastrado ainda</p>
          <p className="text-xs text-gray-400 mt-1">A Clava irá adicionar as métricas em breve</p>
        </div>
      ) : (
        <div className="space-y-6">
          {results?.map((result) => (
            <div key={result.id}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {result.period}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-violet-400" />
                      <p className="text-xs text-gray-400 font-medium">Seguidores</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {result.followers != null ? result.followers.toLocaleString('pt-BR') : '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <p className="text-xs text-gray-400 font-medium">Alcance</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {result.reach != null ? result.reach.toLocaleString('pt-BR') : '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <MousePointerClick className="w-4 h-4 text-amber-400" />
                      <p className="text-xs text-gray-400 font-medium">Cliques</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {result.clicks != null ? result.clicks.toLocaleString('pt-BR') : '—'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-400" />
                      <p className="text-xs text-gray-400 font-medium">Conversões</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {result.conversions != null ? result.conversions.toLocaleString('pt-BR') : '—'}
                    </p>
                  </CardContent>
                </Card>
                {result.roi != null && (
                  <Card className="border-0 shadow-sm col-span-2">
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-violet-500" />
                        <p className="text-xs text-gray-400 font-medium">ROI</p>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{result.roi}%</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
