'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  clientId: string
  clientName: string
}

export default function DeleteClientButton({ clientId, clientName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const confirmed = window.confirm(
      `Excluir "${clientName}"?\n\nIsso vai remover permanentemente todos os posts, campanhas, insights e o acesso do cliente. Essa ação não pode ser desfeita.`
    )
    if (!confirmed) return

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/clients/${clientId}`, { method: 'DELETE' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Erro ao excluir cliente')

      toast.success(`"${clientName}" foi excluído`)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 disabled:opacity-50"
      title={`Excluir ${clientName}`}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
