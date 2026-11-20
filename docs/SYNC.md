# Akun & sinkronisasi (Supabase)

Login di FlexStudy **opsional**. Tanpa akun, aplikasi tetap berjalan penuh dan semua data tinggal di perangkat (IndexedDB). Akun hanya dipakai untuk menyinkronkan data antara PC dan Android.

## Cara kerjanya

- **Local-first.** Setiap perangkat tetap memakai IndexedDB sebagai sumber utama. Server hanya menyimpan salinan bersama.
- **Satu tabel `sync_rows`** berisi semua data per user: kategori, template, blok, jurnal, riwayat geser jadwal, dan sebagian setelan.
- **Last write wins per baris.** Kalau dua perangkat mengubah blok yang sama, versi dengan `updatedAt` terbaru yang dipakai. Keputusannya ada di server (`push_sync_rows`), bukan di klien.
- **Realtime.** Perubahan lokal dikirim setelah ±300 ms (beberapa ketikan digabung jadi satu tulisan), lalu Supabase Realtime meneruskannya ke perangkat lain. Timer yang dimulai di PC muncul di HP dalam waktu kurang dari satu detik pada koneksi normal.
- **Offline aman.** Perubahan saat offline tetap tersimpan lokal dan dikirim saat online lagi, dengan coba ulang otomatis (2 s → 60 s).
- **Login pertama di perangkat yang sudah punya data.** Aplikasi bertanya: *pakai data akun* (cocok untuk HP baru) atau *gabungkan keduanya*.
- **Yang tidak ikut sinkron:** tema, bahasa, animasi, lebar konten, status onboarding, sakelar notifikasi dan alarm. Itu urusan masing-masing layar dan OS.

Kode ada di:

| Berkas | Isi |
|---|---|
| `src/domain/sync.ts` | Logika murni: baris, hash, `planSync`, id blok deterministik, pembersih duplikat |
| `src/data/sync/engine.ts` | Loop sinkronisasi (pull, push, realtime, coba ulang). Tidak mengenal Supabase maupun React |
| `src/data/sync/supabase.ts` | Satu-satunya modul yang memanggil Supabase. Diimpor secara dinamis |
| `src/data/sync/sync-store.ts` | Penghubung ke store aplikasi dan state UI login |
| `src/features/settings/sync-panel.tsx` | Panel Atur → Akun & sinkronisasi |
| `supabase/migrations/0001_flexstudy_sync.sql` | Tabel, RLS, fungsi push, realtime |
| `tests/sync.test.ts`, `tests/sync-engine.test.ts` | Unit test dan simulasi dua perangkat |

## Setup (sekali saja)

1. Buat project di <https://supabase.com>.
2. Buka **SQL Editor**, tempel isi `supabase/migrations/0001_flexstudy_sync.sql`, lalu **Run**.
3. **Authentication → Sign In / Providers → Email**: pastikan Email aktif.
4. **Authentication → Emails → Magic Link**: ganti isi template supaya mengirim **kode**, bukan link. Contoh:

   ```html
   <h2>Kode masuk FlexStudy</h2>
   <p>Masukkan kode ini di aplikasi:</p>
   <p style="font-size:28px;letter-spacing:6px"><strong>{{ .Token }}</strong></p>
   <p>Kode berlaku beberapa menit. Abaikan email ini kalau kamu tidak meminta masuk.</p>
   ```

   Tanpa langkah ini, Supabase mengirim link, dan app desktop maupun Android tidak bisa memakainya.
5. **Project Settings → API**: salin *Project URL* dan *anon public key* ke `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

6. Jalankan ulang `npm run dev`. Untuk build Tauri, variabel ini dibaca saat `npm run build:desktop`, jadi harus sudah ada di `.env.local` sebelum build.

Catatan:
- Pengirim email bawaan Supabase dibatasi beberapa email per jam. Untuk dipakai banyak orang, sambungkan SMTP sendiri di **Authentication → Emails → SMTP Settings**.
- *Anon key* memang dirancang untuk dibagikan ke browser. Yang menjaga data tiap orang tetap privat adalah RLS di tabel `sync_rows`. Jangan pernah memasukkan *service_role key* ke aplikasi.

## Catatan untuk versi Android

Logika sinkronisasi tidak bergantung pada Tauri, jadi build Android (Tauri mobile atau WebView lain) cukup memakai kode yang sama dan `.env.local` yang sama. Login dengan kode OTP tidak butuh deep link atau redirect.
