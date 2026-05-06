'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ClientRecord { id: string; name: string }

export default function NewCampaignPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    client_id: searchParams.get('client') ?? '',
    title: '',
    objective: '',
    description: '',
  })

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => setClients(data ?? []))
  }, [])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id) { toast.error('Selecione um cliente'); return }
    setLoading(true)
    try {
      const { data: newCampaign, error } = await supabase
        .from('campaigns')
        .insert({ client_id: form.client_id, title: form.title, objective: form.objective || null, description: form.description || null, status: 'pending' })
        .select().single()

      if (error || !newCampaign) throw new Error(error?.message)

      const { data: clientUser } = await supabase.from('users').select('id').eq('client_id', form.client_id).eq('role', 'client').single()
      if (clientUser) {
        await supabase.from('notifications').insert({ user_id: clientUser.id, type: 'campaign_pending', message: `Nova campanha para aprovação: ${form.title}`, ref_id: newCampaign.id, ref_type: 'campaign' })
      }

      toast.success('Campanha criada!')
      router.push('/admin/campaigns')
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
        <Link href="/admin/campaigns" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nova campanha</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Detalhes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={form.client_id} onValueChange={(v) => set('client_id', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="Ex: Campanha Black Friday 2025" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective">Objetivo</Label>
              <Input id="objective" value={form.objective} onChange={(e) => set('objective', e.target.value)} placeholder="Ex: Aumentar leads em 30%" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição detalhada</Label>
              <Textarea id="description" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Descreva a estratégia da campanha..." rows={5} />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Link href="/admin/campaigns"><Button type="button" variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">{loading ? 'Criando...' : 'Criar campanha'}</Button>
        </div>
      </form>
    </div>
  )
}
