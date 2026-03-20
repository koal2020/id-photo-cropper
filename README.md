# 证件照裁剪工具 - ID Photo Cropper

快速制作标准尺寸证件照的在线工具，支持智能裁剪、背景颜色切换。

🔗 **在线预览**: https://id-photo-cropper.pages.dev (部署后更新)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.1-black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC)

## ✨ 功能特性

- 📤 **图片上传**: 支持拖拽和点击上传，限制 5MB
- 📐 **预设尺寸**: 一寸照、二寸照、护照照、微信头像
- ✂️ **智能裁剪**: 基于 Cropper.js，支持缩放、旋转、移动
- 🎨 **背景颜色**: 白色、蓝色、红色三种常见背景
- 💾 **本地导出**: 一键下载 JPG 格式证件照
- 🔒 **隐私保护**: 图片仅在浏览器处理，不上传服务器

## 🚀 快速开始

### 本地开发

```bash
# 克隆项目
git clone git@github.com:koal2020/id-photo-cropper.git
cd id-photo-cropper

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问 http://localhost:3000
```

### 构建部署

```bash
# 构建静态文件
npm run build

# 输出目录: dist/
```

## 🌐 部署到 Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Pages** → **Create a project**
3. 连接 GitHub 仓库 `koal2020/id-photo-cropper`
4. 构建设置:
   - Build command: `npm run build`
   - Build output directory: `dist`
5. 点击 **Save and Deploy**

## 🛠 技术栈

- **框架**: [Next.js 14](https://nextjs.org/) (App Router)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **裁剪**: [react-cropper](https://github.com/react-cropper/react-cropper)
- **类型**: [TypeScript](https://www.typescriptlang.org/)

## 📐 尺寸规格

| 类型 | 像素 | 物理尺寸 | 用途 |
|------|------|----------|------|
| 一寸照 | 295×413 | 25×35mm | 简历、证书 |
| 二寸照 | 413×626 | 35×53mm | 护照、签证 |
| 护照 | 354×472 | 33×48mm | 护照申请 |
| 微信头像 | 300×300 | - | 社交头像 |

## 📝 开发计划

### MVP (已完成)
- [x] 图片上传与裁剪
- [x] 预设尺寸选择
- [x] 背景颜色切换
- [x] 导出下载功能

### 后续迭代
- [ ] 人脸检测自动居中
- [ ] 背景移除 (remove.bg API)
- [ ] 批量处理多种尺寸
- [ ] 打印排版 (6寸相纸)
- [ ] 美颜/磨皮功能

## 📄 许可证

MIT License © 2024 koal2020
