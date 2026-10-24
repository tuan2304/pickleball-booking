import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { resolveAppUrl } from '@/lib/app-url'

// Giới hạn của một file sitemap là 50.000 địa chỉ; số cụm sân còn xa mức đó
const MAX_CLUBS = 5000

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = resolveAppUrl()
  const supabase = await createClient()

  // Chỉ các cụm sân đang hoạt động (RLS cũng chỉ cho khách thấy những cụm này)
  const { data: clubs } = await supabase
    .from('clubs')
    .select('id, updated_at')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(MAX_CLUBS)

  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/clubs`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/matches`, changeFrequency: 'hourly', priority: 0.7 },
    ...(clubs ?? []).map((club) => ({
      url: `${base}/clubs/${club.id}`,
      lastModified: new Date(club.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
