'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Building2, UserCog } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function NewAgencyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    agencyName: '',
    agencyEmail: '',
    operatorName: '',
    operatorEmail: '',
    operatorPassword: '',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.agencyName || !form.operatorName || !form.operatorEmail || !form.operatorPassword) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    setLoading(true)

    try {
      // 1. Create agency via Supabase (using admin client through API)
      const agencyRes = await fetch('/api/admin/create-agency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.agencyName,
          email: form.agencyEmail || null,
        }),
      })

      if (!agencyRes.ok) {
        const err = await agencyRes.json()
        throw new Error(err.error ?? 'Erro ao criar agência')
      }

      const { agencyId } = await agencyRes.json()

      // 2. Invite operator for this agency
      const operatorRes = await fetch('/api/admin/invite-operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyId,
          name: form.operatorName,
          email: form.operatorEmail,
          password: form.operatorPassword,
        }),
      })

      if (!operatorRes.ok) {
        const err = await operatorRes.json()
        throw new Error(err.error ?? 'Erro ao criar operador')
      }

      toast.success(`Agência "${form.agencyName}" criada com operador!`)
      router.push('/admin/agencies')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/agencies" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nova agência</h1>
        <p className="text-sm text-gray-500 mt-1">Cadastre a agência e o operador responsável</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-500" />
              Dados da agência
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="agencyName">Nome da agência *</Label>
              <Input
                id="agencyName"
                value={form.agencyName}
                onChange={(e) => set('agencyName', e.target.value)}
                required
                placeholder="Ex: MKT Studio"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agencyEmail">E-mail da agência</Label>
              <Input
                id="agencyEmail"
                type="email"
                value={form.agencyEmail}
                onChange={(e) => set('agencyEmail', e.target.value)}
                placeholder="contato@agencia.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="w-4 h-4 text-violet-500" />
              Operador responsável
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="operatorName">Nome *</Label>
              <Input
                id="operatorName"
                value={form.operatorName}
                onChange={(e) => set('operatorName', e.target.value)}
                required
                placeholder="Ex: Ana Souza"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="operatorEmail">E-mail de acesso *</Label>
              <Input
                id="operatorEmail"
                type="email"
                value={form.operatorEmail}
                onChange={(e) => set('operatorEmail', e.target.value)}
                required
                placeholder="ana@agencia.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="operatorPassword">Senha inicial *</Label>
              <Input
                id="operatorPassword"
                type="password"
                value={form.operatorPassword}
                onChange={(e) => set('operatorPassword', e.target.value)}
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href="/admin/agencies">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">
            {loading ? 'Criando...' : 'Criar agência'}
          </Button>
        </div>
      </form>
    </div>
  )
}
