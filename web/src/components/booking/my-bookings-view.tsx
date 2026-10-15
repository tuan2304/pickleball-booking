'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CreateMatchModal } from '@/components/matches/create-match-modal'
import {
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Trophy,
  Flame,
  Users,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
} from 'lucide-react'

interface MyBookingsViewProps {
  bookings: any[]
  participations: any[]
}

export function MyBookingsView({ bookings, participations }: MyBookingsViewProps) {
  const [activeTab, setActiveTab] = useState<'bookings' | 'matches'>('bookings')
  const [selectedBookingForMatch, setSelectedBookingForMatch] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  function handleOpenCreateMatch(booking: any) {
    setSelectedBookingForMatch(booking)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'bookings'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted/60'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Sân Tôi Đã Đặt ({bookings.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'matches'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-muted-foreground hover:bg-muted/60'
          }`}
        >
          <Flame className="w-4 h-4" />
          Kèo Tôi Tham Gia ({participations.length})
        </button>
      </div>

      {/* Tab 1: Bookings */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <Card className="border-dashed border-2 p-12 text-center space-y-3">
              <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <h3 className="text-base font-bold text-foreground">Bạn chưa có lịch đặt sân nào</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Hãy khám phá các cụm sân thể thao gần bạn và đặt chỗ ngay hôm nay!
              </p>
              <Link href="/clubs">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer mt-2">
                  Khám Phá Sân Ngay
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {bookings.map((item: any) => {
                const court = item.court || { name: 'Sân tiêu chuẩn' }
                const club = court.club || { name: 'Cụm sân' }
                const isPending = item.status === 'pending'
                const isConfirmed = item.status === 'confirmed'
                const match = item.matches && item.matches.length > 0 ? item.matches[0] : null

                const startTime = new Date(item.start_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const endTime = new Date(item.end_time).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })
                const dateStr = new Date(item.start_time).toLocaleDateString('vi-VN')

                return (
                  <Card
                    key={item.id}
                    className="border-border shadow-xs hover:border-emerald-500/30 transition-all overflow-hidden"
                  >
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground">{club.name}</span>
                          <Badge
                            variant="outline"
                            className={
                              isConfirmed
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs'
                                : isPending
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs'
                                : 'bg-muted text-muted-foreground text-xs'
                            }
                          >
                            {isConfirmed ? 'Đã Cọc Khóa Sân' : isPending ? 'Chờ Cọc (15p)' : item.status}
                          </Badge>

                          {match && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-semibold"
                            >
                              🔥 Đang Mở Ghép Kèo ({match.current_players}/{match.required_players})
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span className="font-semibold text-foreground">{court.name}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            {startTime} - {endTime} ({dateStr})
                          </span>
                        </div>

                        {club.address && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{club.address}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-border/50 flex-wrap">
                        <div className="text-right mr-2 hidden sm:block">
                          <div className="text-[11px] text-muted-foreground">Tiền cọc</div>
                          <div className="text-sm font-bold text-emerald-600">
                            {Number(item.deposit_amount).toLocaleString('vi-VN')} đ
                          </div>
                        </div>

                        {/* Matchmaking Action */}
                        {match ? (
                          <Link href={`/matches/${match.id}`}>
                            <Button
                              size="sm"
                              className="bg-amber-500 hover:bg-amber-600 text-white font-semibold cursor-pointer text-xs"
                            >
                              <Flame className="w-3.5 h-3.5 mr-1" />
                              Quản Lý Kèo
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenCreateMatch(item)}
                            className="border-amber-500/40 text-amber-600 hover:bg-amber-500/10 cursor-pointer text-xs font-semibold"
                          >
                            <PlusCircle className="w-3.5 h-3.5 mr-1" />
                            Mở Ghép Kèo
                          </Button>
                        )}

                        <Link href={`/bookings/${item.id}`}>
                          <Button
                            size="sm"
                            variant={isPending ? 'default' : 'outline'}
                            className={
                              isPending
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs'
                                : 'cursor-pointer text-xs'
                            }
                          >
                            {isPending ? 'Quét Mã Cọc' : 'Xem Chi Tiết'}
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Participations */}
      {activeTab === 'matches' && (
        <div className="space-y-4">
          {participations.length === 0 ? (
            <Card className="border-dashed border-2 p-12 text-center space-y-3">
              <Flame className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <h3 className="text-base font-bold text-foreground">Bạn chưa tham gia kèo thể thao nào</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Xem ngay danh sách các kèo giao lưu đang tuyển người để cùng rèn luyện thể thao!
              </p>
              <Link href="/matches">
                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white cursor-pointer mt-2">
                  Khám Phá Kèo Giao Lưu
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="space-y-4">
              {participations.map((part: any) => {
                const match = part.match
                if (!match) return null

                const booking = match.booking
                const court = booking?.court
                const club = court?.club
                const isAccepted = part.status === 'accepted'
                const isPending = part.status === 'pending'
                const isRejected = part.status === 'rejected'

                const startTime = booking?.start_time ? new Date(booking.start_time) : null
                const endTime = booking?.end_time ? new Date(booking.end_time) : null

                const timeStr = startTime && endTime
                  ? `${startTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                  : ''
                const dateStr = startTime
                  ? startTime.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
                  : ''

                return (
                  <Card key={part.id} className="border-border shadow-xs hover:border-amber-500/30 transition-all">
                    <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground">{match.title}</span>
                          <Badge
                            variant="outline"
                            className={
                              isAccepted
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs font-semibold'
                                : isPending
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs font-semibold'
                                : 'bg-red-500/10 text-red-600 border-red-500/30 text-xs'
                            }
                          >
                            {isAccepted ? '✓ Đã Được Duyệt' : isPending ? '⏳ Chờ Chủ Kèo Duyệt' : 'Đã Bị Từ Chối'}
                          </Badge>
                        </div>

                        {club && (
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-semibold text-foreground">{club.name}</span>
                            <span>•</span>
                            <span>{court?.name}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              {timeStr} ({dateStr})
                            </span>
                          </div>
                        )}

                        {part.message && (
                          <div className="text-xs text-muted-foreground italic">
                            Lời nhắn: &ldquo;{part.message}&rdquo;
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="text-right mr-2">
                          <div className="text-[10px] text-muted-foreground">Chi phí</div>
                          <div className="text-xs font-bold text-foreground">
                            {match.cost_sharing_type === 'host_covers'
                              ? 'Miễn phí'
                              : `${Number(match.cost_per_person || 0).toLocaleString('vi-VN')} đ`}
                          </div>
                        </div>

                        <Link href={`/matches/${match.id}`}>
                          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold cursor-pointer text-xs">
                            Chi Tiết Kèo
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal for creating match from an existing booking */}
      {selectedBookingForMatch && (
        <CreateMatchModal
          bookingId={selectedBookingForMatch.id}
          courtName={selectedBookingForMatch.court?.name || 'Sân'}
          clubName={selectedBookingForMatch.court?.club?.name || 'Cụm sân'}
          totalPrice={Number(selectedBookingForMatch.total_price || 0)}
          sportType={selectedBookingForMatch.court?.sport_type || 'football'}
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}
    </div>
  )
}
