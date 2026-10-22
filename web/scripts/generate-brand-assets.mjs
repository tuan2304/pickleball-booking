// Tạo toàn bộ tài nguyên logo (SVG, favicon, icon app) từ MỘT nguồn hình học duy nhất.
// Chỉnh logo: sửa hằng số ở đầu file rồi chạy lại:   npm run brand:generate
//
// Đầu ra:
//   web/public/brand/*.svg            các biến thể biểu tượng dùng cho web / in ấn
//   web/src/app/icon.svg              favicon dạng vector (bản nhỏ, bỏ chi tiết mờ)
//   web/src/app/favicon.ico           16/32/48 px
//   web/src/app/apple-icon.png        180 px, tràn viền (iOS tự bo góc)
//   web/public/icon-192.png, icon-512.png
//   mobile/assets/*.png               icon, adaptive icon (iOS / Android), splash, favicon
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const out = (...p) => path.join(ROOT, ...p)

// ---------------------------------------------------------------- hình học (lưới 96 x 96)
const S_PATH = 'M59.28 31.89A12 12 0 1 0 48 48A12 12 0 1 1 36.72 64.1' // hai cung r=12, tâm (48,36) và (48,60)
const BALL = { cx: 59.3, cy: 31.9 }
const C = {
  emerald: '#047857',
  forest: '#064E3B',
  grass: '#10A674',
  amber: '#FBBF24',
  ink: '#0B1F18',
  flat: '#0A7C57', // nền phẳng cho cỡ nhỏ
}

const DEFS = `<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.grass}"/><stop offset="1" stop-color="${C.forest}"/></linearGradient>
<radialGradient id="h" cx="0.28" cy="0.18" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>`

