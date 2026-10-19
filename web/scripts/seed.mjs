import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Đọc .env.local thủ công không cần thư viện bên ngoài
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=')
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim()
        const val = trimmed.slice(idx + 1).trim()
        process.env[key] = val
      }
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong web/.env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function getOrCreateUser(email, password, fullName, phone, role) {
  // Tìm user theo email
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error(`Lỗi tìm user ${email}:`, listError.message)
    throw listError
  }

  let user = users.users.find((u) => u.email === email)

  if (!user) {
    console.log(`Đang tạo user mới: ${email} (${role})...`)
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
      },
    })
    if (createError) {
      console.error(`Không thể tạo user ${email}:`, createError.message)
      throw createError
    }
    user = created.user
  } else {
    console.log(`User đã tồn tại: ${email} (${user.id})`)
  }

  // Cập nhật profile để bảo đảm role và full_name chính xác
  await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      full_name: fullName,
      phone_number: phone,
      role: role,
      skill_level: 'intermediate',
      rating: 4.8,
    })

  return user
}

async function runSeed() {
  console.log('🚀 Bắt đầu nạp Dữ liệu Mẫu (Seed Data) cho SportArena...')

  // 1. Tạo Users mẫu
  const owner = await getOrCreateUser(
    'owner@sportarena.vn',
    '123456',
    'Nguyễn Văn Chủ Sân',
    '0901234567',
    'owner'
  )

  const player1 = await getOrCreateUser(
    'player1@sportarena.vn',
    '123456',
    'Trần Quốc Huy',
    '0912345678',
    'player'
  )

  const player2 = await getOrCreateUser(
    'player2@sportarena.vn',
    '123456',
    'Lê Hoàng Long',
    '0987654321',
    'player'
  )

  console.log('✅ Đã chuẩn bị xong 3 tài khoản Auth mẫu (Chủ sân + 2 Người chơi).')

  // 2. Tạo Cụm sân (Clubs)
  const clubsData = [
    {
      owner_id: owner.id,
      name: 'D-Sports Arena Thảo Điền (Pickleball & Tennis)',
      description: 'Tổ hợp thể thao cao cấp tại Thảo Điền gồm 6 sân Pickleball đạt chuẩn thi đấu và 2 sân Tennis đèn LED chống chói.',
      address: '28 Thảo Điền',
      ward: 'Thảo Điền',
      district: 'TP. Thủ Đức',
      city: 'TP. Hồ Chí Minh',
      open_time: '06:00:00',
      close_time: '23:00:00',
      amenities: ['wifi', 'parking', 'shower', 'canteen', 'lighting'],
      images: [
        'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1200&q=80'
      ],
      is_active: true,
    },
    {
      owner_id: owner.id,
      name: 'Hangar Arena Cầu Giấy (Cầu Lông & Bóng Đá Mini)',
      description: 'Nhà thi đấu cầu lông thảm chuẩn quốc tế Yonex và 3 sân bóng đá mini 7 người cỏ nhân tạo thế hệ mới.',
      address: '180 Dịch Vọng Hậu',
      ward: 'Dịch Vọng Hậu',
      district: 'Cầu Giấy',
      city: 'Hà Nội',
      open_time: '05:30:00',
      close_time: '23:30:00',
      amenities: ['wifi', 'parking', 'shower', 'canteen', 'lighting'],
      images: [
        'https://images.unsplash.com/photo-1521537634581-0dced2fee2ef?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80'
      ],
      is_active: true,
    },
    {
      owner_id: owner.id,
      name: 'Saigon Sports Center Phú Mỹ Hưng',
      description: 'Trung tâm thể thao đa năng Nam Sài Gòn chuyên Pickleball, Bóng Rổ sàn gỗ và Bóng Đá 5 người.',
      address: '101 Tôn Dật Tiên',
      ward: 'Tân Phú',
      district: 'Quận 7',
      city: 'TP. Hồ Chí Minh',
      open_time: '06:00:00',
      close_time: '22:30:00',
      amenities: ['wifi', 'parking', 'shower', 'lighting'],
      images: [
        'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1200&q=80'
      ],
      is_active: true,
    }
  ]

  // Xoá hoặc kiểm tra club trùng tên
  const createdClubs = []
  for (const c of clubsData) {
    const { data: existing } = await supabase
      .from('clubs')
      .select('id')
      .eq('name', c.name)
      .maybeSingle()

    if (existing) {
      createdClubs.push(existing)
      console.log(`Club đã tồn tại: ${c.name}`)
    } else {
      const { data: inserted, error: cErr } = await supabase
        .from('clubs')
        .insert(c)
        .select('id, name')
        .single()
      if (cErr) {
        console.error(`Lỗi tạo club ${c.name}:`, cErr.message)
      } else {
        createdClubs.push(inserted)
        console.log(`✅ Đã tạo cụm sân: ${inserted.name}`)
      }
    }
  }

  // 3. Tạo các Sân con (Courts) cho Cụm 1 (Thảo Điền)
  if (createdClubs[0]) {
    const club1Id = createdClubs[0].id
    const courtsC1 = [
      {
        club_id: club1Id,
        name: 'Sân 1 - Pickleball Ngoài Trời',
        sport_type: 'pickleball',
        surface_type: 'Sơn Acrylic chuyên dụng',
        base_price_per_hour: 150000,
        deposit_percentage: 30,
        is_active: true,
      },
      {
        club_id: club1Id,
        name: 'Sân 2 - Pickleball VIP Có Mái Che',
        sport_type: 'pickleball',
        surface_type: 'Thảm Vinyl tiêu chuẩn',
        base_price_per_hour: 220000,
        deposit_percentage: 40,
        is_active: true,
      },
      {
        club_id: club1Id,
        name: 'Sân 3 - Tennis Tiêu Chuẩn',
        sport_type: 'tennis',
        surface_type: 'Hard court US Open',
        base_price_per_hour: 250000,
        deposit_percentage: 30,
        is_active: true,
      }
    ]

    for (const court of courtsC1) {
      const { data: existCourt } = await supabase
        .from('courts')
        .select('id')
        .eq('club_id', club1Id)
        .eq('name', court.name)
        .maybeSingle()

      let courtId = existCourt?.id
      if (!existCourt) {
        const { data: insCourt } = await supabase.from('courts').insert(court).select('id').single()
        courtId = insCourt?.id
        console.log(`✅ Đã tạo sân: ${court.name}`)
      }

      // Thêm quy tắc giá giờ vàng cho Sân 1 và Sân 2
      if (courtId && court.sport_type === 'pickleball') {
        const { data: existRule } = await supabase
          .from('court_pricing_rules')
          .select('id')
          .eq('court_id', courtId)
          .maybeSingle()

        if (!existRule) {
          await supabase.from('court_pricing_rules').insert({
            court_id: courtId,
            name: 'Giờ Vàng Tối (17h - 22h)',
            start_time: '17:00:00',
            end_time: '22:00:00',
            days_of_week: [1, 2, 3, 4, 5, 6, 0],
            price_per_hour: court.base_price_per_hour + 50000,
          })
        }
      }
    }
  }

  // 4. Tạo các Sân con (Courts) cho Cụm 2 (Hangar Arena Cầu Giấy)
  if (createdClubs[1]) {
    const club2Id = createdClubs[1].id
    const courtsC2 = [
      {
        club_id: club2Id,
        name: 'Sân Cầu Lông Thảm Đấu 1',
        sport_type: 'badminton',
        surface_type: 'Thảm Yonex 5mm',
        base_price_per_hour: 120000,
        deposit_percentage: 30,
        is_active: true,
      },
      {
        club_id: club2Id,
        name: 'Sân Cầu Lông Thảm Đấu 2',
        sport_type: 'badminton',
        surface_type: 'Thảm Yonex 5mm',
        base_price_per_hour: 120000,
        deposit_percentage: 30,
        is_active: true,
      },
      {
        club_id: club2Id,
        name: 'Sân Bóng Đá Mini 7 Người - Sân A',
        sport_type: 'football',
        surface_type: 'Cỏ nhân tạo hạt cao su',
        base_price_per_hour: 450000,
        deposit_percentage: 35,
        is_active: true,
      }
    ]

    for (const court of courtsC2) {
      const { data: existCourt } = await supabase
        .from('courts')
        .select('id')
        .eq('club_id', club2Id)
        .eq('name', court.name)
        .maybeSingle()

      if (!existCourt) {
        await supabase.from('courts').insert(court)
        console.log(`✅ Đã tạo sân: ${court.name}`)
      }
    }
  }

  // 5. Tạo các Sân con cho Cụm 3 (Saigon Sports Center)
  if (createdClubs[2]) {
    const club3Id = createdClubs[2].id
    const courtsC3 = [
      {
        club_id: club3Id,
        name: 'Sân Pickleball Sài Gòn 1',
        sport_type: 'pickleball',
        surface_type: 'Sơn Acrylic chống trượt',
        base_price_per_hour: 180000,
        deposit_percentage: 30,
        is_active: true,
      },
      {
        club_id: club3Id,
        name: 'Sân Bóng Rổ Trong Nhà VIP',
        sport_type: 'basketball',
        surface_type: 'Sàn gỗ Maple giảm chấn',
        base_price_per_hour: 300000,
        deposit_percentage: 50,
        is_active: true,
      }
    ]

    for (const court of courtsC3) {
      const { data: existCourt } = await supabase
        .from('courts')
        .select('id')
        .eq('club_id', club3Id)
        .eq('name', court.name)
        .maybeSingle()

      if (!existCourt) {
        await supabase.from('courts').insert(court)
        console.log(`✅ Đã tạo sân: ${court.name}`)
      }
    }
  }

  // 6. Tạo một Kèo Giao Lưu (Match) mẫu đang mở
  // Lấy 1 sân pickleball bất kỳ
  const { data: sampleCourt } = await supabase
    .from('courts')
    .select('id, name, base_price_per_hour, club:clubs(name)')
    .eq('sport_type', 'pickleball')
    .limit(1)
    .single()

  if (sampleCourt) {
    // Tạo 1 booking tương lai 2 tiếng
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
    startTime.setHours(18, 0, 0, 0)
    const endTime = new Date(startTime.getTime() + 2 * 60 * 60 * 1000)

    const totalPrice = Number(sampleCourt.base_price_per_hour) * 2
    const depositAmount = Math.round(totalPrice * 0.3)

    // Kiểm tra booking đã tồn tại chưa
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('court_id', sampleCourt.id)
      .eq('user_id', player1.id)
      .maybeSingle()

    let bookingId = existingBooking?.id

    if (!existingBooking) {
      const { data: newBooking, error: bErr } = await supabase
        .from('bookings')
        .insert({
          court_id: sampleCourt.id,
          user_id: player1.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          total_price: totalPrice,
          deposit_amount: depositAmount,
          status: 'confirmed',
          is_open_match: true,
          note: 'Đặt sân đánh giao lưu kết nối anh em',
        })
        .select('id')
        .single()

      if (!bErr && newBooking) {
        bookingId = newBooking.id

        // Tạo payment đã thanh toán
        await supabase.from('payments').insert({
          booking_id: bookingId,
          user_id: player1.id,
          order_code: Number(`${Date.now()}`.slice(-6)),
          amount: depositAmount,
          status: 'paid',
          payment_method: 'vietqr_payos',
          paid_at: new Date().toISOString(),
        })

        // Tạo Match mở
        const { data: match } = await supabase
          .from('matches')
          .insert({
            booking_id: bookingId,
            creator_id: player1.id,
            title: 'Kèo Pickleball Đôi Nam/Nữ Trình 3.0+ Giao Lưu Tối Mai',
            description: 'Tìm thêm 2-3 bạn trình độ giao lưu vui vẻ, văn minh, chia đều tiền sân và bóng thi đấu.',
            sport_type: 'pickleball',
            skill_level: 'intermediate',
            required_players: 4,
            current_players: 2,
            cost_sharing_type: 'split',
            cost_per_person: Math.round(totalPrice / 4),
            status: 'open',
          })
          .select('id')
          .single()

        if (match) {
          // Thêm player2 vào danh sách tham gia (pending hoặc accepted)
          await supabase.from('match_participants').insert({
            match_id: match.id,
            user_id: player2.id,
            status: 'accepted',
            message: 'Cho mình xin 1 slot với nhé, trình 3.2 hay đánh bên Thảo Điền!',
          })
          console.log('✅ Đã tạo Kèo Thể Thao Mẫu & Người tham gia.')
        }
      }
    }
  }

  // 7. Tạo Thông báo mẫu cho Chủ Sân & Người chơi
  await supabase.from('notifications').insert([
    {
      user_id: owner.id,
      title: 'Chào mừng Chủ sân gia nhập SportArena! 🏟️',
      message: 'Hệ thống quản lý lịch đặt sân và thanh toán tự động VietQR PayOS đã sẵn sàng hoạt động.',
      type: 'system',
      link: '/owner/dashboard',
      is_read: false,
    },
    {
      user_id: player1.id,
      title: 'Đặt sân thành công! 🎉',
      message: 'Đơn đặt sân Pickleball của bạn đã hoàn tất đặt cọc và được xác nhận.',
      type: 'booking',
      link: '/my-bookings',
      is_read: false,
    },
    {
      user_id: player2.id,
      title: 'Yêu cầu tham gia kèo đã được duyệt! 🔥',
      message: 'Bạn đã được duyệt tham gia "Kèo Pickleball Đôi Nam/Nữ Trình 3.0+". Hãy chuẩn bị ra sân nhé!',
      type: 'match',
      link: '/matches',
      is_read: false,
    }
  ])

  console.log('🎉 NẠP SEED DATA THÀNH CÔNG 100%!')
  console.log('--------------------------------------------------')
  console.log('🔑 THÔNG TIN ĐĂNG NHẬP MẪU:')
  console.log('1. Chủ Sân (Owner):')
  console.log('   - Email: owner@sportarena.vn')
  console.log('   - Password: 123456')
  console.log('   - Quyền: Quản lý cụm sân, sân con, bảng giá, lịch đặt')
  console.log('2. Người Chơi 1 (Player - Chủ kèo):')
  console.log('   - Email: player1@sportarena.vn')
  console.log('   - Password: 123456')
  console.log('3. Người Chơi 2 (Player - Người tham gia kèo):')
  console.log('   - Email: player2@sportarena.vn')
  console.log('   - Password: 123456')
  console.log('--------------------------------------------------')
}

runSeed().catch((err) => {
  console.error('Lỗi chạy Seed Data:', err)
  process.exit(1)
})
