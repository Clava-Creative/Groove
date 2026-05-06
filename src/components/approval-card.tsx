'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import StatusBadge from '@/components/status-badge'
import { Check, X, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import type { ApprovalStatus } from '@/types/database'

interface Item {
  id: string
  title: string
  status: ApprovalStatus
  comment: string | null
  reviewed_at: string | null
  caption?: string | null
  media_url?: string | null
  scheduled_date?: string
  body?: string
  specialist_name?: string | null
  objective?: string | null
  description?: string | null
}

interface Props {
  item: Item
  type: 'post' | 'campaign' | 'insight'
}

const TABLE_MAP = { post: 'posts', campaign: 'campaigns', insight: 'insights' } as const

export default function ApprovalCard({ item, type }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [expanded, setExpanded] = useState(item.status === 'pending')
  const [rejecting, setRejecting] = useState(false)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  async function getAdminUsers(): Promise<string[]> {
    const { data } = await supabase.from('users').select('id').eq('role', 'admin')
    return (data ?? []).map((u) => u.id)
  }

  async function handleApprove() {
    setLoading(true)
    const table = TABLE_MAP[type]
    const { error } = await supabase
      .from(table)
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), comment: null })
      .eq('id', item.id)

    if (error) {
      toast.error('Erro ao aprovar')
      setLoading(false)
      return
    }

    // Notify admins
    const adminIds = await getAdminUsers()
    if (adminIds.length > 0) {
      await supabase.from('notifications').insert(
        adminIds.map((adminId) => ({
          user_id: adminId,
          type: 'approved' as const,
          message: `"${item.title}" foi aprovado pelo cliente`,
          ref_id: item.id,
          ref_type: type,
        }))
      )
    }

    toast.success('Aprovado!')
    router.refresh()
    setLoading(false)
  }

  async function handleReject() {
    if (!comment.trim()) { toast.error('Escreva um comentário antes de rejeitar'); return }
    setLoading(true)
    const table = TABLE_MAP[type]
    const { error } = await supabase
      .from(table)
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), comment: comment.trim() })
      .eq('id', item.id)

    if (error) {
      toast.error('Erro ao rejeitar')
      setLoading(false)
      return
    }

    const adminIds = await getAdminUsers()
    if (adminIds.length > 0) {
      await supabase.from('notifications').insert(
        adminIds.map((adminId) => ({
          user_id: adminId,
          type: 'rejected' as const,
          message: `"${item.title}" foi rejeitado. Motivo: ${comment.trim()}`,
          ref_id: item.id,
          ref_type: type,
        }))
      )
    }

    toast.success('Feedback enviado para a Clava')
    router.refresh()
    setRejecting(false)
    setLoading(false)
  }

  return (
    <Card className={`border-0 shadow-sm transition-all ${item.status === 'pending' ? 'ring-1 ring-amber-200' : ''}`}>
      <CardContent className="py-0">
        {/* Header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-4 py-4 text-left"
        >
          {/* Media thumbnail (posts only) */}
          {type === 'post' && (
            item.media_url ? (
              <img src={item.media_url} alt={item.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 text-gray-300" />
              </div>
            )
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-gray-900">{item.title}</p>
              <StatusBadge status={item.status} />
            </div>
            {type === 'post' && item.scheduled_date && (
              <p className="text-xs text-gray-400">
                {format(new Date(item.scheduled_date), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            )}
            {type === 'insight' && item.specialist_name && (
              <p className="text-xs text-gray-400">Por {item.specialist_name}</p>
            )}
            {type === 'campaign' && item.objective && (
              <p className="text-xs text-gray-400">{item.objective}</p>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="pb-4 border-t border-gray-50 pt-4">
            {/* Post: caption + full image */}
            {type === 'post' && (
              <div className="space-y-3">
                {item.media_url && (
                  <img src={item.media_url} alt={item.title} className="w-full max-h-80 rounded-xl object-cover" />
                )}
                {item.caption && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-400 mb-1">Legenda</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.caption}</p>
                  </div>
                )}
              </div>
            )}

            {/* Campaign: description */}
            {type === 'campaign' && item.description && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.description}</p>
              </div>
            )}

            {/* Insight: body */}
            {type === 'insight' && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.body}</p>
              </div>
            )}

            {/* Rejection comment display */}
            {item.status === 'rejected' && item.comment && (
              <div className="bg-red-50 rounded-lg p-3 mt-3">
                <p className="text-xs font-medium text-red-600 mb-1">Seu feedback</p>
                <p className="text-sm text-red-700">"{item.comment}"</p>
              </div>
            )}

            {/* Approval actions (only for pending) */}
            {item.status === 'pending' && (
              <div className="mt-4">
                {rejecting ? (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Descreva o que precisa ser ajustado..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setRejecting(false); setComment('') }} disabled={loading}>
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleReject} disabled={loading}
                        className="bg-red-500 hover:bg-red-600 text-white gap-1.5">
                        <X className="w-3.5 h-3.5" />
                        {loading ? 'Enviando...' : 'Enviar feedback'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleApprove} disabled={loading}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {loading ? 'Aprovando...' : 'Aprovar'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRejecting(true)} disabled={loading}
                      className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                      <X className="w-3.5 h-3.5" />
                      Solicitar ajuste
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
