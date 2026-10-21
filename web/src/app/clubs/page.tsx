import type { CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { MainHeader } from '@/components/layout/main-header'
import { ClubFilters } from '@/components/clubs/club-filters'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Clock, ArrowRight, ShieldCheck, Trophy, Sparkles } from 'lucide-react'

interface ClubsPageProps {
  searchParams: Promise<{
    sport?: string
    district?: string
    q?: string
  }>
}

export default async function ClubsPage({ searchParams }: ClubsPageProps) {
  const params = await searchParams
  const sportFilter = params.sport || 'all'
  const districtFilter = params.district || 'all'
  const searchQuery = params.q?.toLowerCase() || ''

  const supabase = await createClient()

  // Lấy các cụm sân đang active
  const { data: clubs } = await supabase
    .from('clubs')
    .select(`
      *,
      courts:courts(*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  let filteredClubs = clubs || []

  // 1. Lọc theo search query
  if (searchQuery) {
    filteredClubs = filteredClubs.filter(
      (club) =>
        club.name.toLowerCase().includes(searchQuery) ||
        club.address.toLowerCase().includes(searchQuery) ||
        (club.district && club.district.toLowerCase().includes(searchQuery))
    )
  }

  // 2. Lọc theo quận/huyện
  if (districtFilter && districtFilter !== 'all' && districtFilter !== 'Tất cả khu vực') {
    filteredClubs = filteredClubs.filter((club) => club.district?.includes(districtFilter))
  }

  // 3. Lọc theo môn thể thao
  if (sportFilter && sportFilter !== 'all') {
    filteredClubs = filteredClubs.filter((club) =>
      club.courts?.some((court: { sport_type: string }) => court.sport_type === sportFilter)
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MainHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Banner Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Đặt sân trực tiếp & Khóa sân tức thì
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground animate-fade-up">
              Khám Phá Sân Thể Thao
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Tìm cụm sân gần bạn nhất, kiểm tra lịch trống và thanh toán cọc nhanh chóng qua VietQR PayOS.
            </p>
          </div>
        </div>

        {/* Filters */}
        <ClubFilters />

        {/* Clubs Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            <span>Tìm thấy {filteredClubs.length} cụm sân</span>
          </div>

          {filteredClubs.length === 0 ? (
            <Card className="border-dashed border-2 p-16 text-center">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-base font-bold text-foreground">Không tìm thấy sân phù hợp</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Vui lòng thử chọn môn thể thao khác hoặc xóa từ khóa tìm kiếm để xem thêm nhiều sân hơn.
              </p>
              <Link href="/clubs">
                <Button size="sm" variant="outline" className="cursor-pointer">
                  Xem tất cả cụm sân
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClubs.map((club, cardIndex) => {
                const courts = club.courts || []
                const activeCourts = courts.filter((c: { is_active: boolean }) => c.is_active)
                const sports = Array.from(new Set(courts.map((c: { sport_type: string }) => c.sport_type)))
                const prices = courts.map((c: { base_price_per_hour: number }) => Number(c.base_price_per_hour))
                const minPrice = prices.length > 0 ? Math.min(...prices) : 0

                const imageSrc =
                  club.images && club.images[0]
                    ? club.images[0]
                    : 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'

                return (
                  <Card
                    key={club.id}
                    className="card-lift animate-fade-up stagger border-border shadow-sm hover:border-emerald-500/40 overflow-hidden flex flex-col justify-between group"
                    style={{ '--i': cardIndex } as CSSProperties}
                  >
                    <div>
                      {/* Image Preview */}
                      <div className="relative h-48 w-full bg-muted overflow-hidden">
                        <img
                          src={imageSrc}
                          alt={club.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                        />
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-background/90 text-foreground backdrop-blur-md border border-border/60 text-xs font-semibold shadow-xs">
                            <Clock className="w-3 h-3 text-emerald-600 mr-1" />
                            {club.open_time?.slice(0, 5)} - {club.close_time?.slice(0, 5)}
                          </Badge>
                        </div>
                      </div>

                      <CardContent className="p-5 space-y-3">
                        <div>
                          <h3 className="font-bold text-lg text-foreground group-hover:text-emerald-600 transition-colors">
                            {club.name}
                          </h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{club.address}, {club.district}</span>
                          </p>
                        </div>

                        {/* Sport types badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {sports.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold capitalize"
                            >
                              {s}
                            </span>
                          ))}
                        </div>

                        {/* Amenities */}
                        {club.amenities && club.amenities.length > 0 && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-1 border-t border-border/50 truncate">
                            <span>Tiện ích:</span>
                            <span className="font-medium text-foreground truncate">
                              {club.amenities.join(' • ')}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </div>

                    {/* Bottom CTA */}
                    <div className="p-5 pt-0 border-t border-border/50 flex items-center justify-between mt-auto">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Giá từ</div>
                        <div className="text-sm font-extrabold text-emerald-600">
                          {minPrice.toLocaleString('vi-VN')} đ/h
                        </div>
                      </div>

                      <Link href={`/clubs/${club.id}`}>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer shadow-xs">
                          Đặt Sân Ngay <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
