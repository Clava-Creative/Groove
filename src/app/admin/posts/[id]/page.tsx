import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ArrowLeft, Package, ImageIcon, Package2 } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { PostItem } from '@/types/database'

export default async function AdminPostDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('posts')
    .select('*, clients(name, primary_color), post_items(*)')
    .eq('id', params.id)
    .single()

  if (!post) notFound()

  const client = post.clients as unknown as { name: string; primary_color: string | null } | null
  const postItems = (post as unknown as { post_items: PostItem[] }).post_items ?? []
  const sortedItems = [...postItems].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      {/* Back */}
      <Link href="/admin/posts" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 w-fit">
        <ArrowLeft className="w-4 h-4" /> Posts
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
            {post.is_package && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex items-center gap-1">
                <Package2 className="w-3 h-3" /> Pacote
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {client?.name && (
              <span
                className="inline-block px-2 py-0.5 rounded-full text-white text-xs font-medium mr-2"
                style={{ backgroundColor: client.primary_color ?? '#7c3aed' }}
              >
                {client.name}
              </span>
            )}
            {format(new Date(post.scheduled_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="shrink-0 mt-1">
          <StatusBadge status={post.status} />
        </div>
      </div>

      {/* Single media */}
      {!post.is_package && post.media_url && (
        <div className="mb-6 rounded-xl overflow-hidden bg-gray-100">
          {post.media_type === 'video' ? (
            <video src={post.media_url} controls className="w-full max-h-96 object-contain" />
          ) : (
            <img src={post.media_url} alt={post.title} className="w-full max-h-96 object-contain" />
          )}
        </div>
      )}

      {/* No media placeholder */}
      {!post.is_package && !post.media_url && (
        <div className="mb-6 rounded-xl bg-gray-50 border border-dashed border-gray-200 h-40 flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Sem mídia</p>
          </div>
        </div>
      )}

      {/* Package items */}
      {post.is_package && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">
              {sortedItems.length} arquivo{sortedItems.length !== 1 ? 's' : ''} no pacote
            </p>
          </div>
          {sortedItems.length === 0 ? (
            <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 h-24 flex items-center justify-center">
              <p className="text-xs text-gray-400">Sem arquivos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sortedItems.map((item, i) => (
                <div key={item.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                  {item.media_type === 'video' ? (
                    <video src={item.media_url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={item.media_url} alt={item.title ?? `Item ${i + 1}`} className="w-full h-full object-cover" />
                  )}
                  {/* Status overlay */}
                  <div className="absolute top-1.5 right-1.5">
                    <StatusBadge status={item.status} />
                  </div>
                  {/* Index */}
                  <div className="absolute bottom-1.5 left-1.5 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white">{i + 1}</span>
                  </div>
                  {/* Rejection comment */}
                  {item.comment && item.status === 'rejected' && (
                    <div className="absolute inset-0 bg-red-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                      <p className="text-[10px] text-white text-center italic">&quot;{item.comment}&quot;</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Caption */}
      {post.caption && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2">Legenda / Observações</p>
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
          </div>
        </div>
      )}

      {/* Client feedback */}
      {post.comment && (
        <div className={`rounded-xl p-4 ${post.status === 'rejected' ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-100'}`}>
          <p className={`text-xs font-semibold mb-1.5 ${post.status === 'rejected' ? 'text-red-600' : 'text-emerald-700'}`}>
            Comentário do cliente
          </p>
          <p className={`text-sm italic leading-relaxed ${post.status === 'rejected' ? 'text-red-700' : 'text-emerald-800'}`}>
            &quot;{post.comment}&quot;
          </p>
        </div>
      )}
    </div>
  )
}
