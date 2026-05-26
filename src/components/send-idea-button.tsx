'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  clientId: string
}

export default function SendIdeaButton({ clientId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    setLoading(true)

    const { error } = await supabase.from('insights').insert({
      client_id: clientId,
      title: title.trim(),
      body: body.trim(),
      source: 'client',
      status: 'approved',
      specialist_name: null,
    })

    setLoading(false)

    if (error) {
      toast.error('Erro ao enviar ideia. Tente novamente.')
      return
    }

    toast.success('Ideia enviada para a equipe! 🚀')
    setTitle('')
    setBody('')
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        Enviar ideia
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-violet-600" />
                </div>
                <h2 className="font-bold text-gray-900">Enviar uma ideia</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="idea-title">Título da ideia *</Label>
                <Input
                  id="idea-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Criar conteúdo sobre o verão"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="idea-body">Descreva sua ideia *</Label>
                <textarea
                  id="idea-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Conte mais sobre o que você imagina, o tom, o objetivo..."
                  rows={4}
                  required
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="flex-1 bg-violet-600 hover:bg-violet-700">
                  {loading ? 'Enviando...' : 'Enviar ideia'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
