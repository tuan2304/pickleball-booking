import { Goal, Feather, CircleDot, Target, Volleyball, Trophy, type LucideProps } from 'lucide-react'
import type { SportId } from '@/lib/constants'

const ICONS: Record<SportId, React.ComponentType<LucideProps>> = {
  football: Goal,
  badminton: Feather,
  pickleball: CircleDot,
  tennis: Target,
  basketball: Volleyball,
}

/** Icon SVG thay cho emoji (đồng nhất nét vẽ, đổi màu theo chữ, không phụ thuộc font emoji của hệ điều hành). */
export function SportIcon({ sport, className, ...props }: { sport: string } & LucideProps) {
  const Icon = ICONS[sport as SportId] ?? Trophy
  return <Icon aria-hidden className={className} {...props} />
}
