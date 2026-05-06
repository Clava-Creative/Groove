'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ClientRecord { id: string; name: string }

export default function NewResultPage() {
  const router = useRouter()
  const supabase = createClient()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ client_id: '', period: '', followers: '', reach: '', clicks: '', conversions: '', roi: '' })

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
      const { error } = await supabase.from('results').insert({
        client_id: form.client_id,
        period: form.period,
        followers: form.followers ? parseInt(form.followers) : null,
        reach: form.reach ? parseInt(form.reach) : null,
        clicks: form.clicks ? parseInt(form.clicks) : null,
        conversions: form.conversions ? parseInt(form.conversions) : null,
        roi: form.roi ? parseFloat(form.roi) : null,
      })
      if (error) throw new Error(error.message)
      toast.success('Resultado cadastrado!')
      router.push('/admin')
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
        <Link href="/admin" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Cadastrar resultados</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Dados do período</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={form.client_id} onValueChange={(v) => set('client_id', v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period">Período *</Label>
              <Input id="period" value={form.period} onChange={(e) => set('period', e.target.value)} required placeholder="Ex: Abril 2025" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="followers">Seguidores</Label>
                <Input id="followers" type="number" value={form.followers} onChange={(e) => set('followers', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reach">Alcance</Label>
                <Input id="reach" type="number" value={form.reach} onChange={(e) => set('reach', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clicks">Cliques</Label>
                <Input id="clicks" type="number" value={form.clicks} onChange={(e) => set('clicks', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="conversions">Conversões</Label>
                <Input id="conversions" type="number" value={form.conversions} onChange={(e) => set('conversions', e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="roi">ROI (%)</Label>
                <Input id="roi" type="number" step="0.01" value={form.roi} onChange={(e) => set('roi', e.target.value)} placeholder="0.00" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Link href="/admin"><Button type="button" variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">{loading ? 'Salvando...' : 'Salvar resultados'}</Button>
        </div>
      </form>
    </div>
  )
}
