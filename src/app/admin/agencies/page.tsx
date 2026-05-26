'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Building2, Plus, Users, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Agency { id: string; name: string; email: string | null; created_at: string }

export default function AgenciesPage() {
  const supabase = createClient()
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [clientCounts, setClientCounts] = useState<Record<string, number>>({})
  const [operatorCounts, setOperatorCounts] = useState<Record<string, number>>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: ag }, { data: cl }, { data: op }] = await Promise.all([
      supabase.from('agencies').select('*').order('name'),
      supabase.from('clients').select('agency_id'),
      supabase.from('users').select('agency_id').eq('role', 'operator'),
    ])
    setAgencies(ag ?? [])

    const cc: Record<string, number> = {}
    cl?.forEach((r) => { if (r.agency_id) cc[r.agency_id] = (cc[r.agency_id] ?? 0) + 1 })
    setClientCounts(cc)

    const oc: Record<string, number> = {}
    op?.forEach((r) => { if (r.agency_id) oc[r.agency_id] = (oc[r.agency_id] ?? 0) + 1 })
    setOperatorCounts(oc)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(agencyId: string, agencyName: string) {
    setDeleting(agencyId)
    try {
      const { error } = await supabase.from('agencies').delete().eq('id', agencyId)
      if (error) throw new Error(error.message)
      toast.success(`Agência "${agencyName}" excluída`)
      setConfirmId(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-violet-600" />
            <h1 className="text-2xl font-bold text-gray-900">Agências</h1>
          </div>
          <p className="text-sm text-gray-500">
            {agencies.length} agência{agencies.length !== 1 ? 's' : ''} cadastrada{agencies.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/admin/agencies/new">
          <Button className="bg-violet-600 hover:bg-violet-700 gap-2">
            <Plus className="w-4 h-4" /> Nova agência
          </Button>
        </Link>
      </div>

      {agencies.length === 0 ? (
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
          {agencies.map((agency) => (
            <div key={agency.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative group">
              <Link href={`/admin/agencies/${agency.id}`} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0 pr-8">
                  <h2 className="font-semibold text-gray-900 truncate">{agency.name}</h2>
                  {agency.email && <p className="text-xs text-gray-400 mt-0.5 truncate">{agency.email}</p>}
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {clientCounts[agency.id] ?? 0} clientes
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {operatorCounts[agency.id] ?? 0} operador{(operatorCounts[agency.id] ?? 0) !== 1 ? 'es' : ''}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Delete button */}
              {confirmId === agency.id ? (
                <div className="absolute inset-0 bg-white rounded-2xl flex flex-col items-center justify-center gap-3 p-4 border border-red-100">
                  <p className="text-sm font-medium text-gray-800 text-center">Excluir <span className="text-red-600">{agency.name}</span>?</p>
                  <p className="text-xs text-gray-400 text-center">Clientes e operadores vinculados perderão o vínculo</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>Cancelar</Button>
                    <Button
                      size="sm"
                      onClick={() => handleDelete(agency.id, agency.name)}
                      disabled={deleting === agency.id}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {deleting === agency.id ? 'Excluindo...' : 'Excluir'}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.preventDefault(); setConfirmId(agency.id) }}
                  className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
