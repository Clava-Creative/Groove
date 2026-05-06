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
import { ArrowLeft, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ClientRecord {
  id: string
  name: string
}

export default function NewPostPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClient = searchParams.get('client')
  const supabase = createClient()

  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [form, setForm] = useState({
    client_id: preselectedClient ?? '',
    title: '',
    caption: '',
    scheduled_date: '',
  })

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => {
      setClients(data ?? [])
    })
  }, [])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  function removeMedia() {
    setMediaFile(null)
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaPreview(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id) { toast.error('Selecione um cliente'); return }
    setLoading(true)

    try {
      let media_url: string | null = null
      let media_type: 'image' | 'video' | null = null

      if (mediaFile) {
        const ext = mediaFile.name.split('.').pop()
        const path = `posts/${form.client_id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('groove-media')
          .upload(path, mediaFile, { upsert: false })

        if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

        const { data: { publicUrl } } = supabase.storage.from('groove-media').getPublicUrl(path)
        media_url = publicUrl
        media_type = mediaFile.type.startsWith('video') ? 'video' : 'image'
      }

      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          client_id: form.client_id,
          title: form.title,
          caption: form.caption || null,
          scheduled_date: form.scheduled_date,
          media_url,
          media_type,
          status: 'pending',
        })
        .select()
        .single()

      if (error || !newPost) throw new Error(error?.message ?? 'Erro ao criar post')

      // Create notification for client
      const { data: clientUser } = await supabase
        .from('users')
        .select('id')
        .eq('client_id', form.client_id)
        .eq('role', 'client')
        .single()

      if (clientUser) {
        await supabase.from('notifications').insert({
          user_id: clientUser.id,
          type: 'post_pending',
          message: `Novo post para aprovação: ${form.title}`,
          ref_id: newPost.id,
          ref_type: 'post',
        })
      }

      toast.success('Post criado! O cliente será notificado.')
      router.push('/admin/posts')
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
        <Link href="/admin/posts" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo post</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Detalhes do post</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={form.client_id} onValueChange={(v) => set('client_id', v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder="Ex: Post para o Dia das Mães" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="caption">Legenda</Label>
              <Textarea id="caption" value={form.caption} onChange={(e) => set('caption', e.target.value)} placeholder="Texto que vai na publicação..." rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Data de publicação *</Label>
              <Input id="date" type="date" value={form.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Mídia</CardTitle></CardHeader>
          <CardContent>
            {mediaPreview ? (
              <div className="relative inline-block">
                <img src={mediaPreview} alt="preview" className="max-h-64 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={removeMedia}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
                <Upload className="w-6 h-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Clique para fazer upload</span>
                <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, MP4 até 50MB</span>
                <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
              </label>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Link href="/admin/posts">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">
            {loading ? 'Criando...' : 'Criar post'}
          </Button>
        </div>
      </form>
    </div>
  )
}
