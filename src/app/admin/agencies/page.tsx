import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function AgenciesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('role').eq('auth_id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin')

  const { data: agencies } = await supabase
    .from('agencies')
    .select('*')
    .order('name')

  // Count clients and operators per agency
  const { data: clientCounts } = await supabase
    .from('clients')
    .select('agency_id')
  const { data: operatorCounts } = await supabase
    .from('users')
    .select('agency_id')
    .eq('role', 'operator')

  function countFor(list: { agency_id: string | null }[] | null, agencyId: string) {
    return list?.filter((r) => r.agency_id === agencyId).length ?? 0
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-violet-600" />
            <h1 className="text-2xl font-bold text-gray-900">Agências</h1>
          </div>
          <p className="text-sm text-gray-500">{agencies?.length ?? 0} agência{agencies?.length !== 1 ? 's' : ''} cadastrada{agencies?.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/agencies/new">
          <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
            <Plus className="w-4 h-4" /> Nova agência
          </Button>
        </Link>
      </div>

      {agencies?.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Nenhuma agência cadastrada ainda</p>
          <Link href="/admin/agencies/new">
            <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
              <Plus className="w-4 h-4" /> Cadastrar primeira agência
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agencies?.map((agency) => (
            <Link key={agency.id} href={`/admin/agencies/${agency.id}`}>
              <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-gray-900 truncate">{agency.name}</h2>
                    {agency.email && <p className="text-xs text-gray-400 mt-0.5 truncate">{agency.email}</p>}
                    <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {countFor(clientCounts, agency.id)} clientes
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {countFor(operatorCounts, agency.id)} operador{countFor(operatorCounts, agency.id) !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
