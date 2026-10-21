// template.tsx mount lại mỗi lần chuyển trang → tạo hiệu ứng vào trang mượt
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>
}
