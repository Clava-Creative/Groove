import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, Building2, User, ChevronRight, Users } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import DeleteClientButton from '@/components/delete-client-button'

export default async function ClientsPage() {
  const supabase = await createClient()

  // Get the current user's role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentProfile } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user?.id ?? '')
    .single()

  const isOperator = currentProfile?.role === 'operator'

  // Fetch agencies and clients
  const [{ data: agencies }, { data: clients }] = await Promise.all([
    supabase.from('agencies').select('id, name, email').order('name'),
    supabase.from('clients').select('id, name, email, logo_url, primary_color, agency_id, created_at').order('name'),
  ])

  const totalClients = clients?.length ?? 0

  // ─── Operator view: flat list of their own clients ────────────────────────
  if (isOperator) {
    return (
      <div className="p-4 md:p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meus Clientes</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalClients} {totalClients === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
            </p>
          </div>
          <Link href="/admin/clients/new">
            <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
              <Plus className="w-4 h-4" /> Novo cliente
            </Button>
          </Link>
        </div>

        {totalClients === 0 ? (
          <div className="text-center py-16">
            <User className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum cliente ainda</p>
            <p className="text-sm text-gray-400 mt-1">Crie seu primeiro cliente para começar</p>
            <Link href="/admin/clients/new">
              <Button className="mt-4 gap-2 bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4" /> Novo cliente
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(clients ?? []).map((client) => (
              <div key={client.id} className="group flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm hover:shadow-md hover:border-violet-100 transition-all">
                {/* Avatar */}
                {client.logo_url ? (
                  <img src={client.logo_url} alt={client.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                ) : (
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: client.primary_color ?? '#7c3aed' }}
                  >
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                )}

                <Link href={`/admin/clients/${client.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm truncate">{client.name}</p>
                    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-1">
                      <User className="w-2.5 h-2.5" /> Cliente
                    </span>
                  </div>
                  {client.email && <p className="text-xs text-gray-400 truncate">{client.email}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">
                    Desde {format(new Date(client.created_at), "MMM yyyy", { locale: ptBR })}
                  </p>
                </Link>

                <div className="flex items-center gap-1 shrink-0">
                  <DeleteClientButton clientId={client.id} clientName={client.name} />
                  <Link href={`/admin/clients/${client.id}`}>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Admin view: full org-chart ───────────────────────────────────────────
  // Group clients by agency_id
  const clientsByAgency = (clients ?? []).reduce<Record<string, typeof clients>>((acc, c) => {
    const key = c.agency_id ?? '__clava__'
    if (!acc[key]) acc[key] = []
    acc[key]!.push(c)
    return acc
  }, {})

  const clavaClients = clientsByAgency['__clava__'] ?? []

  function ClientCard({ client, indent = false }: { client: NonNullable<typeof clients>[number]; indent?: boolean }) {
    return (
      <Link href={`/admin/clients/${client.id}`}>
        <div className={`group flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm hover:shadow-md hover:border-violet-100 transition-all cursor-pointer ${indent ? 'ml-6' : ''}`}>
          {/* Tree connector */}
          {indent && (
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-5 border-t border-dashed border-gray-200" />
          )}

          {/* Avatar */}
          {client.logo_url ? (
            <img src={client.logo_url} alt={client.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: client.primary_color ?? '#7c3aed' }}
            >
              {client.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm truncate">{client.name}</p>
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-1">
                <User className="w-2.5 h-2.5" /> Cliente
              </span>
            </div>
            {client.email && <p className="text-xs text-gray-400 truncate">{client.email}</p>}
            <p className="text-xs text-gray-300 mt-0.5">
              Desde {format(new Date(client.created_at), "MMM yyyy", { locale: ptBR })}
            </p>
          </div>

          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors shrink-0" />
        </div>
      </Link>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">{totalClients} {totalClients === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}</p>
        </div>
        <Link href="/admin/clients/new">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Novo cliente
          </Button>
        </Link>
      </div>

      {totalClients === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhum cliente ainda</p>
          <Link href="/admin/clients/new">
            <Button className="mt-4 gap-2 bg-violet-600 hover:bg-violet-700">
              <Plus className="w-4 h-4" /> Novo cliente
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Agencies + their clients */}
          {(agencies ?? []).map((agency) => {
            const agencyClients = clientsByAgency[agency.id] ?? []
            return (
              <div key={agency.id}>
                {/* Agency header */}
                <Link href={`/admin/agencies/${agency.id}`}>
                  <div className="group flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 hover:bg-violet-100 transition-colors cursor-pointer mb-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-200 flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4 text-violet-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-violet-900 text-sm truncate">{agency.name}</p>
                        <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-200 text-violet-700 flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5" /> Agência
                        </span>
                      </div>
                      {agency.email && <p className="text-xs text-violet-400 truncate">{agency.email}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-violet-400 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {agencyClients.length}
                      </span>
                      <ChevronRight className="w-4 h-4 text-violet-300 group-hover:text-violet-500 transition-colors" />
                    </div>
                  </div>
                </Link>

                {/* Clients of this agency */}
                {agencyClients.length > 0 ? (
                  <div className="ml-4 pl-4 border-l-2 border-dashed border-gray-200 space-y-2">
                    {agencyClients.map((client) => (
                      <ClientCard key={client.id} client={client} />
                    ))}
                  </div>
                ) : (
                  <div className="ml-4 pl-4 border-l-2 border-dashed border-gray-200">
                    <p className="text-xs text-gray-400 py-2">Nenhum cliente vinculado</p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Clava's own clients (no agency) */}
          {clavaClients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-white">C</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 text-sm">Clava Creative</p>
                    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-1">
                      <Building2 className="w-2.5 h-2.5" /> Clientes diretos
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">Gerenciados pela Clava</p>
                </div>
              </div>
              <div className="ml-4 pl-4 border-l-2 border-dashed border-gray-200 space-y-2">
                {clavaClients.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
