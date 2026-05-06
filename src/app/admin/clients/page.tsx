import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Building2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*, users(count)')
    .order('name')

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-1">{clients?.length ?? 0} clientes cadastrados</p>
        </div>
        <Link href="/admin/clients/new">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4" />
            Novo cliente
          </Button>
        </Link>
      </div>

      {clients?.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum cliente ainda</p>
            <p className="text-sm text-gray-400 mt-1">Crie o primeiro cliente para começar</p>
            <Link href="/admin/clients/new">
              <Button className="mt-4 gap-2 bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4" /> Novo cliente
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients?.map((client) => (
            <Link key={client.id} href={`/admin/clients/${client.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    {client.logo_url ? (
                      <img src={client.logo_url} alt={client.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: client.primary_color ?? '#7c3aed' }}
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{client.name}</p>
                      {client.email && <p className="text-xs text-gray-400">{client.email}</p>}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Desde {format(new Date(client.created_at), "MMM yyyy", { locale: ptBR })}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
