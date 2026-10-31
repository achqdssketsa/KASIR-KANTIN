# Kantin Insya — PRD

## Original problem statement
"Bangun aplikasi mobile: tolong buatkan apak agar saya bisa mencata dengan akurat semua hal tentang toko saya agar tidak ada uang yang bocor. saya sudah sediakan gayanya dengan file png ... jangan samakan semua dengan html dan js ini cuman hanya saya mencontohkan."
User choices: all core features (Kasir, Produk, Laporan Harian, Laporan Audit, Modal), simple login (owner & kasir), Tunai + QRIS/Transfer (manual), print/share receipt + export, Rupiah & Bahasa Indonesia. Receipt must NOT auto-print — offer Cetak / Lewati.

## Architecture
- Expo Router (frontend), FastAPI + MongoDB (backend), JWT auth (bcrypt), roles owner/cashier.
- Screens: login, (tabs) Menu/Pesanan/Riwayat/Profil, side drawer, produk, laporan-harian, laporan-audit, modal, pengaturan.
- Endpoints: /api/auth/login, /auth/me, /categories, /products (CRUD, owner), /sales, /modal (owner), /transactions, /reports/daily.

## Implemented (2026-06)
- POS with category chips, search, cart, stepper, cash change calc, QRIS/transfer
- Post-sale sheet: Cetak Struk / Bagikan / Lewati (no auto-print)
- Product CRUD with HPP (cost) for profit, stock decrement
- Modal masuk / pengeluaran tracking
- Daily report: sales, HPP, gross/net profit, by method, top products, export/share
- Audit log with filters, owner delete
- Seed: owner/owner123, kasir/kasir123

## Iteration 2 fixes (2026-06)
- Sales use DB price/cost (anti-tamper), qty>0, amount>0 validation
- Daily report in Asia/Jakarta time
- Transactions are voided with a reason (no hard delete), stock restored, excluded from reports
- Route guard (login + owner-only screens), auto logout on 401
- Delete confirmation sheets, real CSV export, print/share error feedback
- Kasir shows stock + today's sales summary, refreshes on focus
- Pending: retest by testing agent

## Iteration 3 (2026-06): Standalone web version
- /app/web-export/kantin-insya/ : pure HTML + CSS + JS (localStorage), same features + tutup kas, audit log of product changes, sequential receipt numbers, backup/restore JSON, CSV export, PWA (manifest + sw.js), README with GitHub Pages steps
- Zip download: /api/download/kantin-insya.zip ; live preview: /api/web/index.html (served by FastAPI StaticFiles)

## Backlog
- P1: Daily cash closing (expected vs actual cash in drawer), date picker for reports, true CSV file export
- P1: Void/refund with reason instead of hard delete (better anti-leak audit)
- P2: Bluetooth thermal printer, stock low alerts, multi-outlet
