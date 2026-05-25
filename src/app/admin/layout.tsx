import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin-sidebar'
import type { Role } from '@/types/database'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role: Role = 'operator'
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()
    if (profile?.role) role = profile.role as Role
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar role={role} />
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
