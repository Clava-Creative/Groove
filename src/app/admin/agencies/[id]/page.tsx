import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Users, UserCog, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props { params: { id: string } }

export default async function AgencyDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('users').select('role').eq('auth_id', user.id).single()
  if (profile?.role !== 'admin') redirect('/admin')

  const { data: agency } = await supabase.from('agencies').select('*').eq('id', params.id).single()
  if (!agency) redirect('/admin/agencies')

  const { data: clients } = await supabase.from('clients').select('id, name, email').eq('agency_id', params.id).order('name')
  const { data: operators } = await supabase.from('users').select('id, name, email').eq('agency_id', params.id).eq('role', 'operator').order('name')

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/agencies" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Agências
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{agency.name}</h1>
            {agency.email && <p className="text-sm text-gray-400">{agency.email}</p>}
          </div>
        </div>
      </div>

      {/* Operators */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <UserCog className="w-3.5 h-3.5" /> Operadores ({operators?.length ?? 0})
          </h2>
          <Link href={`/admin/agencies/new?agencyId=${params.id}`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
              <Plus className="w-3 h-3" /> Adicionar operador
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          {operators?.length === 0 && <p className="text-sm text-gray-400">Nenhum operador ainda</p>}
          {operators?.map((op) => (
            <div key={op.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-violet-700">{op.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{op.name}</p>
                <p className="text-xs text-gray-400">{op.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clients */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Clientes ({clients?.length ?? 0})
          </h2>
          <Link href={`/admin/clients/new?agencyId=${params.id}`}>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
              <Plus className="w-3 h-3" /> Adicionar cliente
            </Button>
          </Link>
        </div>
        <div className="space-y-2">
          {clients?.length === 0 && <p className="text-sm text-gray-400">Nenhum cliente ainda</p>}
          {clients?.map((cl) => (
            <Link key={cl.id} href={`/admin/clients/${cl.id}`}>
              <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-gray-600">{cl.name.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{cl.name}</p>
                  {cl.email && <p className="text-xs text-gray-400">{cl.email}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
