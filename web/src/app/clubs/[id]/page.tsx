import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MainHeader } from '@/components/layout/main-header'
import { TimeSlotPicker } from '@/components/booking/time-slot-picker'
import { ClubReviewsSection } from '@/components/clubs/club-reviews-section'
import { getClubReviews } from '@/app/actions/reviews'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, ArrowLeft, ShieldCheck, Trophy, Sparkles } from 'lucide-react'

interface ClubDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function ClubDetailPage({ params }: ClubDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Lấy thông tin cụm sân
  const { data: club } = await supabase
    .from('clubs')
    .select('*')
    .eq('id', id)
    .single()

  if (!club) {
    notFound()
  }

  // 2. Lấy danh sách sân con & bảng giá linh hoạt
  const { data: courts } = await supabase
    .from('courts')
    .select(`
      id,
      name,
      sport_type,
      surface_type,
      base_price_per_hour,
      deposit_percentage,
      is_active,
      court_pricing_rules (*)
    `)
    .eq('club_id', id)
    .eq('is_active', true)

  const courtList = (courts || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    sport_type: c.sport_type,
    surface_type: c.surface_type,
    base_price_per_hour: Number(c.base_price_per_hour),
    deposit_percentage: Number(c.deposit_percentage),
    is_active: c.is_active,
    court_pricing_rules: (c.court_pricing_rules || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      start_time: r.start_time,
      end_time: r.end_time,
      price_per_hour: Number(r.price_per_hour),
      days_of_week: r.days_of_week,
    })),
  }))

  const courtIds = courtList.map((c) => c.id)

  // 3. Lấy bookings của các sân con này
  let existingBookings: Array<{
    id: string
    court_id: string
    start_time: string
    end_time: string
    status: string
  }> = []

  if (courtIds.length > 0) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, court_id, start_time, end_time, status')
      .in('court_id', courtIds)
      .in('status', ['pending', 'confirmed'])

    existingBookings = bookings || []
  }

  // 4. Lấy danh sách reviews ban đầu
  const initialReviews = await getClubReviews(id)

  const imageSrc =
    club.images && club.images[0]
      ? club.images[0]
      : 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200'

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MainHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href="/clubs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại danh sách cụm sân
          </Link>
        </div>

        {/* Club Hero Banner */}
        <div className="relative rounded-3xl overflow-hidden border border-border bg-card shadow-sm">
          <div className="h-64 sm:h-80 w-full relative">
            <img
              src={imageSrc}
              alt={club.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge className="bg-emerald-600/90 text-white font-semibold backdrop-blur-xs">
                <Sparkles className="w-3 h-3 mr-1" /> Cụm Sân Hoạt Động
              </Badge>
            </div>
          </div>

          <div className="p-6 sm:p-8 -mt-16 sm:-mt-20 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
                {club.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  {club.address}, {club.ward ? `${club.ward}, ` : ''}{club.district}, {club.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600 shrink-0" />
                  Giờ mở cửa: {club.open_time?.slice(0, 5)} - {club.close_time?.slice(0, 5)}
                </span>
              </div>

              {/* Amenities */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(club.amenities || ['wifi', 'parking', 'shower', 'lighting']).map((amenity: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-background text-xs text-muted-foreground border border-border/70 capitalize font-medium"
                  >
                    ✓ {amenity}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-xs text-muted-foreground max-w-md">
              {club.description || 'Cơ sở thể thao hiện đại, mặt sân đạt chuẩn thi đấu và hệ thống chiếu sáng LED cao cấp.'}
            </div>
          </div>
        </div>

        {/* Booking Slot Picker Section */}
        <div className="pt-2">
          <div className="mb-4">
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">
              Chọn Giờ Đặt Sân Trực Tuyến
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Chọn sân con, chọn ngày và khung giờ bạn muốn chơi. Hệ thống sẽ tự động tính giá và tạo đơn cọc.
            </p>
          </div>

          <TimeSlotPicker
            courts={courtList}
            existingBookings={existingBookings}
            clubOpenTime={club.open_time || '06:00:00'}
            clubCloseTime={club.close_time || '23:00:00'}
          />
        </div>

        {/* Club Reviews & Ratings Section */}
        <ClubReviewsSection
          clubId={id}
          currentUserId={user?.id || null}
          initialReviews={initialReviews}
        />
      </main>
    </div>
  )
}
