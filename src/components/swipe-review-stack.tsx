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

interface PackageItem {
  id: string
  title: string | null
  media_url: string
  media_type: string
  group_name: string | null
  order_index: number
}

interface PackageModeState {
  postId: string
  postTitle: string
  items: PackageItem[]
  reviewedCount: number
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

// ─── Generic swipe card (posts, campaigns, insights, package items) ───────────
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
        {/* Approve/Reject overlays */}
        <motion.div style={{ opacity: approveOpacity }}
          className="absolute inset-0 bg-emerald-400/20 rounded-3xl z-10 flex items-center justify-start pl-8 pointer-events-none">
          <div className="bg-emerald-500 text-white font-black text-2xl px-4 py-2 rounded-2xl rotate-[-20deg] border-4 border-white shadow-lg">
            APROVAR ✓
          </div>
        </motion.div>
        <motion.div style={{ opacity: rejectOpacity }}
          className="absolute inset-0 bg-red-400/20 rounded-3xl z-10 flex items-center justify-end pr-8 pointer-events-none">
          <div className="bg-red-500 text-white font-black text-2xl px-4 py-2 rounded-2xl rotate-[20deg] border-4 border-white shadow-lg">
            AJUSTE ✗
          </div>
        </motion.div>

        {/* Media area */}
        <div className="flex-1 relative bg-gray-100 overflow-hidden pointer-events-none select-none">
          {item.media_url ? (
            item.media_type === 'video' ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <PlayCircle className="w-16 h-16 text-white/60" />
              </div>
            ) : (
              <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
              {item.type === 'campaign' && <Megaphone className="w-14 h-14 text-gray-300" />}
              {item.type === 'insight' && <Lightbulb className="w-14 h-14 text-gray-300" />}
              {item.type === 'post' && <ImageIcon className="w-14 h-14 text-gray-300" />}
              {item.body && <p className="text-sm text-gray-600 line-clamp-6 whitespace-pre-wrap">{item.body}</p>}
              {item.description && <p className="text-sm text-gray-600 line-clamp-6 whitespace-pre-wrap">{item.description}</p>}
            </div>
          )}

          {/* Type badge */}
          <div className="absolute top-3 left-3">
            {item.type === 'campaign' && (
              <span className="bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                <Megaphone className="w-3 h-3" /> Campanha
              </span>
            )}
            {item.type === 'insight' && (
              <span className="bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> Insight
              </span>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div className="p-4 shrink-0 pointer-events-none select-none">
          <p className="font-bold text-gray-900 text-lg leading-tight">{item.title}</p>
          {item.caption && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.caption}</p>}
          {item.objective && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.objective}</p>}
          {item.specialist_name && <p className="text-xs text-gray-400 mt-1">Por {item.specialist_name}</p>}
          {item.scheduled_date && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(item.scheduled_date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          )}
        </div>
      </motion.div>

