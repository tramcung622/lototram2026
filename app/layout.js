import { Be_Vietnam_Pro } from 'next/font/google'
import './globals.css'

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-be-vietnam',
})

export const metadata = {
  title: 'Lô tô hội chợ | Bốc số 1–90, câu kêu soạn sẵn',
  description: 'Lô tô hội chợ: bốc số 1–90 không trùng, câu kêu soạn sẵn, tốc độ chỉnh được. Đúng chất hội chợ.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body className="font-sans antialiased text-white">
        {children}
      </body>
    </html>
  )
}
