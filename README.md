# FlexStudy v2

Menyusun hari dalam blok waktu yang realistis, lalu **menyesuaikannya tanpa rasa bersalah** ketika hari tidak berjalan sesuai rencana.

Implementasi mengikuti `flexstudy-brief-v2` (§5 Must + §14 kriteria lulus). Semua data tinggal di perangkat. Tidak ada akun, tidak ada pelacakan pihak ketiga.

---

## Unduh dan pasang (Windows)

Tidak ingin menyentuh kode? Unduh installer-nya langsung:

### [FlexStudy_0.5.4_x64-setup.exe](installers/FlexStudy_0.5.4_x64-setup.exe) — sekitar 2,6 MB

Versi **0.5.4**. Tersedia dua format; pilih satu dan pakai konsisten, karena keduanya menghasilkan pemasangan yang terpisah. Rincian lengkap tiap rilis, ukuran, dan checksum ada di [RELEASE-NOTES.md](RELEASE-NOTES.md).

Yang baru di 0.5.4: **template benar-benar terpasang.** Rencana bawaan dulu hanya mengisi hari kerja, jadi menerapkannya pada Sabtu atau Minggu meninggalkan Hari ini kosong dan terlihat seperti gagal — sekarang setiap template punya satu blok akhir pekan, dan layar "sudah siap" menyebut jumlah blok yang benar-benar tersimpan. **Kamu juga bisa menyimpan rencanamu sendiri sebagai template** di *Atur → Template → Template buatanmu*: potret susunan blok yang bisa diterapkan ulang kapan saja, ikut dalam Ekspor/Impor JSON, dan dijelaskan satu perhentian tur baru. Ditambah **jam di header Hari ini** — 24 jam dengan detik, angka `tabular-nums`, dan berhenti menghitung saat jendela disembunyikan.

Yang diperbaiki di 0.5.3 tetap ada: tur menyambut sendiri setelah "Buka Hari ini" dan menjelaskan belasan perhentian, percakapan yang bergerak, kedipan mata, dan bahasa bawaan Inggris. Yang diperbaiki di 0.5.2 dan 0.5.1 juga tetap: tur membaca keadaan hari, wajah dan getaran saat salah menjawab, satu tur pada satu waktu, panggung karakter yang tetap, musik latar, serta kategori baru langsung dari form blok.

Yang baru di 0.5.0 tetap ada: **Stabilo**, pemandu tur yang berbicara, dengan pilihan jujur *Paham / Belum paham*, tiga kuis pendek, temperamen yang mengalah sendiri, dan panel **Atur → Stabilo**. Tur klasik tetap tersedia sebagai cadangan saat karakternya dimatikan.

Semua yang ada di 0.4.1 tetap ada: arsip jurnal dua tingkat, pencarian dan favorit di jurnal, halaman Rekap, gerak pada timer, dan animasi pembuka yang bisa diatur.

| | |
|---|---|
| Disarankan | `FlexStudy_0.5.4_x64-setup.exe` — sekitar 2,6 MB. Terpasang per pengguna, **tanpa hak admin** |
| Alternatif | `FlexStudy_0.5.4_x64_en-US.msi` — sekitar 3,0 MB. Terpasang mesin-luas ke `Program Files`, **butuh admin** |
| Sistem | Windows 64-bit |
| Internet | Tidak perlu setelah terpasang. Semua data, font, dan aset ikut di dalam aplikasi |
| WebView2 | Sudah tersedia di Windows 11. Bila belum ada, installer mengunduh dan memasangnya sendiri — langkah ini butuh internet |

Cara memasang:

1. Unduh berkas di atas.
2. Dobel klik. Bila Windows SmartScreen memunculkan peringatan, itu karena berkas ini belum ditandatangani secara digital — pilih **More info → Run anyway**. Kalau memakai `.msi`, Windows juga akan meminta izin administrator (UAC).
3. Selesai. Aplikasi terpasang dengan nama **FlexStudy** dan bisa dibuka dari menu Start.

Tidak ada proses latar: menutup jendela benar-benar menutup aplikasi. Aplikasi juga hanya boleh terbuka satu jendela pada satu waktu.

### Memperbarui

Belum ada pembaruan otomatis di dalam aplikasi, jadi memperbarui berarti memasang installer yang lebih baru di atas yang lama. **Tidak perlu menghapus pemasangan lama lebih dulu.**

Satu hal yang wajib: **naikkan `version` di [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) sebelum build.** Windows Installer mengenali sebuah produk dari versinya, jadi memasang versi yang sama akan menawarkan Repair/Remove alih-alih menggantikan aplikasi.

**Datamu tidak ikut hilang.** Aplikasi menyimpan datanya di `%LOCALAPPDATA%\com.creepix.flexstudy` — profil WebView2, tempat IndexedDB hidup. Lokasi itu ditentukan oleh `identifier`, jadi selama `identifier` tidak diubah, memperbarui aplikasi tidak menyentuh datamu sama sekali.

