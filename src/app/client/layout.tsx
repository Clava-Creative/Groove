import { createClient } from '@/lib/supabase/server'
import ClientSidebar from '@/components/client-sidebar'

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let clientName: string | undefined
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('client_id, clients(name)')
      .eq('auth_id', user.id)
      .single()

    clientName = (profile?.clients as unknown as { name: string } | null)?.name
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ClientSidebar clientName={clientName} />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
