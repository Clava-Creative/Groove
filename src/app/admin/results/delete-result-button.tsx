'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function DeleteResultButton({ id }: { id: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    const { error } = await supabase.from('results').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir')
    } else {
      toast.success('Resultado excluído')
      router.refresh()
    }
    setLoading(false)
    setConfirm(false)
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Excluir?</span>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setConfirm(false)}>Não</Button>
        <Button size="sm" onClick={handleDelete} disabled={loading} className="h-7 text-xs bg-red-500 hover:bg-red-600 text-white">
          {loading ? '...' : 'Sim'}
        </Button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
