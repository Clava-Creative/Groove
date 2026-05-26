import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BarChart3, Plus, Users, TrendingUp, MousePointerClick, ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DeleteResultButton from './delete-result-button'

export default async function AdminResultsPage() {
  const supabase = await createClient()

  const { data: results } = await supabase
    .from('results')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-violet-600" />
            <h1 className="text-2xl font-bold text-gray-900">Resultados</h1>
          </div>
          <p className="text-sm text-gray-500">Métricas cadastradas por cliente e período</p>
        </div>
        <Link href="/admin/results/new">
          <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
            <Plus className="w-4 h-4" /> Novo resultado
          </Button>
        </Link>
      </div>

      {results?.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Nenhum resultado cadastrado ainda</p>
          <Link href="/admin/results/new">
            <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Plus className="w-4 h-4" /> Cadastrar primeiro resultado
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {results?.map((result) => {
            const clientName = (result.clients as unknown as { name: string } | null)?.name
            return (
              <div key={result.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{clientName ?? '—'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 uppercase tracking-wider">{result.period}</p>
                  </div>
                  <DeleteResultButton id={result.id} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-3.5 h-3.5 text-violet-400" />
                      <p className="text-xs text-gray-400">Seguidores</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {result.followers != null ? result.followers.toLocaleString('pt-BR') : '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                      <p className="text-xs text-gray-400">Alcance</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {result.reach != null ? result.reach.toLocaleString('pt-BR') : '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MousePointerClick className="w-3.5 h-3.5 text-amber-400" />
                      <p className="text-xs text-gray-400">Cliques</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {result.clicks != null ? result.clicks.toLocaleString('pt-BR') : '—'}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-400" />
                      <p className="text-xs text-gray-400">Conversões</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {result.conversions != null ? result.conversions.toLocaleString('pt-BR') : '—'}
                    </p>
                  </div>
                  {result.roi != null && (
                    <div className="bg-violet-50 rounded-xl p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-violet-500" />
                        <p className="text-xs text-violet-400">ROI</p>
                      </div>
                      <p className="text-lg font-bold text-violet-700">{result.roi}%</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
