import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ImageIcon } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default async function AdminPostsPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('posts')
    .select('*, clients(name)')
    .order('scheduled_date', { ascending: false })

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
          <p className="text-sm text-gray-500 mt-1">{posts?.length ?? 0} posts cadastrados</p>
        </div>
        <Link href="/admin/posts/new">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Novo post
          </Button>
        </Link>
      </div>

      {posts?.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhum post ainda</p>
            <Link href="/admin/posts/new">
              <Button className="mt-4 gap-2 bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4" /> Novo post
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {posts?.map((post) => (
            <Card key={post.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  {post.media_url ? (
                    <img
                      src={post.media_url}
                      alt={post.title}
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold text-gray-900">{post.title}</p>
                      <StatusBadge status={post.status} />
                    </div>
                    <p className="text-sm text-gray-500 truncate">{post.caption}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {(post.clients as unknown as { name: string } | null)?.name} ·{' '}
                      {format(new Date(post.scheduled_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  {post.comment && (
                    <div className="max-w-xs">
                      <p className="text-xs text-gray-400 italic">"{post.comment}"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
