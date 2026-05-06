'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    primary_color: '#7c3aed',
    userEmail: '',
    userName: '',
    userPassword: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      // Create client record
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({ name: form.name, email: form.email, primary_color: form.primary_color })
        .select()
        .single()

      if (clientError || !newClient) throw new Error(clientError?.message ?? 'Erro ao criar cliente')

      // Create auth user for the client via API route
      const res = await fetch('/api/admin/invite-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: newClient.id,
          email: form.userEmail,
          name: form.userName,
          password: form.userPassword,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao criar usuário')
      }

      toast.success('Cliente criado com sucesso!')
      router.push('/admin/clients')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/clients" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo cliente</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Dados da empresa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da empresa *</Label>
              <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Ex: Mushroom&Cia" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail da empresa</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="contato@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="color">Cor principal</Label>
              <div className="flex items-center gap-3">
                <input
                  id="color"
                  type="color"
                  value={form.primary_color}
                  onChange={(e) => set('primary_color', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-200"
                />
                <span className="text-sm text-gray-500">{form.primary_color}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Acesso do cliente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="userName">Nome do responsável *</Label>
              <Input id="userName" value={form.userName} onChange={(e) => set('userName', e.target.value)} required placeholder="João Silva" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userEmail">E-mail de acesso *</Label>
              <Input id="userEmail" type="email" value={form.userEmail} onChange={(e) => set('userEmail', e.target.value)} required placeholder="joao@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="userPassword">Senha inicial *</Label>
              <Input id="userPassword" type="password" value={form.userPassword} onChange={(e) => set('userPassword', e.target.value)} required minLength={8} placeholder="Mínimo 8 caracteres" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href="/admin/clients">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">
            {loading ? 'Criando...' : 'Criar cliente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
