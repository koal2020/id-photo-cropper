import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '证件照裁剪工具 - ID Photo Cropper',
  description: '快速制作标准尺寸证件照，支持智能裁剪、背景替换',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
}