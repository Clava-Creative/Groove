'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  CalendarDays,
  Megaphone,
  Lightbulb,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/notification-bell'

const navItems = [
  { href: '/client', label: 'Início', icon: LayoutDashboard, exact: true },
  { href: '/client/calendar', label: 'Calendário', icon: CalendarDays },
  { href: '/client/campaigns', label: 'Campanhas', icon: Megaphone },
  { href: '/client/insights', label: 'Insights', icon: Lightbulb },
  { href: '/client/results', label: 'Resultados', icon: BarChart3 },
]

interface Props {
  clientName?: string
}

export default function ClientSidebar({ clientName }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavContent = () => (
    <>
      <div className="px-6 py-5 border-b border-gray-100">
        <Link href="/client" onClick={() => setOpen(false)}>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">GROOVE</h1>
          {clientName && (
            <p className="text-xs text-gray-500 font-medium mt-0.5 truncate">{clientName}</p>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 flex items-center gap-2">
        <NotificationBell />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="flex-1 justify-start gap-2 text-gray-500 hover:text-gray-900"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 flex items-center justify-between px-4 h-14">
        <Link href="/client">
          <span className="text-lg font-bold text-gray-900 tracking-tight">GROOVE</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <button
            onClick={() => setOpen(!open)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-50"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/20"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={cn(
        'lg:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-white border-r border-gray-100 flex flex-col transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-gray-100 bg-white flex-col h-screen sticky top-0">
        <NavContent />
      </aside>
    </>
  )
}