      {/* Reject sheet */}
      {showRejectSheet && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40 rounded-3xl">
          <div className="bg-white rounded-t-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-gray-900">Solicitar ajuste</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva o que precisa ser ajustado..."
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

// ─── Package item swipe card (inside package review mode) ────────────────────
function PackageItemSwipeCard({
  item,
  index,
  isTop,
  onApprove,
  onReject,
}: {
  item: PackageItem
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
        onDragEnd={handleDragEnd}
      >
        <motion.div style={{ opacity: approveOpacity }}
          className="absolute inset-0 bg-emerald-400/20 rounded-3xl z-10 flex items-center justify-start pl-8 pointer-events-none">
          <div className="bg-emerald-500 text-white font-black text-2xl px-4 py-2 rounded-2xl rotate-[-20deg] border-4 border-white shadow-lg">APROVAR ✓</div>
        </motion.div>
        <motion.div style={{ opacity: rejectOpacity }}
          className="absolute inset-0 bg-red-400/20 rounded-3xl z-10 flex items-center justify-end pr-8 pointer-events-none">
          <div className="bg-red-500 text-white font-black text-2xl px-4 py-2 rounded-2xl rotate-[20deg] border-4 border-white shadow-lg">AJUSTE ✗</div>
        </motion.div>

        {/* Media */}
        <div className="flex-1 relative bg-gray-100 overflow-hidden pointer-events-none select-none">
          {item.media_type === 'video' ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <PlayCircle className="w-16 h-16 text-white/60" />
            </div>
          ) : (
            <img src={item.media_url} alt={item.title ?? ''} className="w-full h-full object-cover" />
          )}
          {item.group_name && (
            <div className="absolute top-3 left-3">
              <span className="bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full backdrop-blur-sm">
                {item.group_name}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 shrink-0 pointer-events-none select-none">
          <p className="font-semibold text-gray-900">{item.title ?? 'Arquivo'}</p>
          <p className="text-xs text-gray-400 mt-0.5 uppercase">{item.media_type}</p>
        </div>
      </motion.div>

      {/* Reject sheet */}
      {showRejectSheet && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/40 rounded-3xl">
          <div className="bg-white rounded-t-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-semibold text-gray-900">Solicitar ajuste neste arquivo</p>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva o que precisa ser ajustado..."
              rows={3}
              className="resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowRejectSheet(false)}>Cancelar</Button>
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

// ─── Package door card (tap to enter review) ─────────────────────────────────
function PackageDoorCard({ item, index, onEnter }: {
  item: SwipeItem
  index: number
  onEnter: () => void
}) {
  const stackOffset = index * 6
  const stackScale = 1 - index * 0.04

  return (
    <motion.div
      className="absolute inset-0 flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden"
      style={{ zIndex: 10 - index }}
      animate={index > 0 ? { scale: stackScale, y: stackOffset } : { scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="w-24 h-24 rounded-2xl bg-violet-50 flex items-center justify-center">
          <Package className="w-12 h-12 text-violet-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-violet-500 uppercase tracking-wider mb-2">Pacote</p>
          <p className="text-2xl font-bold text-gray-900">{item.title}</p>
          {item.file_count != null && item.file_count > 0 && (
            <p className="text-sm text-gray-400 mt-2">{item.file_count} arquivo{item.file_count !== 1 ? 's' : ''} para revisar</p>
          )}
          {item.caption && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{item.caption}</p>
          )}
          {item.scheduled_date && (
            <p className="text-xs text-gray-400 mt-2">
              {new Date(item.scheduled_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
            </p>
          )}
        </div>
        <p className="text-sm text-gray-400">Toque para revisar arquivo por arquivo</p>
      </div>
      <div className="p-5 border-t border-gray-100">
        <Button className="w-full bg-violet-600 hover:bg-violet-700 gap-2" onClick={onEnter}>
          <Package className="w-4 h-4" /> Revisar arquivos
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Package review mode overlay ─────────────────────────────────────────────
function PackageReviewMode({
  state,
  supabase,
  clientId,
  onFinish,
  onBack,
}: {
  state: PackageModeState
  supabase: ReturnType<typeof createClient>
  clientId: string
  onFinish: () => void
  onBack: () => void
}) {
  const [items, setItems] = useState(state.items)
  const [approvedCount, setApprovedCount] = useState(0)
  const [rejectedCount, setRejectedCount] = useState(0)
  const [done, setDone] = useState(false)
  const total = state.items.length
  const reviewed = approvedCount + rejectedCount

  const current = items[0]

  async function finalize(totalApproved: number, totalRejected: number) {
    const anyRejected = totalRejected > 0
    const postStatus = anyRejected ? 'rejected' : 'approved'
    await supabase.from('posts')
      .update({ status: postStatus, reviewed_at: new Date().toISOString() })
      .eq('id', state.postId)

    try {
      const staffIds = await getStaffToNotify(supabase, clientId)
      if (staffIds.length > 0) {
        await supabase.from('notifications').insert(
          staffIds.map((uid) => ({
            user_id: uid,
            type: postStatus as 'approved' | 'rejected',
            message: `Pacote "${state.postTitle}": ${totalApproved} aprovado${totalApproved !== 1 ? 's' : ''}, ${totalRejected} com ajuste`,
            ref_id: state.postId,
            ref_type: 'post',
          }))
        )
      }
    } catch (_) { /* silent */ }

    setDone(true)
  }

  async function handleItemApprove() {
    if (!current) return
    const { error } = await supabase.from('post_items')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), comment: null })
      .eq('id', current.id)

    if (error) { toast.error(`Erro: ${error.message}`); return }

    const newApproved = approvedCount + 1
    setApprovedCount(newApproved)
    const newItems = items.slice(1)
    setItems(newItems)

    if (newItems.length === 0) {
      await finalize(newApproved, rejectedCount)
    }
  }

  async function handleItemReject(comment: string) {
    if (!current) return
    const { error } = await supabase.from('post_items')
      .update({ status: 'rejected', comment: comment.trim(), reviewed_at: new Date().toISOString() })
      .eq('id', current.id)

    if (error) { toast.error(`Erro: ${error.message}`); return }

    const newRejected = rejectedCount + 1
    setRejectedCount(newRejected)
    const newItems = items.slice(1)
    setItems(newItems)

    if (newItems.length === 0) {
      await finalize(approvedCount, newRejected)
    }
  }

  async function handleApproveAll() {
    const { error } = await supabase.from('post_items')
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), comment: null })
      .in('id', items.map((i) => i.id))

    if (error) { toast.error(`Erro: ${error.message}`); return }

    const totalApproved = approvedCount + items.length
    setApprovedCount(totalApproved)
    setItems([])
    await finalize(totalApproved, rejectedCount)
  }

  // Summary screen after all items reviewed
  if (done) {
    return (
      <div className="absolute inset-0 z-50 flex flex-col bg-gray-50">
        <div className="flex flex-col items-center justify-center flex-1 gap-6 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center">
            <Package className="w-10 h-10 text-violet-500" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">Pacote revisado!</p>
            <p className="text-sm text-gray-500 mt-1">{state.postTitle}</p>
          </div>

          {/* Breakdown bar */}
          <div className="w-full max-w-xs">
            <div className="flex rounded-full overflow-hidden h-3 mb-3">
              {approvedCount > 0 && (
                <div
                  className="bg-emerald-400 transition-all"
                  style={{ width: `${(approvedCount / total) * 100}%` }}
                />
              )}
              {rejectedCount > 0 && (
                <div
                  className="bg-red-400 transition-all"
                  style={{ width: `${(rejectedCount / total) * 100}%` }}
                />
              )}
            </div>
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-sm font-semibold text-gray-700">{approvedCount} aprovado{approvedCount !== 1 ? 's' : ''}</span>
              </div>
              {rejectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <span className="text-sm font-semibold text-gray-700">{rejectedCount} com ajuste</span>
                </div>
              )}
            </div>
          </div>

          <Button className="bg-violet-600 hover:bg-violet-700 mt-2" onClick={onFinish}>
            Continuar revisão
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 bg-gray-50">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200">
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="text-center flex-1 min-w-0 px-2">
          <p className="text-xs text-violet-500 font-semibold truncate">{state.postTitle}</p>
          <p className="text-sm font-semibold text-gray-700">{reviewed + 1} de {total}</p>
          <div className="flex gap-1 mt-1 justify-center">
            {state.items.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${i < reviewed ? 'bg-emerald-400' : i === reviewed ? 'bg-violet-500' : 'bg-gray-200'}`}
                style={{ width: `${Math.max(16, 160 / total)}px` }}
              />
            ))}
          </div>
        </div>
        <div className="w-9" />
      </div>

      {/* Card stack */}
      <div className="flex-1 relative mx-4 my-3" style={{ touchAction: 'none' }}>
        {items.slice(0, 3).map((item, i) => (
          <PackageItemSwipeCard
            key={item.id}
            item={item}
            index={i}
            isTop={i === 0}
            onApprove={handleItemApprove}
            onReject={handleItemReject}
          />
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-8 pt-2 shrink-0">
        <button
          onClick={() => {
            const comment = window.prompt('Descreva o ajuste necessário:')
            if (comment !== null) {
              if (!comment.trim()) { toast.error('Escreva o motivo'); return }
              handleItemReject(comment)
            }
          }}
          className="w-16 h-16 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-red-400 hover:bg-red-50 active:scale-95 transition-all"
        >
          <X className="w-7 h-7" />
        </button>
        <button
          onClick={handleItemApprove}
          className="w-20 h-20 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center text-white hover:bg-emerald-600 active:scale-95 transition-all"
        >
          <Check className="w-9 h-9" />
        </button>
        <div className="w-16 h-16" />
      </div>
      <p className="text-center text-xs text-gray-300 pt-1 shrink-0">← rejeitar · aprovar →</p>
      {/* Approve all shortcut */}
      <button
        onClick={handleApproveAll}
        className="mx-5 mb-5 mt-2 py-2.5 rounded-xl text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition-all shrink-0"
      >
        Aprovar todos os {items.length} arquivo{items.length !== 1 ? 's' : ''} restantes
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SwipeReviewStack({ items: initialItems, clientId }: { items: SwipeItem[]; clientId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [reviewed, setReviewed] = useState(0)
  const [packageMode, setPackageMode] = useState<PackageModeState | null>(null)
  const [loadingPackage, setLoadingPackage] = useState(false)
  const total = initialItems.length
  const current = items[0]

  async function enterPackageMode(item: SwipeItem) {
    setLoadingPackage(true)
    const { data, error } = await supabase
      .from('post_items')
      .select('id, title, media_url, media_type, group_name, order_index')
      .eq('post_id', item.id)
      .eq('status', 'pending')
      .order('order_index')

    setLoadingPackage(false)

    if (error) { toast.error('Erro ao carregar arquivos'); return }

    if (!data || data.length === 0) {
      // Package has no pending items — remove from queue automatically
      toast.info('Pacote sem arquivos pendentes', { duration: 2000 })
      setReviewed((r) => r + 1)
      setItems((prev) => prev.slice(1))
      return
    }

    setPackageMode({
      postId: item.id,
      postTitle: item.title,
      items: data as PackageItem[],
      reviewedCount: 0,
    })
  }

  function handlePackageFinish() {
    setPackageMode(null)
    setReviewed((r) => r + 1)
    setItems((prev) => prev.slice(1))
  }

  async function handleApprove() {
    if (!current || current.is_package) return
    const { error } = await supabase
      .from(TABLE_MAP[current.type])
      .update({ status: 'approved', reviewed_at: new Date().toISOString(), comment: null })
      .eq('id', current.id)

    if (error) { toast.error(`Erro ao aprovar: ${error.message}`); return }

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
    } catch (_) { /* silent */ }

    toast.success('Aprovado! ✓', { duration: 1500 })
    setReviewed((r) => r + 1)
    setItems((prev) => prev.slice(1))
  }

  async function handleReject(comment: string) {
    if (!current || current.is_package) return
    const { error } = await supabase
      .from(TABLE_MAP[current.type])
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), comment: comment.trim() })
      .eq('id', current.id)

    if (error) { toast.error(`Erro ao rejeitar: ${error.message}`); return }

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
    } catch (_) { /* silent */ }

    toast.error('Feedback enviado', { duration: 1500 })
    setReviewed((r) => r + 1)
    setItems((prev) => prev.slice(1))
  }

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
    <div className="flex flex-col h-full relative">
      {/* Package review mode overlay */}
      {packageMode && (
        <PackageReviewMode
          state={packageMode}
          supabase={supabase}
          clientId={clientId}
          onFinish={handlePackageFinish}
          onBack={() => setPackageMode(null)}
        />
      )}

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
        <div className="w-9" />
      </div>

      {/* Card stack */}
      <div className="flex-1 relative mx-4 my-3" style={{ touchAction: 'none' }}>
        {/* Background stack */}
        {items.slice(1, 3).map((item, i) => (
          item.is_package ? (
            <PackageDoorCard key={item.id} item={item} index={i + 1} onEnter={() => {}} />
          ) : (
            <SwipeCard key={item.id} item={item} index={i + 1} isTop={false} onApprove={handleApprove} onReject={handleReject} />
          )
        ))}
        {/* Top card */}
        {current.is_package ? (
          <PackageDoorCard
            key={current.id}
            item={current}
            index={0}
            onEnter={() => enterPackageMode(current)}
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
        {/* Loading overlay */}
        {loadingPackage && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 rounded-3xl">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Action buttons — only for non-package top card */}
      {!current.is_package && (
        <>
          <div className="flex items-center justify-center gap-8 pb-8 pt-2 shrink-0">
            <button
              onClick={() => {
                const comment = window.prompt('Descreva o ajuste necessário:')
                if (comment !== null) {
                  if (!comment.trim()) { toast.error('Escreva o motivo'); return }
                  handleReject(comment)
                }
              }}
              className="w-16 h-16 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center text-red-400 hover:bg-red-50 active:scale-95 transition-all"
            >
              <X className="w-7 h-7" />
            </button>
            <button
              onClick={handleApprove}
              className="w-20 h-20 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center text-white hover:bg-emerald-600 active:scale-95 transition-all"
            >
              <Check className="w-9 h-9" />
            </button>
            <div className="w-16 h-16" />
          </div>
          <p className="text-center text-xs text-gray-300 pb-4 shrink-0">← rejeitar · aprovar →</p>
        </>
      )}
    </div>
  )
}
