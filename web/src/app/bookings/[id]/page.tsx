import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MainHeader } from '@/components/layout/main-header'
import { BookingPaymentView } from '@/components/booking/booking-payment-view'

interface BookingPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/bookings/${id}`)
  }

  // Lấy booking kèm thông tin court, club và payment
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      court:courts (
        id,
        name,
        sport_type,
        club:clubs (
          id,
          name,
          address
        )
      ),
      payments (*)
    `)
    .eq('id', id)
    .single()

  if (!booking) {
    notFound()
  }

  const courtData = (booking as any).court || { name: 'Sân tiêu chuẩn', sport_type: 'Thể thao' }
  const clubData = courtData.club || { name: 'Cụm sân thể thao', address: 'Địa chỉ cụm sân' }
  const paymentData = (booking as any).payments?.[0] || null

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MainHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <BookingPaymentView
          booking={{
            id: booking.id,
            court_id: booking.court_id,
            start_time: booking.start_time,
            end_time: booking.end_time,
            total_price: Number(booking.total_price),
            deposit_amount: Number(booking.deposit_amount),
            status: booking.status,
            expires_at: booking.expires_at,
          }}
          payment={paymentData}
          court={courtData}
          club={clubData}
        />
      </main>
    </div>
  )
}
