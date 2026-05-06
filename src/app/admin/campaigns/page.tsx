import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Megaphone } from 'lucide-react'
import Link from 'next/link'
import StatusBadge from '@/components/status-badge'

export default async function AdminCampaignsPage() {
  const supabase = await createClient()
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*, clients(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
          <p className="text-sm text-gray-500 mt-1">{campaigns?.length ?? 0} campanhas</p>
        </div>
        <Link href="/admin/campaigns/new">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4" /> Nova campanha
          </Button>
        </Link>
      </div>

      {campaigns?.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma campanha ainda</p>
            <Link href="/admin/campaigns/new">
              <Button className="mt-4 gap-2 bg-violet-600 hover:bg-violet-700">
                <Plus className="w-4 h-4" /> Nova campanha
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {campaigns?.map((campaign) => (
            <Card key={campaign.id} className="border-0 shadow-sm">
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{campaign.title}</p>
                      <StatusBadge status={campaign.status} />
                    </div>
                    {campaign.objective && <p className="text-sm text-gray-500">{campaign.objective}</p>}
                    {campaign.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{campaign.description}</p>}
                    <p className="text-xs text-gray-400 mt-2">{(campaign.clients as unknown as { name: string } | null)?.name}</p>
                  </div>
                  {campaign.comment && (
                    <p className="text-xs text-gray-400 italic max-w-xs ml-4">"{campaign.comment}"</p>
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
