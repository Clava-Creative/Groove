import { Badge } from '@/components/ui/badge'
import type { ApprovalStatus } from '@/types/database'

const config = {
  pending: { label: 'Aguardando', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  approved: { label: 'Aprovado', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { label: 'Rejeitado', className: 'bg-red-50 text-red-700 border-red-200' },
}

export default function StatusBadge({ status }: { status: ApprovalStatus }) {
  const { label, className } = config[status]
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
