'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Check, X, ImageIcon, PlayCircle, Megaphone, Lightbulb, ChevronLeft, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'

export interface SwipeItem {
  id: string
  type: 'post' | 'campaign' | 'insight'
  title: string
  is_package?: boolean
  file_count?: number
  caption?: string | null
  media_url?: string | null
  media_type?: string | null
  body?: string | null
  description?: string | null
  objective?: string | null
  scheduled_date?: string | null
  specialist_name?: string | null
}

const TABLE_MAP = { post: 'posts', campaign: 'campaigns', insight: 'insights' } as const
const SWIPE_THRESHOLD = 100

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

function SwipeCard({
  item,
  onApprove,
  onReject,
  isTop,
  index,
}: {
  item: SwipeItem
  onApprove: () => void
  onReject: (comment: string) => void
  isTop: boolean
  index: number
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18])
  const approveOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1])
  const rejectOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0])
  const [showRejectSheet, setShowRejectSheet] = useState(false)
  const [comment, setComment] = useState('')
  const [leaving, setLeaving] = useState(false)
  const dragStartX = useRef(0)

  const flyOut = useCallback(async (direction: 'left' | 'right') => {
    setLeaving(true)
    await animate(x, direction === 'right' ? 500 : -500, { duration: 0.3, ease: 'easeOut' })
    if (direction === 'right') onApprove()
    else onReject(comment)
  }, [x, comment, onApprove, onReject])

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      flyOut('right')
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      if (!comment.trim()) {
        // Snap back and show comment sheet
        animate(x, 0, { type: 'spring', stiffness: 300 })
        setShowRejectSheet(true)
      } else {
        flyOut('left')
      }
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300 })
    }
  }

  const stackOffset = index * 6
  const stackScale = 1 - index * 0.04

  return (
    <>
      <motion.div
        className="absolute inset-0"
        style={{
          x: isTop ? x : 0,
          rotate: isTop ? rotate : 0,
          scale: stackScale,
          y: stackOffset,
          zIndex: 10 - index,
        }}
        drag={isTop && !leaving ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.8}
        onDragEnd={handleDragEnd}
        onDragStart={(_, info) => { dragStartX.current = info.point.x }}
      >
        <div className="w-full h-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col select-none">
          {/* Media / Content area */}
          <div className="flex-1 relative overflow-hidden bg-gray-50">
            {item.type === 'post' && item.media_url ? (
              item.media_type === 'video' ? (
                <video
                  src={item.media_url}
                  className="w-full h-full object-cover pointer-events-none"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={item.media_url}
                  alt={item.title}
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
              )
            ) : item.type === 'post' ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-gray-300">
                <ImageIcon className="w-16 h-16" />
                <span className="text-sm">Sem mídia</span>
              </div>
            ) : item.type === 'campaign' ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
                  <Megaphone className="w-8 h-8 text-violet-400" />
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description || item.objective || 'Campanha para aprovação'}</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                  <Lightbulb className="w-8 h-8 text-amber-400" />
                </div>
                <p className="text-gray-600 text-sm leading-relaxed line-clamp-6">{item.body}</p>
              </div>
            )}

            {/* Video play icon overlay */}
            {item.type === 'post' && item.media_type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-black/30 flex items-center justify-center">
                  <PlayCircle className="w-10 h-10 text-white" />
                </div>
              </div>
            )}

            {/* Approve overlay */}
            <motion.div
              className="absolute inset-0 bg-emerald-400/20 flex items-center justify-center pointer-events-none"
              style={{ opacity: approveOpacity }}
            >
              <div className="border-4 border-emerald-500 rounded-2xl px-6 py-3 rotate-[-15deg]">
                <span className="text-emerald-500 font-black text-3xl tracking-widest">APROVAR</span>
              </div>
            </motion.div>

            {/* Reject overlay */}
            <motion.div
              className="absolute inset-0 bg-red-400/20 flex items-center justify-center pointer-events-none"
              style={{ opacity: rejectOpacity }}
            >
              <div className="border-4 border-red-500 rounded-2xl px-6 py-3 rotate-[15deg]">
                <span className="text-red-500 font-black text-3xl tracking-widest">NEGAR</span>
              </div>
            </motion.div>
          </div>

          {/* Bottom info */}
          <div className="p-4 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                {item.caption && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.caption}</p>}
                {item.specialist_name && <p className="text-xs text-gray-400 mt-0.5">Por {item.specialist_name}</p>}
                {item.scheduled_date && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(item.scheduled_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                  </p>
                )}
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0 capitalize">
                {item.type === 'post' ? 'Post' : item.type === 'campaign' ? 'Campanha' : 'Insight'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Reject comment sheet */}
      {showRejectSheet && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end" onClick={() => setShowRejectSheet(false)}>
          <div
            className="bg-white rounded-t-3xl p-5 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <p className="font-semibold text-gray-900">O que precisa ser ajustado?</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva o ajuste necessário..."
              rows={3}
              className="resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowRejectSheet(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-1.5"
                onClick={() => {
                  if (!comment.trim()) { toast.error('Escreva o motivo'); return }
                  setShowRejectSheet(false)
                  flyOut('left')
                }}
              >
                <X className="w-4 h-4" /> Enviar feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Package card (swipeable — approves/rejects all items at once) ────────────
function PackageSwipeCard({
  item,
  index,
  isTop,
  onApprove,
  onReject,
}: {
  item: SwipeItem
  index: number
  isTop: boolean
  onApprove: () => void
  onReject: (comment: string) => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18])
  const approveOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1])
  const rejectOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0])
  const [showRejectSheet, setShowRejectSheet] = useState(false)
  const [comment, setComment] = useState('')
  const [leaving, setLeaving] = useState(false)
  const dragStartX = useRef(0)

  const flyOut = useCallback(async (direction: 'left' | 'right') => {
    setLeaving(true)
    await animate(x, direction === 'right' ? 500 : -500, { duration: 0.3, ease: 'easeOut' })
    if (direction === 'right') onApprove()
    else onReject(comment)
  }, [x, comment, onApprove, onReject])

  function handleDragEnd(_: unknown, info: { offset: { x: number } }) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      flyOut('right')
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      if (!comment.trim()) {
        animate(x, 0, { type: 'spring', stiffness: 300 })
        setShowRejectSheet(true)
      } else {
        flyOut('left')
      }
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300 })
    }
  }

  const stackOffset = index * 6
  const stackScale = 1 - index * 0.04

  return (
    <>
      <motion.div
        className="absolute inset-0 flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden cursor-grab active:cursor-grabbing"
        style={isTop ? { x, rotate, zIndex: 10 } : {
          zIndex: 10 - index,
          bottom: stackOffset,
          top: -stackOffset,
          scale: stackScale,
        }}
        drag={isTop && !leaving ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragStart={(_, info) => { dragStartX.current = info.point.x }}
        onDragEnd={handleDragEnd}
      >
        {/* Approve overlay */}
        <motion.div style={{ opacity: approveOpacity }}
          className="absolute inset-0 bg-emerald-400/20 rounded-3xl z-10 flex items-center justify-start pl-8 pointer-events-none">
          <div className="bg-emerald-500 text-white font-black text-2xl px-4 py-2 rounded-2xl rotate-[-20deg] border-4 border-white shadow-lg">
            APROVAR TUDO ✓
          </div>
        </motion.div>

        {/* Reject overlay */}
        <motion.div style={{ opacity: rejectOpacity }}
          className="absolute inset-0 bg-red-400/20 rounded-3xl z-10 flex items-center justify-end pr-8 pointer-events-none">
          <div className="bg-red-500 text-white font-black text-2xl px-4 py-2 rounded-2xl rotate-[20deg] border-4 border-white shadow-lg">
            AJUSTE ✗
          </div>
        </motion.div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center pointer-events-none select-none">
          <div className="w-20 h-20 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Package className="w-10 h-10 text-violet-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-1">Pacote</p>
            <p className="text-xl font-bold text-gray-900">{item.title}</p>
            {item.file_count != null && item.file_count > 0 && (
              <p className="text-sm text-gray-400 mt-1">{item.file_count} arquivo{item.file_count !== 1 ? 's' : ''}</p>
            )}
            {item.scheduled_date && (
              <p className="text-xs text-gray-400 mt-2">
                {new Date(item.scheduled_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
              </p>
            )}
          </div>
          {isTop && (
            <div className="flex items-center gap-3 mt-2 text-gray-300">
              <div className="flex items-center gap-1 text-xs">
                <X className="w-3.5 h-3.5 text-red-300" /> arraste para rejeitar
              </div>
              <div className="w-px h-4 bg-gray-200" />
              <div className="flex items-center gap-1 text-xs">
                arraste para aprovar <Check className="w-3.5 h-3.5 text-emerald-300" />
              </div>
            </div>
          )}
        </div>

        {/* Caption */}
        {item.caption && (
          <div className="mx-5 mb-4 bg-gray-50 rounded-xl p-3 pointer-events-none">
            <p className="text-xs text-gray-500 line-clamp-2">{item.caption}</p>
          </div>
        )}
      </motion.div>

      {/* Reject comment sheet */}
      {showRejectSheet && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40 rounded-3xl">
          <div className="bg-white rounded-t-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-gray-900">Solicitar ajuste no pacote</p>
            <p className="text-sm text-gray-400">O que precisa ser ajustado?</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva o ajuste necessário..."
              rows={3}
              className="resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowRejectSheet(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-1.5"
                onClick={() => {
                  if (!comment.trim()) { toast.error('Escreva o motivo'); return }
                  setShowRejectSheet(false)
                  flyOut('left')
                }}
              >
                <X className="w-4 h-4" /> Enviar feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function SwipeReviewStack({ items: initialItems, clientId }: { items: SwipeItem[]; clientId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [reviewed, setReviewed] = useState(0)
  const total = initialItems.length

  const current = items[0]

  async function handleApprove() {
    if (!current) return

    if (current.is_package) {
      // Approve all pending post_items + update post status
      const { data: postItems } = await supabase
        .from('post_items').select('id').eq('post_id', current.id).eq('status', 'pending')
      if (postItems && postItems.length > 0) {
        await supabase.from('post_items')
          .update({ status: 'approved', reviewed_at: new Date().toISOString() })
          .eq('post_id', current.id).eq('status', 'pending')
      }
      const { error } = await supabase.from('posts')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', current.id)
      if (error) { toast.error(`Erro ao aprovar: ${error.message}`); return }
    } else {
      const { error } = await supabase
        .from(TABLE_MAP[current.type])
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), comment: null })
        .eq('id', current.id)
      if (error) { toast.error(`Erro ao aprovar: ${error.message}`); return }
    }

    try {
      const staffIds = await getStaffToNotify(supabase, clientId)
      if (staffIds.length > 0) {
        await supabase.from('notifications').insert(
          staffIds.map((uid) => ({
            user_id: uid,
            type: 'approved' as const,
            message: `"${current.title}" foi aprovado pelo cliente`,
            ref_id: current.id,
            ref_type: current.type,
          }))
        )
      }
    } catch (_) { /* notification failure doesn't block */ }

    toast.success('Aprovado! ✓', { duration: 1500 })
    setReviewed((r) => r + 1)
    setItems((prev) => prev.slice(1))
  }

  async function handleReject(comment: string) {
    if (!current) return

    if (current.is_package) {
      // Reject all pending post_items + update post status
      await supabase.from('post_items')
        .update({ status: 'rejected', comment: comment.trim(), reviewed_at: new Date().toISOString() })
        .eq('post_id', current.id).eq('status', 'pending')
      const { error } = await supabase.from('posts')
        .update({ status: 'rejected', comment: comment.trim(), reviewed_at: new Date().toISOString() })
        .eq('id', current.id)
      if (error) { toast.error(`Erro ao rejeitar: ${error.message}`); return }
    } else {
      const { error } = await supabase
        .from(TABLE_MAP[current.type])
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), comment: comment.trim() })
        .eq('id', current.id)
      if (error) { toast.error(`Erro ao rejeitar: ${error.message}`); return }
    }

    try {
      const staffIds = await getStaffToNotify(supabase, clientId)
      if (staffIds.length > 0) {
        await supabase.from('notifications').insert(
          staffIds.map((uid) => ({
            user_id: uid,
            type: 'rejected' as const,
            message: `"${current.title}" foi rejeitado. Motivo: ${comment.trim()}`,
            ref_id: current.id,
            ref_type: current.type,
          }))
        )
      }
    } catch (_) { /* notification failure doesn't block */ }

    toast.error('Feedback enviado', { duration: 1500 })
    setReviewed((r) => r + 1)
    setItems((prev) => prev.slice(1))
  }

  // All done
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
          <Check className="w-10 h-10 text-emerald-500" />
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">Tudo revisado!</p>
          <p className="text-sm text-gray-500 mt-1">{reviewed} item{reviewed !== 1 ? 'ns' : ''} revisado{reviewed !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => router.push('/client')} className="bg-violet-600 hover:bg-violet-700">
          Voltar ao início
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => router.push('/client')} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">{reviewed + 1} de {total}</p>
          <div className="flex gap-1 mt-1">
            {initialItems.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${i < reviewed ? 'bg-emerald-400' : i === reviewed ? 'bg-violet-500' : 'bg-gray-200'}`}
                style={{ width: `${Math.max(24, 180 / total)}px` }}
              />
            ))}
          </div>
        </div>
        <div className="w-9" /> {/* spacer */}
      </div>

      {/* Card stack */}
      <div className="flex-1 relative mx-4 my-3" style={{ touchAction: 'none' }}>
        {/* Background cards (stack effect) */}
        {items.slice(1, 3).map((item, i) => (
          <SwipeCard
            key={item.id}
            item={item}
            index={i + 1}
            isTop={false}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
        {/* Top card — package or regular */}
        {current.is_package ? (
          <PackageSwipeCard
            key={current.id}
            item={current}
            index={0}
            isTop={true}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ) : (
          <SwipeCard
            key={current.id}
            item={current}
            index={0}
            isTop={true}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-8 pb-8 pt-2 shrink-0">
        <button
          onClick={() => {
            // Trigger reject — SwipeCard handles comment via sheet, but here we need to trigger it
            // For the button, we'll show a simple prompt
            const comment = window.prompt('Descreva o ajuste necessário:')
            if (comment !== null) {
              if (!comment.trim()) { toast.error('Escreva o motivo'); return }
              handleReject(comment)
            }
          }}
          className="w-16 h-16 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-red-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 active:scale-95 transition-all"
        >
          <X className="w-7 h-7" />
        </button>
        <button
          onClick={handleApprove}
          className="w-20 h-20 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center text-white hover:bg-emerald-600 active:scale-95 transition-all"
        >
          <Check className="w-9 h-9" />
        </button>
        <div className="w-16 h-16" /> {/* spacer for symmetry */}
      </div>

      {/* Hint */}
      <p className="text-center text-xs text-gray-300 pb-4 shrink-0">
        ← arraste para negar · aprovar para direita →
      </p>
    </div>
  )
}
