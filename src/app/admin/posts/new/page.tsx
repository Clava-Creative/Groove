'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Upload, X, Package, ImageIcon, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface ClientRecord { id: string; name: string }

interface PackageFile {
  localId: string
  file: File
  preview: string | null
  groupName: string
  mediaType: 'image' | 'video'
}

function NewPostPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [isPackage, setIsPackage] = useState(false)

  // Single item state
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)

  // Package state
  const [packageFiles, setPackageFiles] = useState<PackageFile[]>([])
  const [currentGroup, setCurrentGroup] = useState('Carousel 1')

  const [form, setForm] = useState({
    client_id: searchParams.get('client') ?? '',
    title: '',
    caption: '',
    scheduled_date: '',
  })

  useEffect(() => {
    supabase.from('clients').select('id, name').order('name').then(({ data }) => setClients(data ?? []))
  }, [])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // Single file handlers
  function handleSingleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }
  function removeSingleMedia() {
    setMediaFile(null)
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaPreview(null)
  }

  // Package file handlers
  function handlePackageFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const newItems: PackageFile[] = files.map((file) => ({
      localId: `${Date.now()}-${Math.random()}`,
      file,
      preview: file.type.startsWith('image') ? URL.createObjectURL(file) : null,
      groupName: currentGroup,
      mediaType: file.type.startsWith('video') ? 'video' : 'image',
    }))
    setPackageFiles((prev) => [...prev, ...newItems])
    e.target.value = ''
  }
  function removePackageFile(localId: string) {
    setPackageFiles((prev) => {
      const item = prev.find((f) => f.localId === localId)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((f) => f.localId !== localId)
    })
  }

  // Group files by groupName
  const groups = packageFiles.reduce<Record<string, PackageFile[]>>((acc, f) => {
    if (!acc[f.groupName]) acc[f.groupName] = []
    acc[f.groupName].push(f)
    return acc
  }, {})

  async function uploadFile(file: File, clientId: string): Promise<{ url: string; type: 'image' | 'video' }> {
    const ext = file.name.split('.').pop()
    const path = `posts/${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('groove-media').upload(path, file, { upsert: false })
    if (error) throw new Error(`Upload falhou: ${error.message}`)
    const { data: { publicUrl } } = supabase.storage.from('groove-media').getPublicUrl(path)
    return { url: publicUrl, type: file.type.startsWith('video') ? 'video' : 'image' }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id) { toast.error('Selecione um cliente'); return }
    if (isPackage && packageFiles.length === 0) { toast.error('Adicione pelo menos um arquivo ao pacote'); return }
    setLoading(true)

    try {
      if (isPackage) {
        // Create package post (no media_url on post itself)
        const { data: newPost, error: postError } = await supabase
          .from('posts')
          .insert({
            client_id: form.client_id,
            title: form.title,
            caption: form.caption || null,
            scheduled_date: form.scheduled_date,
            is_package: true,
            status: 'pending',
          })
          .select().single()

        if (postError || !newPost) throw new Error(postError?.message ?? 'Erro ao criar post')

        // Upload all files and create post_items
        toast.loading(`Enviando ${packageFiles.length} arquivos...`, { id: 'upload' })
        for (let i = 0; i < packageFiles.length; i++) {
          const pf = packageFiles[i]
          const { url, type } = await uploadFile(pf.file, form.client_id)
          await supabase.from('post_items').insert({
            post_id: newPost.id,
            title: pf.file.name,
            group_name: pf.groupName || null,
            media_url: url,
            media_type: type,
            order_index: i,
            status: 'pending',
          })
        }
        toast.dismiss('upload')

        // Notify client
        const { data: clientUser } = await supabase.from('users').select('id').eq('client_id', form.client_id).eq('role', 'client').single()
        if (clientUser) {
          await supabase.from('notifications').insert({
            user_id: clientUser.id,
            type: 'post_pending',
            message: `Novo pacote para aprovação: ${form.title} (${packageFiles.length} arquivos)`,
            ref_id: newPost.id,
            ref_type: 'post',
          })
        }

        toast.success(`Pacote criado com ${packageFiles.length} arquivos!`)
      } else {
        // Single item
        let media_url: string | null = null
        let media_type: 'image' | 'video' | null = null
        if (mediaFile) {
          const result = await uploadFile(mediaFile, form.client_id)
          media_url = result.url
          media_type = result.type
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
            is_package: false,
            status: 'pending',
          })
          .select().single()

        if (error || !newPost) throw new Error(error?.message ?? 'Erro ao criar post')

        const { data: clientUser } = await supabase.from('users').select('id').eq('client_id', form.client_id).eq('role', 'client').single()
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
      }

      router.push('/admin/posts')
      router.refresh()
    } catch (err: unknown) {
      toast.dismiss('upload')
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/posts" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novo post</h1>
      </div>

      {/* Toggle single / package */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setIsPackage(false)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
            !isPackage ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Item único
        </button>
        <button
          type="button"
          onClick={() => setIsPackage(true)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
            isPackage ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <FolderOpen className="w-4 h-4" /> Pacote
        </button>
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
              <Input id="title" value={form.title} onChange={(e) => set('title', e.target.value)} required placeholder={isPackage ? 'Ex: Conteúdo Maio 2026' : 'Ex: Post Dia das Mães'} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="caption">Legenda / Observações</Label>
              <Textarea id="caption" value={form.caption} onChange={(e) => set('caption', e.target.value)} placeholder="Texto da publicação ou observações para o cliente..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Data de publicação *</Label>
              <Input id="date" type="date" value={form.scheduled_date} onChange={(e) => set('scheduled_date', e.target.value)} required />
            </div>
          </CardContent>
        </Card>

        {/* Single item upload */}
        {!isPackage && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Mídia</CardTitle></CardHeader>
            <CardContent>
              {mediaPreview ? (
                <div className="relative inline-block">
                  <img src={mediaPreview} alt="preview" className="max-h-64 rounded-lg object-cover" />
                  <button type="button" onClick={removeSingleMedia}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Clique para fazer upload</span>
                  <span className="text-xs text-gray-400 mt-0.5">PNG, JPG, MP4 até 50MB</span>
                  <input type="file" className="hidden" accept="image/*,video/*" onChange={handleSingleFile} />
                </label>
              )}
            </CardContent>
          </Card>
        )}

        {/* Package upload */}
        {isPackage && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-violet-500" />
                  Arquivos do pacote
                  {packageFiles.length > 0 && (
                    <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{packageFiles.length} arquivo{packageFiles.length !== 1 ? 's' : ''}</span>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Group name + upload */}
              <div className="flex gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-gray-500">Nome do grupo</Label>
                  <Input
                    value={currentGroup}
                    onChange={(e) => setCurrentGroup(e.target.value)}
                    placeholder="Ex: Carousel 1, Post Estático..."
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500 invisible">upload</Label>
                  <label className="flex items-center gap-1.5 h-9 px-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-md cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    Adicionar
                    <input type="file" className="hidden" accept="image/*,video/*,application/pdf" multiple onChange={handlePackageFiles} />
                  </label>
                </div>
              </div>

              {/* Grouped preview */}
              {Object.entries(groups).map(([groupName, files]) => (
                <div key={groupName}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{groupName} · {files.length} arquivo{files.length !== 1 ? 's' : ''}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {files.map((pf) => (
                      <div key={pf.localId} className="relative group aspect-square">
                        {pf.preview ? (
                          <img src={pf.preview} alt={pf.file.name} className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="text-xs text-gray-400 text-center px-1 truncate">{pf.file.name.split('.').pop()?.toUpperCase()}</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => removePackageFile(pf.localId)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {packageFiles.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  Nenhum arquivo adicionado ainda
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Link href="/admin/posts"><Button type="button" variant="outline">Cancelar</Button></Link>
          <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-700">
            {loading ? 'Criando...' : isPackage ? `Criar pacote${packageFiles.length > 0 ? ` (${packageFiles.length} arquivos)` : ''}` : 'Criar post'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewPostPageWrapper() {
  return <Suspense><NewPostPage /></Suspense>
}
