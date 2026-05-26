'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import StatusBadge from '@/components/status-badge'
import { Check, X, ImageIcon, ChevronDown, ChevronUp, ZoomIn, Package, ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import type { ApprovalStatus, PostItem } from '@/types/database'

interface Item {
  id: string
  title: string
  status: ApprovalStatus
  is_package?: boolean
  comment: string | null
  reviewed_at: string | null
  caption?: string | null
  media_url?: string | null
  media_type?: string | null
  scheduled_date?: string
  body?: string
  specialist_name?: string | null
  objective?: string | null
  description?: string | null
}

interface Props {
  item: Item
  type: 'post' | 'campaign' | 'insight'
  postItems?: PostItem[]
  clientId: string
}

const TABLE_MAP = { post: 'posts', campaign: 'campaigns', insight: 'insights' } as const

// Returns the user IDs to notify when a client reviews content.
// Operator's client → notify operators of that agency.
// Clava's client (agency_id null) → notify admins.
async function getStaffToNotify(supabase: ReturnType<typeof createClient>, clientId: string): Promise<string[]> {
  const { data: client } = await supabase.from('clients').select('agency_id').eq('id', clientId).single()
  if (client?.agency_id) {
    const { data } = await supabase.from('users').select('id').eq('role', 'operator').eq('agency_id', client.agency_id)
    return (data ?? []).map((u) => u.id)
  } else {
    const { data } = await supabase.from('users').select('id').eq('role', 'admin')
    return (data ?? []).map((u) => u.id)
  }
}

// ─── Package Card ────────────────────────────────────────────────────────────

function PackageCard({ item, postItems: initialItems, clientId }: { item: Item; postItems: PostItem[]; clientId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [expanded, setExpanded] = useState(item.status === 'pending')
  const [items, setItems] = useState<PostItem[]>(initialItems.sort((a, b) => a.order_index - b.order_index))
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const activeLightboxItem = lightboxIndex !== null ? items[lightboxIndex] : null

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null)
    setComment('')
  }, [])

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox()
      if (e.key === 'ArrowRight') setLightboxIndex((i) => i !== null ? Math.min(i + 1, items.length - 1) : null)
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => i !== null ? Math.max(i - 1, 0) : null)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [lightboxIndex, items.length, closeLightbox])

  // Reset comment when switching items in lightbox
  useEffect(() => { setComment('') }, [lightboxIndex])

  const approved = items.filter((i) => i.status === 'approved').length
  const rejected = items.filter((i) => i.status === 'rejected').length
  const pending = items.filter((i) => i.status === 'pending').length

  async function updateItemStatus(itemId: string, status: ApprovalStatus, itemComment?: string) {
    setLoading(true)
    const { error } = await supabase
      .from('post_items')
      .update({ status, comment: itemComment ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', itemId)

    if (error) { toast.error('Erro ao atualizar'); setLoading(false); return }

    const newItems = items.map((i) => i.id === itemId ? { ...i, status, comment: itemComment ?? null } : i)
    setItems(newItems)

    // Update post status if all reviewed
    const stillPending = newItems.filter((i) => i.status === 'pending').length
    if (stillPending === 0) {
      const anyRejected = newItems.some((i) => i.status === 'rejected')
      await supabase.from('posts').update({
        status: anyRejected ? 'rejected' : 'approved',
        reviewed_at: new Date().toISOString(),
      }).eq('id', item.id)

      // Notify operator (if agency client) or admin (if Clava client)
      const staffIds = await getStaffToNotify(supabase, clientId)
      if (staffIds.length > 0) {
        await supabase.from('notifications').insert(
          staffIds.map((uid) => ({
            user_id: uid,
            type: (anyRejected ? 'rejected' : 'approved') as 'approved' | 'rejected',
            message: `Pacote "${item.title}" ${anyRejected ? 'tem itens rejeitados' : 'foi totalmente aprovado'}`,
            ref_id: item.id,
            ref_type: 'post' as const,
          }))
        )
      }
      router.refresh()
    }

    setLoading(false)
    setComment('')
  }

  async function handleApproveItem() {
    if (lightboxIndex === null) return
    await updateItemStatus(items[lightboxIndex].id, 'approved', comment || undefined)
    // Advance to next pending item
    const nextPending = items.findIndex((i, idx) => idx > lightboxIndex && i.status === 'pending')
    if (nextPending !== -1) setLightboxIndex(nextPending)
    else closeLightbox()
  }

  async function handleRejectItem() {
    if (lightboxIndex === null) return
    if (!comment.trim()) { toast.error('Descreva o ajuste necessário'); return }
    await updateItemStatus(items[lightboxIndex].id, 'rejected', comment)
    const nextPending = items.findIndex((i, idx) => idx > lightboxIndex && i.status === 'pending')
    if (nextPending !== -1) setLightboxIndex(nextPending)
    else closeLightbox()
  }

  // Group items by group_name
  const groups = items.reduce<Record<string, PostItem[]>>((acc, item) => {
    const key = item.group_name ?? 'Sem grupo'
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {})

  return (
    <>
      <Card className={`border-0 shadow-sm transition-all ${item.status === 'pending' ? 'ring-1 ring-amber-200' : ''}`}>
        <CardContent className="py-0">
          {/* Header */}
          <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-4 py-4 text-left">
            <div className="w-14 h-14 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <StatusBadge status={item.status} />
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items.length} arquivos</span>
              </div>
              {item.scheduled_date && (
                <p className="text-xs text-gray-400">{format(new Date(item.scheduled_date), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
              )}
              {/* Progress bar */}
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div className="bg-emerald-400 transition-all" style={{ width: `${(approved / items.length) * 100}%` }} />
                    <div className="bg-red-400 transition-all" style={{ width: `${(rejected / items.length) * 100}%` }} />
                  </div>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{approved + rejected}/{items.length}</span>
              </div>
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
          </button>

          {/* Expanded grid */}
          {expanded && (
            <div className="pb-4 border-t border-gray-50 pt-4 space-y-4">
              {item.caption && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-400 mb-1">Observações</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.caption}</p>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-3 text-xs">
                {pending > 0 && <span className="text-amber-600 font-medium">{pending} aguardando</span>}
                {approved > 0 && <span className="text-emerald-600 font-medium">{approved} aprovado{approved !== 1 ? 's' : ''}</span>}
                {rejected > 0 && <span className="text-red-600 font-medium">{rejected} rejeitado{rejected !== 1 ? 's' : ''}</span>}
              </div>

              {/* Groups */}
              {Object.entries(groups).map(([groupName, groupItems]) => (
                <div key={groupName}>
                  {Object.keys(groups).length > 1 && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{groupName}</p>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {groupItems.map((gi) => {
                      const idx = items.findIndex((i) => i.id === gi.id)
                      return (
                        <div
                          key={gi.id}
                          className="relative group cursor-pointer aspect-square rounded-xl overflow-hidden bg-gray-100"
                          onClick={() => setLightboxIndex(idx)}
                        >
                          {gi.media_type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                              <PlayCircle className="w-8 h-8 text-white/70" />
                            </div>
                          ) : (
                            <img src={gi.media_url} alt={gi.title ?? ''} className="w-full h-full object-cover" />
                          )}
                          {/* Status overlay */}
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${
                            gi.status === 'approved' ? 'bg-emerald-500/30' : gi.status === 'rejected' ? 'bg-red-500/30' : 'bg-black/20'
                          }`}>
                            <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                          </div>
                          {/* Status badge */}
                          <div className="absolute top-1 right-1">
                            {gi.status === 'approved' && (
                              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {gi.status === 'rejected' && (
                              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                <X className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Approve all pending shortcut */}
              {pending > 0 && (
                <Button
                  size="sm"
                  onClick={async () => {
                    for (const i of items.filter((i) => i.status === 'pending')) {
                      await updateItemStatus(i.id, 'approved')
                    }
                  }}
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5 w-full"
                >
                  <Check className="w-3.5 h-3.5" />
                  Aprovar todos os {pending} pendentes
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Package Lightbox */}
      {activeLightboxItem && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95" onClick={closeLightbox}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div>
              <p className="text-white font-medium text-sm">{activeLightboxItem.group_name ?? item.title}</p>
              <p className="text-gray-400 text-xs">{(lightboxIndex ?? 0) + 1} / {items.length}</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={activeLightboxItem.status} />
              <button onClick={closeLightbox} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Media */}
          <div className="flex-1 flex items-center justify-center relative min-h-0" onClick={(e) => e.stopPropagation()}>
            {/* Prev */}
            {(lightboxIndex ?? 0) > 0 && (
              <button onClick={() => setLightboxIndex((i) => (i ?? 1) - 1)}
                className="absolute left-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {activeLightboxItem.media_type === 'video' ? (
              <video src={activeLightboxItem.media_url} controls autoPlay className="max-w-[85vw] max-h-full rounded-lg" />
            ) : (
              <img src={activeLightboxItem.media_url} alt={activeLightboxItem.title ?? ''} className="max-w-[85vw] max-h-full rounded-lg object-contain" />
            )}
            {/* Next */}
            {(lightboxIndex ?? 0) < items.length - 1 && (
              <button onClick={() => setLightboxIndex((i) => (i ?? 0) + 1)}
                className="absolute right-3 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Bottom action panel */}
          <div className="bg-white rounded-t-2xl p-4 shrink-0" onClick={(e) => e.stopPropagation()}>
            {activeLightboxItem.status === 'pending' ? (
              <div className="space-y-3">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Comentário (opcional para aprovar, obrigatório para rejeitar)..."
                  rows={2}
                  className="resize-none text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={handleApproveItem} disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
                    <Check className="w-4 h-4" /> Aprovar
                  </Button>
                  <Button onClick={handleRejectItem} disabled={loading} variant="outline" className="flex-1 gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                    <X className="w-4 h-4" /> Solicitar ajuste
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <StatusBadge status={activeLightboxItem.status} />
                  {activeLightboxItem.comment && (
                    <p className="text-sm text-gray-600 italic">&quot;{activeLightboxItem.comment}&quot;</p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={async () => {
                  await updateItemStatus(activeLightboxItem.id, 'pending')
                }} className="w-full text-xs text-gray-500">
                  Desfazer revisão
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Single Item Card ────────────────────────────────────────────────────────

export default function ApprovalCard({ item, type, postItems = [], clientId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [expanded, setExpanded] = useState(item.status === 'pending')
  const [rejecting, setRejecting] = useState(false)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  // Render package card
  if (type === 'post' && item.is_package) {
    return <PackageCard item={item} postItems={postItems} clientId={clientId} />
  }

  const closeLightbox = useCallback(() => setLightbox(false), [])

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeLightbox() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [lightbox, closeLightbox])

  async function handleApprove() {
    setLoading(true)
    const table = TABLE_MAP[type]
    const { error } = await supabase
      .from(table)
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), comment: null })
      .eq('id', item.id)

    if (error) { toast.error('Erro ao aprovar'); setLoading(false); return }

    const staffIds = await getStaffToNotify(supabase, clientId)
    if (staffIds.length > 0) {
      await supabase.from('notifications').insert(
        staffIds.map((uid) => ({
          user_id: uid,
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

    if (error) { toast.error('Erro ao rejeitar'); setLoading(false); return }

    const staffIds = await getStaffToNotify(supabase, clientId)
    if (staffIds.length > 0) {
      await supabase.from('notifications').insert(
        staffIds.map((uid) => ({
          user_id: uid,
          type: 'rejected' as const,
          message: `"${item.title}" foi rejeitado. Motivo: ${comment.trim()}`,
          ref_id: item.id,
          ref_type: type,
        }))
      )
    }

    toast.success('Feedback enviado!')
    router.refresh()
    setRejecting(false)
    setLoading(false)
  }

  return (
    <Card className={`border-0 shadow-sm transition-all ${item.status === 'pending' ? 'ring-1 ring-amber-200' : ''}`}>
      <CardContent className="py-0">
        <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-4 py-4 text-left">
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
              <p className="text-xs text-gray-400">{format(new Date(item.scheduled_date), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
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

        {expanded && (
          <div className="pb-4 border-t border-gray-50 pt-4">
            {type === 'post' && (
              <div className="space-y-3">
                {item.media_url && (
                  item.media_type === 'video' ? (
                    <div className="relative group cursor-zoom-in rounded-xl overflow-hidden" onClick={() => setLightbox(true)}>
                      <video src={item.media_url} className="w-full max-h-80 rounded-xl object-cover pointer-events-none" muted playsInline />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-8 h-8 text-white drop-shadow" />
                      </div>
                    </div>
                  ) : (
                    <div className="relative group cursor-zoom-in rounded-xl overflow-hidden" onClick={() => setLightbox(true)}>
                      <img src={item.media_url} alt={item.title} className="w-full max-h-80 rounded-xl object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                        <ZoomIn className="w-8 h-8 text-white drop-shadow" />
                      </div>
                    </div>
                  )
                )}
                {item.caption && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-400 mb-1">Legenda</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.caption}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'campaign' && item.description && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.description}</p>
              </div>
            )}

            {type === 'insight' && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.body}</p>
              </div>
            )}

            {item.status === 'rejected' && item.comment && (
              <div className="bg-red-50 rounded-lg p-3 mt-3">
                <p className="text-xs font-medium text-red-600 mb-1">Seu feedback</p>
                <p className="text-sm text-red-700">&quot;{item.comment}&quot;</p>
              </div>
            )}

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
                      <Button variant="outline" size="sm" onClick={() => { setRejecting(false); setComment('') }} disabled={loading}>Cancelar</Button>
                      <Button size="sm" onClick={handleReject} disabled={loading} className="bg-red-500 hover:bg-red-600 text-white gap-1.5">
                        <X className="w-3.5 h-3.5" />
                        {loading ? 'Enviando...' : 'Enviar feedback'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleApprove} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {loading ? 'Aprovando...' : 'Aprovar'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRejecting(true)} disabled={loading} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
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

      {/* Single item lightbox */}
      {lightbox && item.media_url && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={closeLightbox}>
          <button className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors" onClick={closeLightbox}>
            <X className="w-5 h-5" />
          </button>
          {item.media_type === 'video' ? (
            <video src={item.media_url} controls autoPlay className="max-w-[90vw] max-h-[90vh] rounded-lg" onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={item.media_url} alt={item.title} className="max-w-[90vw] max-h-[90vh] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </Card>
  )
}
