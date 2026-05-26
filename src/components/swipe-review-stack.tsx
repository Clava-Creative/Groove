'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Check, X, ImageIcon, PlayCircle, Megaphone, Lightbulb, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'

export interface SwipeItem {
  id: string
  type: 'post' | 'campaign' | 'insight'
  title: string
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

export default function SwipeReviewStack({ items: initialItems }: { items: SwipeItem[] }) {
  const supabase = createClient()
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [reviewed, setReviewed] = useState(0)
  const total = initialItems.length

  const current = items[0]

  async function handleApprove() {
    if (!current) return
    const table = TABLE_MAP[current.type]
    await supabase.from(table).update({ status: 'approved', reviewed_at: new Date().toISOString(), comment: null }).eq('id', current.id)

    // Notify admins
    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin')
    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map((a) => ({
          user_id: a.id,
          type: 'approved' as const,
          message: `"${current.title}" foi aprovado pelo cliente`,
          ref_id: current.id,
          ref_type: current.type,
        }))
      )
    }

    toast.success('Aprovado! ✓', { duration: 1500 })
    setReviewed((r) => r + 1)
    setItems((prev) => prev.slice(1))
  }

  async function handleReject(comment: string) {
    if (!current) return
    const table = TABLE_MAP[current.type]
    await supabase.from(table).update({ status: 'rejected', reviewed_at: new Date().toISOString(), comment: comment.trim() }).eq('id', current.id)

    const { data: admins } = await supabase.from('users').select('id').eq('role', 'admin')
    if (admins && admins.length > 0) {
      await supabase.from('notifications').insert(
        admins.map((a) => ({
          user_id: a.id,
          type: 'rejected' as const,
          message: `"${current.title}" foi rejeitado. Motivo: ${comment.trim()}`,
          ref_id: current.id,
          ref_type: current.type,
        }))
      )
    }

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
        {items.slice(0, 3).map((item, i) => (
          <SwipeCard
            key={item.id}
            item={item}
            index={i}
            isTop={i === 0}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
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