Kalau nanti mau pembaruan otomatis sungguhan, Tauri menyediakan plugin `updater`. Perlu diketahui sejak awal: plugin itu **mewajibkan penandatanganan** dan tidak bisa dimatikan, jadi kamu butuh pasangan kunci — dan kalau kunci privatnya hilang, kamu tidak akan pernah bisa lagi mengirim pembaruan ke pemasangan yang sudah ada. Kunci itu tidak boleh masuk repo.

Satu hal yang tetap perlu kamu lakukan sendiri: gunakan **Ekspor/Impor JSON** di layar *Atur* untuk mencadangkan data atau memindahkannya antara versi web dan desktop. Tidak ada akun dan tidak ada telemetri yang melakukannya untukmu.

> Ingin membangun sendiri dari kode? Lihat bagian **Menjalankan** di bawah.

---

## Menjalankan

```bash
npm install
npm run dev              # http://localhost:3000
npm test                 # uji unit (Vitest, node environment)
npm run build            # build produksi versi web
npm run build:desktop    # ekspor statis ke out/ — inilah yang dibaca Tauri
npm run tauri dev        # jalankan aplikasi desktop (jendela + hot reload)
npm run tauri build      # bikin installer .msi dan -setup.exe
```

Butuh Node.js 22+.

Untuk **membangun aplikasi desktop** kamu juga perlu Rust (https://rustup.rs) dan Microsoft C++ Build Tools dengan workload **"Desktop development with C++"**. Keduanya wajib: Rust yang dipasang lewat rustup memakai toolchain `x86_64-pc-windows-msvc`, yang menyerahkan proses linking ke linker milik Microsoft. Tanpa `link.exe` dan Windows SDK, kompilasi akan berhasil lalu gagal tepat di langkah terakhir.

Installer hasil build ada di `src-tauri/target/release/bundle/`.

---

## Keputusan desain

Sepuluh keputusan yang paling menentukan bentuk produk ini.

1. **Satu warna aksen.** Hanya `--accent` yang dipakai untuk aksi utama dan penanda "sekarang". Status (sukses/peringatan/gagal) punya warnanya sendiri dan hanya dipakai untuk status. Kategori dibedakan lewat **ikon + label + pola garis** (solid/putus-putus/titik) — bukan lima hue. Karena itu semua kategori tetap terbaca oleh pengguna buta warna dan saat dicetak hitam-putih.

2. **Jadwal dirender sebagai linimasa, bukan tumpukan kartu.** Sumbu jam ada di kiri, blok mengalir di kanan, dan penanda "sekarang" memotong linimasa. Blok yang sedang berjalan mendapat ruang dan tombol; blok lain cukup satu baris. Hierarki jadi terbaca tanpa perlu efek.

3. **Permukaan solid; elevasi hanya untuk yang benar-benar melayang.** Tidak ada `backdrop-filter`. Bayangan hanya dipakai di lembar geser jadwal, dialog, dan toast. Panel biasa memakai garis 1 px.

4. **Radius berhierarki.** Kontrol 8 px, panel 12 px, modal 16 px. Ukuran yang berbeda memberi tahu apa yang bisa ditekan.

5. **Angka memakai `tabular-nums` pada font utama.** Timer tidak "bergoyang" dan tidak ada font mono yang dipakai sebagai dekorasi.

6. **Gerak menjawab aksi.** Hanya ada transisi masuk untuk elemen yang baru muncul karena ketukan pengguna (lembar, dialog, toast) — bukan animasi masuk di setiap kartu. `prefers-reduced-motion` dipatuhi lewat aturan global.

7. **Status jujur, bukan gamifikasi.** Tidak ada badge berwarna di mana-mana dan tidak ada emoji api untuk streak. Streak ditampilkan sebagai tujuh kotak terisi/kosong. Metrik menunjukkan kenyataan: blok yang ditunda tetap terlihat sebagai "dipindahkan ke …", bukan dihapus diam-diam.

8. **Garis pekan dihitung dari data, bukan penghitung terpisah.** Target mingguan adalah jumlah `creditedMinutes` dari `BlockInstance` berstatus `done`. Menunda blok memindahkan kesempatan, **tidak** mengurangi target — ini diuji sebagai unit test (`tests/shift.test.ts` → *"does not move when blocks are postponed"*).

9. **Geser jadwal memakai satu mesin murni untuk pratinjau dan penerapan.** `planShift()` mengembalikan `ShiftPlan`; layar merender pratinjau dari objek itu, dan `applyShift()` menerapkan objek yang sama. Yang ditinjau pengguna persis yang dijalankan. Setiap perubahan menyimpan `ShiftEvent` berisi versi sebelum perubahan, sehingga Urungkan (10 detik, lewat toast) benar-benar mengembalikan keadaan.

10. **Bahasa sehari-hari di microcopy.** "Hari ini berantakan", bukan "Flexi-Shift Controller". "Simpan jurnal", bukan "Submit". Istilah internal (UTBK, PKL) hanya hidup di dalam template, tidak pernah masuk ke inti sistem.

### Larangan desain yang diminta brief — dipatuhi

| Larangan | Status |
|---|---|
| Lima warna aksen kategori | Tidak ada. Satu aksen; kategori = ikon + label + pola garis. |
| Glassmorphism / `backdrop-filter` dekoratif | Tidak ada di satu pun jalur render. |
| Font mono untuk label biasa | Tidak ada. Hanya dua keluarga: Bricolage Grotesque (judul) + Figtree (isi). |
| Animasi masuk di setiap kartu | Tidak ada. Hanya elemen yang muncul karena aksi. |

### Token

Semua warna, jarak, radius dan ukuran huruf ada di satu berkas: [`src/app/globals.css`](src/app/globals.css). Komponen tidak boleh menulis nilai heksadesimal. Token mengikuti §8.2 brief, dengan tambahan `--line-strong` untuk batas kontrol dan `--accent-surface` untuk sorotan.

Kontras dipilih agar teks ≥ 4,5:1 dan batas kontrol bermakna ≥ 3:1. Contoh pasangan yang dipakai: `--ink-muted` pada `--surface` ≈ 5,8:1 (terang) dan ≈ 7:1 (gelap); `--line-strong` pada `--surface` ≈ 4,6:1 (terang) dan ≈ 3,4:1 (gelap). Angka ini dihitung manual saat memilih nilai — **verifikasi final tetap perlu dijalankan dengan axe/Lighthouse** (lihat *Yang belum dikerjakan*).

---

## Struktur proyek

```
src/
  app/          rute + token global + layout akar
  domain/       logika murni: waktu, jadwal, status, target, geser jadwal, refleksi
  data/         skema Zod, Dexie (IndexedDB), repositori, ekspor/impor, store
  features/     intro, today, week, recap, journal, guide, tour, settings, onboarding
  components/   shell aplikasi + primitif UI bertoken
  i18n/         kamus id + en (kunci bertipe)
  lib/          util lintas fitur; desktop.ts adalah satu-satunya modul yang mengenal Tauri
  templates/    template awal sebagai data
tests/          uji unit domain + skema
src-tauri/      shell desktop (Tauri 2): konfigurasi, izin plugin, profil rilis
installers/     installer siap pakai untuk Windows
```

**Aturan inti:** `src/domain` tidak mengimpor React, tidak menyentuh penyimpanan, dan tidak membaca jam secara langsung. Semua fungsi menerima waktu dan pembuat id sebagai argumen. Karena itu lapisan ini cepat diuji dan nanti bisa dipanggil dari UI **maupun** dari agent dengan jalur data yang sama (brief §11.1).

---

## Aplikasi desktop

Versi Windows dibungkus dengan **Tauri 2** — bukan Electron. Karena itu tidak ada runtime Node yang ikut dibundel dan aplikasinya memakai WebView2 yang sudah tersedia di Windows, sehingga installer-nya **2,49 MB** — dan itu sudah termasuk karakter, asetnya, serta suaranya.

Yang perlu diketahui:

- **Satu lapisan abstraksi.** Hanya [`src/lib/desktop.ts`](src/lib/desktop.ts) yang boleh mengimpor `@tauri-apps/*`, dan impornya dinamis — paket Tauri tidak pernah masuk ke bundel web, dan build Vercel tetap berjalan apa adanya.
- **Dua jalur build, satu basis kode.** `npm run build` menghasilkan web statis; `npm run build:desktop` menyalakan `output: 'export'` lewat `TAURI_BUILD=1`. Build web tidak berubah perilakunya.
- **Font ikut dibundel.** Keduanya `.woff2` lokal di `src/assets/fonts/`, jadi tidak ada permintaan jaringan untuk huruf — di build web maupun desktop.
- **Ikon dari satu berkas sumber.** [`flexstudy-logo-1024.png`](flexstudy-logo-1024.png) di root repo (1024×1024, latar transparan). Jalankan `npx tauri icon flexstudy-logo-1024.png` untuk meregenerasi seluruh ukuran ikon Windows sekaligus.
- **Hemat saat diam.** Clock satu detik hanya hidup di komponen timer itu sendiri dan berhenti total saat jendela tersembunyi. Tidak ada `backdrop-filter`, tidak ada animasi tak berujung, dan `prefers-reduced-motion` dipatuhi.
- **Web dan desktop tidak berbagi data.** Keduanya berjalan di *origin* berbeda, jadi IndexedDB-nya terpisah. Pindahkan data sekali lewat Ekspor JSON di satu sisi dan Impor di sisi lain.

---

## Animasi pembuka

Peluncuran **pertama** setelah pemasangan dibuka oleh animasi ± 5 detik: cincin lima busur menggambar dirinya sendiri, lalu pecah, meninggalkan satu titik yang menulis "FlexStudy." dan berhenti sebagai titik akhir kalimatnya. Cincin yang pecah itu kembali utuh dan menyingkap layar template.

- **Bisa diatur, dan bawaan tetap sama.** Tiga pilihan di *Atur* → panel **Tampilan**: **Sekali saja** (bawaan — hanya peluncuran pertama setelah pemasangan, tidak berubah dari versi sebelumnya), **Setiap buka**, dan **Mati**. Pilihan disimpan bersama setelan lain di IndexedDB, tapi **dicerminkan ke `localStorage`** (`flexstudy.intro`) karena keputusan "putar atau tidak" harus diambil **sebelum** basis data menjawab — kalau tidak, animasinya akan berkedip di atas aplikasi yang sudah terbaca. Pilihan berlaku pada pembukaan berikutnya.
- **Tombol *Putar sekarang*** memutarnya sekali tanpa mengubah pilihan — termasuk saat pilihannya *Mati*. Ia menulis satu penanda sekali-pakai (`fs.intro.force`) lalu memuat ulang aplikasi, dan penanda itu baru dihabiskan ketika animasinya selesai atau dilewati. Jadi memutarnya tidak perlu mengubah setelan apa pun.
- **Kapan penanda "sudah dilihat" ditulis.** Kuncinya `fs.intro.v1`, ditulis saat animasi **selesai atau dilewati** — bukan saat mulai, jadi menutup aplikasi di tengah animasi berarti kamu melihatnya lagi. Penanda itu hanya menentukan hasil untuk pilihan *Sekali saja*.
- **Bisa dilewati kapan saja:** klik atau ketuk di mana saja, tombol *Lewati*, atau `Esc`/`Spasi`/`Enter`. Lewati melompat ke transisi penutup, tidak pernah berhenti di keadaan setengah jadi.
- **GSAP dimuat dinamis.** Peluncuran berikutnya tidak mengunduhnya sama sekali. Itu satu-satunya dependensi baru; tidak ada plugin, tidak ada Lottie, tidak ada gambar atau video sama sekali.
- **`prefers-reduced-motion`** mendapat versi statis: tanpa gerakan besar, hanya fade ± 1,2 detik.
- **Kalau GSAP gagal dimuat, animasinya dilewati** dan aplikasi langsung terbuka. Animasi tidak boleh menahan pengguna.

Satu hal yang sengaja berbeda dari sisa aplikasi: kanvasnya **selalu gelap** dan tidak mengikuti tema, karena ini momen merek, bukan layar kerja. Warnanya karena itu nilai literal dari token tema gelap (`--ink`, `--bg`, `--mute`, `--hl`) — lihat [`intro.css`](src/features/intro/intro.css).

**Belum pernah dilihat mata manusia.** Urutan, waktu antar-fase, dan pendaratan titik di akhir "FlexStudy." disusun dari perhitungan, bukan dari tontonan. Kalau ada yang terasa janggal, semua penyetelannya ada di satu tempat: konstanta waktu di [`Intro.tsx`](src/features/intro/Intro.tsx).

---

## Panduan dan tur

Aplikasi ini menjelaskan dirinya sendiri, lewat dua jalur supaya orang bisa memilih cara belajar yang cocok.

- **Tur interaktif, dua penyaji — tidak pernah bersamaan.** Dengan Stabilo menyala (bawaan), tur dibawakan karakternya: lima belas perhentian pendek di Hari ini, Pekan, Jurnal, Atur, dan Panduan — dari blok pertama, tambah blok, tujuh hari terakhir, dan Rekap, sampai riwayat jurnal, template buatanmu, cadangan data, dan panel tempat mematikannya. Masing-masing menyorot elemen aslinya, bukan gambar mockup. Dengan Stabilo dimatikan — atau asetnya gagal dimuat — tur klasik empat belas langkah mengambil alih; teksnya lebih panjang dan hanya versi itu yang menyentuh **Rekap**, layar yang bukan tab keenam. Keduanya berpindah halaman sendiri, bisa diputar ulang dari Panduan maupun Atur, dan mengembalikanmu ke layar tempat kamu memulainya. Tur klasik memakai tombol Lanjut/Kembali, panah kiri–kanan, dan Esc; Stabilo memakai Enter/Spasi, klik, dan Esc yang tidak pernah memarahi.
- **Halaman Panduan** (`/guide`). Versi tertulisnya: mulai cepat, penjelasan tiap layar, delapan tips, dan arti setiap lambang status.

Tiga hal kecil yang sengaja diputuskan:

- Badge di glosarium Panduan adalah **badge asli** yang dipakai aplikasi, bukan gambar terpisah. Karena itu panduannya tidak bisa melenceng dari perilaku sebenarnya.
- Kartu tur diletakkan di sisi target yang **paling lapang**, dan diutamakan sisi yang memuat seluruh kartu. Versi pertamanya hanya mencoba bawah lalu atas, sehingga pada target setinggi bilah navigasi kartunya justru menutupi objek yang sedang dijelaskan.
- Selama layar baru masih digambar, tur tidak menampilkan kartu sama sekali. Lebih baik diam sejenak daripada menampilkan kartu di tengah tanpa sorotan, yang justru membingungkan.

---

## Tampilan yang menyesuaikan

Lebar kolom konten bisa dipilih dan diingat: **Nyaman**, **Lebar** (bawaan), atau **Penuh**. Tombol di bilah kiri memutar ketiganya berurutan, dan kontrol lengkapnya ada di Atur.

Ada juga tombol **layar penuh**. Keduanya memakai Fullscreen API yang sama di web maupun desktop: WebView2 mengimplementasikannya, jadi tidak perlu API jendela Tauri dan tidak ada dependensi tambahan.

Kedua preferensi disimpan di setelan. Berkas ekspor dari versi lama tetap bisa diimpor, karena kedua medan baru punya nilai bawaan di skema.

---

## Jurnal: riwayat, pencarian, favorit

Riwayat tidak lagi satu daftar datar. Isinya tersusun **per tahun**, dan di dalam tiap tahun **per bulan** — keduanya bisa dibuka-tutup, jadi tahun dan bulan yang jauh tidak ikut memakan layar.

- **Judul per entri.** Tiap jurnal punya kolom judul sendiri dan boleh dikosongkan — kalau kosong, tanggalnya yang jadi kepala entri. Autosave ikut menyimpan judul, dan judul saja sudah cukup untuk membuat sebuah entri.
- **Arsip dua tingkat.** Baris tahun menyebutkan jumlah entri dan jumlah favoritnya, jadi tahun yang tertutup pun tetap bercerita sebelum dibuka. Tahun terbaru terbuka pada bulan terbaru; sisanya mulai tertutup, dan bulan yang tidak berisi apa-apa tidak muncul sama sekali. Pencarian dipisah dari penyusunan: logika pengelompokannya murni di [`src/domain/reflection.ts`](src/domain/reflection.ts) dan diuji, bukan tersembunyi di dalam komponen.
- **Pencarian** menyisir judul, isi, tiga pembelajaran, dan tanggal sekaligus, tanpa peduli huruf besar-kecil. Saat mencari, semua tahun dan bulan yang cocok terbuka otomatis — kalau tidak, yang tersembunyi justru hasil pencariannya.
- **Favorit** adalah bintang di tiap baris: satu ketukan untuk menandai hari yang layak dikenang, dan penyaring *Favorit* untuk mencarinya kembali.
- **Detail, ubah, hapus.** Menyentuh baris membuka lembar detail berisi isi yang sudah dirender. Ubah dan Hapus ada di dalam lembar itu, bukan berjejer di setiap baris — daftarnya tetap daftar. Hapus selalu lewat konfirmasi, dan menghapus entri yang sedang terbuka membangun ulang editornya, supaya teks lama tidak tersimpan kembali diam-diam.

---

## Rekap bulan dan tahun

Hari ini sengaja tetap pandangan tujuh hari. Pertanyaan yang lebih lambat — "bulan ini sebenarnya bagaimana?" — dijawab di rute terpisah `/recap`, yang punya tombol kembali dan dijangkau dari Hari ini, bukan dengan menambah tab keenam di navigasi.

- Bisa dipilih **per bulan atau per tahun**, dengan tombol periode sebelumnya dan berikutnya. Di mode tahun, tiap baris bulan bisa diketuk untuk melompat ke bulan itu.
- Isinya seperti raport: menit selesai vs target, blok selesai, hari aktif, rentetan terpanjang, entri jurnal, kata ditulis, dan favorit — ditambah rincian per kategori serta sebaran status blok.
- **Targetnya diprorata** menurut panjang periode, jadi Februari yang 28 hari tidak dituntut sama dengan Oktober yang 31 hari.
- Semua angkanya dihitung logika murni di [`src/domain/recap.ts`](src/domain/recap.ts) dan diuji: batas bulan termasuk Februari kabisat, pergeseran bulan, pro-rata target, hari aktif, dan rentetan.

---

## Gerak pada timer

Dua momen di sekitar fokus sengaja diberi sedikit lebih banyak tenaga daripada sisa aplikasi — dan keduanya tetap sekali lalu berhenti, bukan berulang:

- **Menekan *Mulai fokus*** memunculkan riak stabilo yang menyebar keluar dari tombol (~350 ms). Hanya di tombol utama, supaya aksen tetap satu per layar.
- **Saat waktunya habis**, satu layar penuh mengambil alih: teks utama *Selesai*, judul blok beserta menitnya, lalu tombol tutup. Warnanya kebalikan dari tema — `--ink` sebagai kertas dan `--bg` sebagai teks — jadi terang di tema gelap dan sebaliknya, tanpa satu pun nilai warna tambahan. Bisa ditutup dengan `Esc`, klik di mana saja, atau tombolnya; bloknya sendiri tetap berjalan.

Keduanya memakai `@keyframes` biasa, jadi aturan `prefers-reduced-motion` global yang sudah ada membuatnya selesai seketika tanpa cabang kode terpisah.

---

## Model data

Inti sistem tidak tahu apa itu UTBK atau PKL. Itu hanya isi template.

| Entitas | Isi |
|---|---|
| `Category` | nama, ikon, pola garis, target mingguan (menit) |
| `BlockTemplate` | judul, kategori, durasi, hari aktif, urutan, **jam mulai opsional** |
| `BlockInstance` | satu blok pada satu tanggal: status, jam mulai, detik terukur, catatan, dari/ke hari mana ia berpindah |
| `Reflection` | tanggal, **judul opsional**, pemicu, isi, 3 pembelajaran, jumlah kata, **favorit** |
| `ShiftEvent` | strategi, alasan, daftar perpindahan, **versi sebelum perubahan** (untuk Urungkan) |
| `Settings` | bahasa, tema, **kapan animasi pembuka diputar**, awal minggu, jam aktif, pengingat, status onboarding |

Status blok: `planned | running | done | deferred | skipped`.

Beberapa aturan yang tidak terlihat dari skema:

- **Jam mulai opsional per blok** (sesuai jawaban atas pertanyaan terbuka #2). Blok berjam tetap di posisinya; blok tanpa jam mengalir berurutan dari jam mulai hari, melewati apa pun yang sudah terisi. Ini yang membuat linimasa tidak berbohong soal kapan pekerjaan terjadi.
- **Hanya satu timer berjalan.** Memulai blok lain menghentikan blok yang sedang berjalan dan menyimpan detiknya. Tidak ada penghitungan ganda.
- **Blok yang berjalan tidak ikut digeser.** Memindahkannya akan membuang waktu terukur secara diam-diam.
- **Hari yang sudah lewat tidak pernah digenerate.** Blok hanya dibuat untuk hari ini sampai 14 hari ke depan, jadi hari lampau menampilkan apa yang benar-benar terjadi, bukan rencana yang tidak pernah dijalankan.
- **Semua entitas punya `schemaVersion`, `createdAt`, `updatedAt`** dan id stabil.

---

## Penyimpanan

- **IndexedDB (Dexie)** adalah penyimpanan utama.
- **`localStorage`** hanya dipakai untuk cermin preferensi (tema + bahasa), karena tema harus diterapkan sebelum paint pertama dan IndexedDB bersifat asinkron. Sumber kebenarannya tetap IndexedDB.
- **Ekspor/impor JSON** memakai skema Zod yang sama. Impor **memvalidasi lebih dulu lalu menampilkan isi berkas** (jumlah kategori, blok, entri harian, refleksi) sebelum apa pun ditimpa.
- Penulisan catatan di-debounce (400 ms). Kuota penyimpanan penuh tidak ditelan diam-diam: muncul banner jujur beserta tombol ekspor cadangan.

---

## Aksesibilitas

- Seluruh fungsi dapat dioperasikan keyboard; `:focus-visible` memakai warna aksen dengan offset.
- Label, petunjuk dan galat disambungkan lewat `aria-describedby` di satu komponen (`FieldShell`) sehingga tidak bisa melenceng.
- Status **tidak pernah** hanya dikomunikasikan dengan warna: selalu ada ikon + kata (`StatusBadge`).
- Timer diumumkan ke pembaca layar **setiap 30 detik dan saat blok mulai/selesai**, bukan setiap detik (`TimerAnnouncement`). Clock cepat dan clock lambat sengaja dipisah agar tick per detik tidak bocor ke `aria-live`.
- Target sentuh minimal 44 × 44 px (`IconButton` selalu `size-11`).
- `prefers-reduced-motion` dan `prefers-color-scheme` dipatuhi; `lang` dokumen mengikuti pilihan bahasa.
- Tema diterapkan oleh skrip kecil di `<head>` sehingga tidak ada kedipan tema salah.
- Tata letak memakai satuan relatif dan bertahan pada lebar 320 px serta zoom 200%.

### Kenapa HTML yang dirender server hanya kerangka

Data hidup di IndexedDB, jadi tidak ada yang bisa dirender di server. Agar tidak ada ketidaksesuaian hidrasi dan tidak ada "flash" konten kosong, kerangka aplikasi (`AppBoundary`) menampilkan skeleton sampai data siap. Konsekuensinya HTML awal belum berisi konten; ini keputusan sadar, bukan kelalaian. Konten jurnal sengaja **tidak** ada di HTML agar tidak bocor ke apa pun yang mengindeks halaman.

---

## Markdown pada catatan

Catatan blok dan jurnal mendukung Markdown dasar: paragraf, daftar, `**tebal**`, `*miring*`, `` `kode` ``.

Markdown **dirender menjadi elemen React**, bukan string HTML. Karena itu tidak ada `dangerouslySetInnerHTML` di seluruh aplikasi dan teks pengguna tidak pernah bisa menjadi markup. Ini jaminan yang lebih kuat daripada menyanitasi HTML setelah terbentuk.

---

## Uji

```bash
npm test
```

161 uji unit, 11 berkas, semuanya pada lapisan murni:

| Berkas | Cakupan |
|---|---|
| `tests/time.test.ts` | tanggal lokal (bukan UTC), perpindahan hari, awal minggu Senin/Minggu, jam, hitung mundur |
| `tests/schedule.test.ts` | aliran blok tanpa jam, blok berjam tetap, tabrakan yang ditandai (bukan disembunyikan) |
| `tests/shift.test.ts` | keempat strategi geser, tumpahan ke hari berikutnya, penerapan, Urungkan, target mingguan tidak berubah |
| `tests/progress.test.ts` | sisa waktu harian, aturan status, timer tahan tab tidur, target per kategori, rekap minggu |
| `tests/reflection.test.ts` | jumlah kata id/en, tiga slot pembelajaran, pemicu per tanggal, judul, favorit yang bertahan saat disunting, pencocokan pencarian, arsip per tahun dan bulan |
| `tests/recap.test.ts` | batas bulan (termasuk Februari kabisat), pergeseran bulan, pro-rata target, hari aktif, rentetan, penjumlahan bulan jadi tahun |
| `tests/schema.test.ts` | ekspor/impor bolak-balik tanpa kehilangan informasi, penolakan berkas rusak |
| `tests/intro-mode.test.ts` | kapan animasi pembuka diputar: *sekali saja*, *setiap buka*, *mati*, dan permintaan putar sekali yang mengalahkan ketiganya |
| `tests/stabilo-dialogue.test.ts` | naskah id/en punya id simpul yang sama, semua penunjuk hidup, tiap kuis punya tepat satu jawaban benar, tangga gedeg ph1→ph3 lalu mengalah, dan mode *manis* tidak pernah naik |
| `tests/cn.test.ts` | penggabungan kelas Tailwind — ukuran huruf tidak boleh menelan warna teks |
| `tests/propagate.test.ts` | penyebaran suntingan template ke blok hari ini + hari berikutnya, dan pembersihan blok yatim |

---

## Yang belum dikerjakan

Jujur soal batas rilis ini:

- **Angka Lighthouse dan audit axe belum diukur.** Belum ada perangkat/CI untuk menjalankannya di sini. **Kriteria §14 "Lighthouse ≥ 90/95" dan "lulus axe" belum diverifikasi.**
- **Ukuran JS: anggaran 150 KB gzip berisiko.** Dari `npm run build` terakhir: berkas dasar yang dimuat di semua rute ≈ 129 KB gzip (433 KB mentah), dan seluruh chunk klien untuk empat rute ≈ 310 KB gzip (994 KB mentah, 18 berkas). Angka **per rute** — termasuk layar Hari ini — belum diukur, jadi kriteria §10.3 "JS awal ≤ 150 KB gzip" **belum terbukti terpenuhi**; sebagian besar baseline itu adalah runtime Next.js 16 + React 19, bukan kode aplikasi.

Yang sudah dilakukan untuk mendukung target performa: tanpa `backdrop-filter` di jalur render, tanpa paket ikon di bundel klien (ikon SVG buatan sendiri), primitif UI kecil, `framer-motion`/`lucide-react`/`hugeicons` tidak diimpor sama sekali, dan konten berat data baru dirender setelah hidrasi.
- **PWA / offline (Should)** belum ada: belum ada service worker maupun manifest.
- **Impor/ekspor kalender (.ics)** dan **mode fokus layar penuh (Could)** belum ada.
- **Pengingat** hanya bekerja saat aplikasi terbuka. Di aplikasi desktop notifikasi lewat notifikasi sistem; di browser lewat Notification API. Keduanya melalui satu lapisan abstraksi (`src/lib/desktop.ts`), karena `Notification.permission` di dalam WebView tidak pernah bernilai `granted`. Penjadwalan latar butuh service worker, jadi menyusul bersama PWA.
- **Sinkronisasi akun & multi-perangkat (Could)** belum ada; karena itu ekspor/impor JSON dan tombol ekspor cadangan dibuat menonjol.
- **Lapisan tool untuk AI agent (fase 4)** belum dibangun. Fondasinya sudah disiapkan: skema Zod bertipe, fungsi domain murni dan teruji, log perubahan (`ShiftEvent`), serta ekspor/impor yang memakai skema yang sama.

Khusus aplikasi desktop:

- **Installer belum ditandatangani secara digital.** Karena itu Windows SmartScreen akan menampilkan peringatan saat pertama dipasang. Penandatanganan (code signing) di luar lingkup rilis ini, dan tidak ada sertifikat atau kunci yang disimpan di repo.
- **CSP masih `null`** di [`src-tauri/tauri.conf.json`](src-tauri/tauri.conf.json) untuk memudahkan tahap awal. Sebelum dipakai luas, ganti dengan CSP ketat tanpa `unsafe-eval` lalu uji ulang aplikasinya.
- **Angka RAM, waktu buka dingin, dan pemakaian CPU saat diam belum diukur.** Ukuran installer sudah terukur (lihat tabel di atas), tetapi tiga metrik itu butuh aplikasi yang benar-benar berjalan dan diukur dari Task Manager — jadi sengaja dibiarkan kosong daripada diisi angka perkiraan.
- **Uji visual aplikasi desktop belum dijalankan.** Yang sudah terverifikasi otomatis: `tsc`, ESLint, 161 uji unit, build web, build desktop, dan build installer. Stabilo belum pernah dilihat berjalan: posisi sprite terhadap kotak dialog, sorotan yang jatuh tepat di tombol *Hari ini berantakan*, gelembung kuis, getar teks, dan bunyinya; juga animasi pembuka pada peluncuran pertama, **animasi yang sama saat pilihannya *Setiap buka* dan tombol *Putar sekarang* ditekan selagi pilihannya *Mati***, susunan kontrol animasi di panel Tampilan, jendela terbuka menampilkan Hari ini, penanda "sekarang" di linimasa tidak lagi tertutup sidebar, riak pada Mulai fokus, layar penuh saat waktu habis di kedua tema, arsip jurnal dua tingkat — tahun, lalu bulan di dalamnya — beserta pencarian dan detailnya, angka di layar Rekap, **langkah Rekap di dalam tur beserta titik-titik penunjuk langkah yang kini lebih kecil karena tur bertambah jadi empat belas langkah**, timer berjalan, data bertahan setelah restart, notifikasi muncul, sorotan tur jatuh tepat di elemen yang dimaksud, dan ketiga lebar konten terlihat benar — belum dicentang. Sejak 0.5.1 ada yang perlu ditambahkan ke daftar itu: **panggung Stabilo yang tetap** (slot karakter di kanan, jarak ke kartu dialog, sorotan yang menggeser target alih-alih menutupinya), **campuran musik latar dan bunyi ketikan**, serta **kategori baru di dalam form blok** — semuanya dihitung, belum ditonton dan belum didengar.

---

## Penyimpangan dari brief, dan alasannya

| Brief §10.1 | Yang dipakai | Alasan |
|---|---|---|
| Komponen primitif **Radix UI** | **Base UI** (`@base-ui/react`) | Proyek ini sudah memakai Base UI (penerus garis Radix). Menambah Radix akan menduplikasi dua pustaka primitif untuk kebutuhan yang sama. |
| `next-intl` atau setara | Kamus bertipe sendiri di `src/i18n` | Kebutuhan hanya dua bahasa tanpa rute ber-locale. Kamus bertipe membuat kunci yang hilang jadi **galat kompilasi**, dan tidak menambah JS maupun perubahan struktur rute. |
| `--ok / --warn / --danger` "hijau / kuning tua / merah" | Nilai konkret dipilih dan diverifikasi terhadap latar terang & gelap | Brief menyerahkan nilai final ke validasi kontras. Ditambah `--line-strong` dan `--accent-surface` karena brief tidak menyediakan token untuk batas kontrol (butuh ≥ 3:1) maupun sorotan. |
| Statistik "3 kartu" (v1) | Satu kalimat status + satu garis progres | Sesuai §1.1 brief sendiri. |

Perubahan struktur: kode aplikasi dipindah ke `src/` sesuai §10.2, sehingga `tsconfig.json`, `components.json`, dan `vitest.config.mts` menunjuk ke `src/`.

---

## Peta cepat ke brief

| Brief | Di mana |
|---|---|
| §6 model konsep | [`src/domain/types.ts`](src/domain/types.ts) |
| §7.2C geser jadwal | [`src/domain/shift.ts`](src/domain/shift.ts), [`src/features/today/shift-sheet.tsx`](src/features/today/shift-sheet.tsx) |
| §7.2E rekap mingguan | [`src/domain/week.ts`](src/domain/week.ts), [`src/features/week/week-screen.tsx`](src/features/week/week-screen.tsx) |
| §8 arah visual | [`src/app/globals.css`](src/app/globals.css) |
| §9 aksesibilitas | [`src/components/ui/field.tsx`](src/components/ui/field.tsx), [`src/components/ui/surface.tsx`](src/components/ui/surface.tsx) |
| §10.1 skema & migrasi | [`src/data/schema.ts`](src/data/schema.ts), [`src/data/db.ts`](src/data/db.ts) |
| Lampiran A template | [`src/templates/catalog.ts`](src/templates/catalog.ts) |
| §11 kesiapan agent | [`src/domain/index.ts`](src/domain/index.ts) (permukaan fungsi murni) |
