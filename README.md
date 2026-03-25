# Frontend - ChatGPT Account Manager

Frontend sử dụng Next.js 15 + TypeScript + Tailwind CSS.

## Cài đặt

```bash
cd fe
npm install
```

## Cấu hình

Tạo file `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Chạy development server

```bash
npm run dev
```

Mở http://localhost:3000

## Build production

```bash
npm run build
npm start
```

## Cấu trúc thư mục

```
fe/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Dashboard (/)
│   ├── accounts/          # Accounts management
│   ├── login/             # Login new account
│   └── logs/              # Activity logs
├── components/            # React components
├── lib/                   # Utilities
│   └── api.ts            # API client
├── types/                 # TypeScript types
│   └── index.ts
└── public/               # Static files
```

## Features

- ✅ Dashboard với thống kê tổng quan
- ✅ Quản lý danh sách accounts
- ✅ Login account mới với OTP
- ✅ Xem chi tiết account và session
- ✅ Activity logs
- ✅ Responsive design với Tailwind CSS

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- React Hooks
