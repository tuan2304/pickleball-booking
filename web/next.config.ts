import type { NextConfig } from "next";

// Chỉ project Supabase của mình (xem src/lib/image-hosts.ts); thiếu biến thì bỏ mẫu này thay vì mở rộng
function supabaseHostname(): string | null {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
  } catch {
    return null;
  }
}
const supabaseHost = supabaseHostname();

/**
 * Header bảo mật cho mọi trang.
 * CSP ở đây chỉ gồm các chỉ thị không ảnh hưởng tới script/style hiện có (chống nhúng khung, đổi base URL,
 * gửi form ra ngoài, plugin). Chưa có script-src vì giao diện dùng script nội tuyến (khởi tạo giao diện sáng/tối,
 * JSON-LD); thêm nonce cho từng request là bước riêng.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Chủ sân dùng định vị để ghim vị trí cụm sân (location-picker); các tính năng còn lại không dùng
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), usb=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    // SVG có thể chứa script; không bao giờ cho đi qua trình tối ưu ảnh
    dangerouslyAllowSVG: false,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost }] : []),
    ],
  },
};

export default nextConfig;
