import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClubFormModal } from '@/components/owner/club-form-modal'
import { CourtFormModal } from '@/components/owner/court-form-modal'
import { CourtItemActions } from '@/components/owner/court-item-actions'
import { ClubItemActions } from '@/components/owner/club-item-actions'
import { Building2, MapPin, Clock, CircleDot, ShieldCheck } from 'lucide-react'

export default async function OwnerClubsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clubs } = await supabase
    .from('clubs')
    .select(`
      *,
      courts:courts(*)
    `)
    .eq('owner_id', user?.id || '')
    .order('created_at', { ascending: false })

  const clubList = clubs || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Quản Lý Cụm Sân & Sân Con
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Thiết lập thông tin cụm sân thể thao và cấu hình từng sân con riêng lẻ.
          </p>
        </div>
        <ClubFormModal />
      </div>

      {/* Clubs List */}
      {clubList.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80">
          <CardContent className="py-16 text-center space-y-3">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <h3 className="text-lg font-bold text-foreground">Chưa có Cụm Sân nào</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Bạn chưa tạo cụm sân nào. Hãy tạo cụm sân đầu tiên để bắt đầu thêm các sân con và nhận lịch đặt sân từ khách hàng.
            </p>
            <div className="pt-2">
              <ClubFormModal />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {clubList.map((club) => {
            const courtList = club.courts || []

            return (
              <Card key={club.id} className="border-border/80 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/60 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-bold text-foreground">
                          {club.name}
                        </CardTitle>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Đang hoạt động
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-1.5 mt-1 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>{club.address}, {club.district}, {club.city}</span>
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{club.open_time?.slice(0, 5)} - {club.close_time?.slice(0, 5)}</span>
                      </div>
                      <CourtFormModal clubId={club.id} clubName={club.name} />
                      <ClubItemActions clubId={club.id} clubName={club.name} />
                    </div>
                  </div>

                  {/* Amenities tags */}
                  {club.amenities && club.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {club.amenities.map((amenity: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-background text-[11px] text-muted-foreground border border-border/70 capitalize"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  )}
                </CardHeader>

                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span>Danh sách sân con ({courtList.length} sân)</span>
                    </div>

                    {courtList.length === 0 ? (
                      <div className="py-6 text-center border border-dashed border-border rounded-lg bg-muted/10">
                        <p className="text-xs text-muted-foreground mb-2">
                          Cụm sân này chưa có sân con nào. Hãy thêm ít nhất một sân con!
                        </p>
                        <CourtFormModal clubId={club.id} clubName={club.name} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {courtList.map((court: {
                          id: string
                          name: string
                          sport_type: string
                          surface_type: string | null
                          base_price_per_hour: number
                          deposit_percentage: number
                          is_active: boolean
                        }) => (
                          <div
                            key={court.id}
                            className={`p-3.5 rounded-xl border transition-colors flex flex-col justify-between gap-2 ${
                              court.is_active
                                ? 'border-border bg-card hover:border-emerald-500/30'
                                : 'border-border/50 bg-muted/30 opacity-75'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="font-bold text-sm text-foreground">{court.name}</h4>
                                  {!court.is_active && (
                                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 py-0">
                                      Tạm ngưng
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 capitalize">
                                  <CircleDot className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>{court.sport_type} • {court.surface_type || 'Tiêu chuẩn'}</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-[11px] font-semibold">
                                Cọc {court.deposit_percentage}%
                              </Badge>
                            </div>

                            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Giá cơ bản:</span>
                              <span className="font-bold text-emerald-600">
                                {Number(court.base_price_per_hour).toLocaleString('vi-VN')} đ/h
                              </span>
                            </div>

                            <CourtItemActions courtId={court.id} isActive={court.is_active} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