const svg = (viewBox, body, size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${size ? ` width="${size}" height="${size}"` : ''}>${body}</svg>`

const court = (color, opacity = 0.24, inset = 14) =>
  `<g fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.6"><rect x="${inset}" y="${inset}" width="${96 - inset * 2}" height="${96 - inset * 2}" rx="9"/><path d="M${inset} 48H${96 - inset}"/></g>`
const sShape = (color, width = 9) =>
  `<path d="${S_PATH}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`
const ball = (fill, ring, r = 7, ringWidth = 2.5) =>
  `<circle cx="${BALL.cx}" cy="${BALL.cy}" r="${r}" fill="${fill}"${ring ? ` stroke="${ring}" stroke-width="${ringWidth}"` : ''}/>`

/** Khung gradient đầy đủ chi tiết. rounded=false: tràn viền cho icon app (hệ điều hành tự bo góc). */
function badge({ rounded = true } = {}) {
  const geo = rounded ? 'x="2" y="2" width="92" height="92" rx="28"' : 'width="96" height="96"'
  return (
    DEFS +
    `<rect ${geo} fill="url(#g)"/><rect ${geo} fill="url(#h)"/>` +
    (rounded ? '<rect x="3.5" y="3.5" width="89" height="89" rx="26.5" fill="none" stroke="#fff" stroke-opacity="0.18"/>' : '') +
    court('#fff', 0.24, rounded ? 14 : 13) +
    sShape('#fff') +
    ball(C.amber, C.forest)
  )
}

/** Bản nhỏ cho favicon: nền phẳng, bỏ vạch mờ và gloss, nét dày hơn để còn rõ ở 16 px. */
const small = (w = 12, r = 9) =>
  `<rect width="96" height="96" rx="24" fill="${C.flat}"/>` + sShape('#fff', w) + ball(C.amber, null, r)

const variants = {
  'logo-mark.svg': svg('0 0 96 96', badge()),
  'logo-mark-white.svg': svg(
    '0 0 96 96',
    `<rect x="2" y="2" width="92" height="92" rx="28" fill="#fff"/>` + court(C.emerald, 0.22) + sShape(C.emerald) + ball(C.amber, C.forest)
  ),
  'logo-mark-ink.svg': svg(
    '0 0 96 96',
    `<rect x="2" y="2" width="92" height="92" rx="28" fill="${C.ink}"/>` + court('#fff', 0.2) + sShape(C.amber) + ball('#fff', C.ink)
  ),
  'logo-mark-mono.svg': svg(
    '0 0 96 96',
    `<rect x="2" y="2" width="92" height="92" rx="28" fill="#000"/>` + court('#fff', 0.25) + sShape('#fff') + ball('#fff', '#000')
  ),
  'logo-mark-bare-dark.svg': svg(
    '16 14 64 68',
    '<path d="M16 48H80" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="1.6"/>' + sShape('#fff') + ball(C.amber, C.ink)
  ),
  'logo-mark-bare-light.svg': svg(
    '16 14 64 68',
    `<path d="M16 48H80" fill="none" stroke="${C.emerald}" stroke-opacity="0.3" stroke-width="1.6"/>` + sShape(C.emerald) + ball(C.amber, '#fff')
  ),
}

// ---------------------------------------------------------------- ghi SVG
await mkdir(out('web', 'public', 'brand'), { recursive: true })
for (const [name, content] of Object.entries(variants)) {
  await writeFile(out('web', 'public', 'brand', name), content + '\n')
}
const faviconSvg = svg('0 0 96 96', small())
await writeFile(out('web', 'src', 'app', 'icon.svg'), faviconSvg + '\n')

// ---------------------------------------------------------------- PNG
const png = (content, viewBox, size) =>
  sharp(Buffer.from(svg(viewBox, content)), { density: 384 }).resize(size, size).png().toBuffer()

const fullBleed = badge({ rounded: false })
const apple = await png(fullBleed, '0 0 96 96', 180)
await writeFile(out('web', 'src', 'app', 'apple-icon.png'), apple)
await writeFile(out('web', 'public', 'icon-192.png'), await png(fullBleed, '0 0 96 96', 192))
await writeFile(out('web', 'public', 'icon-512.png'), await png(fullBleed, '0 0 96 96', 512))

// favicon.ico: ICO có thể chứa trực tiếp ảnh PNG
const icoSizes = [16, 32, 48]
const icoImages = await Promise.all(icoSizes.map((s) => png(small(s <= 16 ? 13 : 12, s <= 16 ? 10 : 9), '0 0 96 96', s)))
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(icoSizes.length, 4)
let offset = 6 + 16 * icoSizes.length
const entries = icoImages.map((img, i) => {
  const e = Buffer.alloc(16)
  e.writeUInt8(icoSizes[i], 0)
  e.writeUInt8(icoSizes[i], 1)
  e.writeUInt16LE(1, 4) // planes
  e.writeUInt16LE(32, 6) // bit depth
  e.writeUInt32LE(img.length, 8)
  e.writeUInt32LE(offset, 12)
  offset += img.length
  return e
})
await writeFile(out('web', 'src', 'app', 'favicon.ico'), Buffer.concat([header, ...entries, ...icoImages]))

// ---------------------------------------------------------------- mobile (Expo)
// Android adaptive icon: nội dung phải nằm trong vòng tròn an toàn (66/108 cạnh).
// Hộp chứa chữ S + bóng ~ 36 x 58 đơn vị (đường chéo ~68) nên khung nhìn mở rộng ra ~111.8 đơn vị.
// Lớp foreground chỉ có chữ S + bóng (vạch sân sẽ tràn khỏi vùng an toàn và bị hệ điều hành cắt).
const SAFE_VIEWBOX = '-7.9 -7.9 111.8 111.8'
const contentOnly = sShape('#fff') + ball(C.amber, C.forest)
const m = (...p) => out('mobile', 'assets', ...p)

await writeFile(m('icon.png'), await png(fullBleed, '0 0 96 96', 1024))
await writeFile(m('android-icon-foreground.png'), await sharp(Buffer.from(svg(SAFE_VIEWBOX, contentOnly)), { density: 384 }).resize(512, 512).png().toBuffer())
await writeFile(
  m('android-icon-background.png'),
  await sharp(Buffer.from(svg('0 0 96 96', DEFS + '<rect width="96" height="96" fill="url(#g)"/><rect width="96" height="96" fill="url(#h)"/>')), { density: 384 }).resize(512, 512).png().toBuffer()
)
await writeFile(
  m('android-icon-monochrome.png'),
  await sharp(Buffer.from(svg(SAFE_VIEWBOX, sShape('#fff') + ball('#fff', null))), { density: 384 }).resize(432, 432).png().toBuffer()
)
await writeFile(m('splash-icon.png'), await sharp(Buffer.from(svg('-26 -26 148 148', variants['logo-mark.svg'].replace(/^<svg[^>]*>|<\/svg>$/g, ''))), { density: 384 }).resize(1024, 1024).png().toBuffer())
await writeFile(m('favicon.png'), await png(small(), '0 0 96 96', 48))

console.log('Đã tạo xong logo:', Object.keys(variants).length, 'SVG, favicon.ico, apple-icon, icon web 192/512 và 6 ảnh cho mobile.')
