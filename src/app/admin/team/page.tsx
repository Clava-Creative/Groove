'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserCog, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface TeamMember { id: string; name: string; email: string; role: string }

export default function TeamPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  useEffect(() => {
    supabase
      .from('users')
      .select('id, name, email, role')
      .eq('role', 'admin')
      .order('name')
      .then(({ data }) => setMembers(data ?? []))
  }, [])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/invite-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao convidar')
      }
      toast.success(`${form.name} adicionado à equipe Clava!`)
      setForm({ name: '', email: '', password: '' })
      setShowForm(false)
      // Refresh list
      const { data } = await supabase.from('users').select('id, name, email, role').eq('role', 'admin').order('name')
      setMembers(data ?? [])
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCog className="w-5 h-5 text-violet-600" />
            <h1 className="text-2xl font-bold text-gray-900">Equipe Clava</h1>
          </div>
          <p className="text-sm text-gray-500">{members.length} membro{members.length !== 1 ? 's' : ''} com acesso admin</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-violet-600 hover:bg-violet-700 gap-2"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancelar' : 'Convidar membro'}
        </Button>
      </div>

      {showForm && (
        <Card className="border-0 shadow-sm mb-6">
          <CardHeader><CardTitle className="text-base">Novo membro Clava</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Ex: Caio Santos" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail *</Label>
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required placeholder="caio@clavacreative.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Senha inicial *</Label>
                <Input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" />
              </div>
              <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700 w-full">
                {loading ? 'Criando...' : 'Criar acesso'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-4 border border-gray-100">
            <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-violet-700">{m.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{m.name}</p>
              <p className="text-xs text-gray-400 truncate">{m.email}</p>
            </div>
            <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">Admin</span>
          </div>
        ))}
      </div>
    </div>
  )
}
