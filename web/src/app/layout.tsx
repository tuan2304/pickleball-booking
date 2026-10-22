import type { Metadata } from "next";
import { Be_Vietnam_Pro, Barlow_Condensed, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmProvider } from "@/components/ui/confirm-dialog";

// Font thân bài: thiết kế riêng cho tiếng Việt nên dấu không bị lệch/rơi font
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-bevietnam",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Font tiêu đề: condensed, đậm, đúng chất thể thao
const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin", "latin-ext", "vietnamese"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SportArena - Đặt sân & Ghép kèo thể thao",
    template: "%s | SportArena",
  },
  description:
    "Đặt sân chống trùng lịch, đặt cọc qua VietQR và ghép kèo giao lưu thể thao theo thời gian thực.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${barlow.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConfirmProvider>{children}</ConfirmProvider>
        <Toaster />
      </body>
    </html>
  );
}
