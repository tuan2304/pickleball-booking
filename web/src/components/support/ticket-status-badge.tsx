import { Badge } from '@/components/ui/badge'
import { TICKET_STATUS, isTicketStatus } from '@/lib/support'

export function TicketStatusBadge({ status, forAdmin = false }: { status: string; forAdmin?: boolean }) {
  const meta = isTicketStatus(status) ? TICKET_STATUS[status] : TICKET_STATUS.closed
  return (
    <Badge variant="outline" className={`text-xs font-semibold ${meta.tone}`}>
      {forAdmin ? meta.adminLabel : meta.label}
    </Badge>
  )
}
