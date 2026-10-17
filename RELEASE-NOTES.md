# Catatan Rilis

Semua tanggal memakai waktu lokal pengembang (WIB). Berkas installer ada di folder
`installers/` dan ikut tersimpan di repositori ini, jadi tautan di bawah bisa
diunduh langsung dari GitHub.

---

## 0.5.0 — 18 Oktober 2026

Rilis ini menambahkan **Stabilo**: pemandu tur yang benar-benar berbicara, dengan
sorotan di layar asli, kuis pendek, dan temperamen yang bisa berubah — lalu
mengalah sendiri supaya tidak ada yang terjebak. Aplikasinya tetap sama: data
lokal, tanpa akun, tanpa server.

### Yang baru

- **Tur interaktif bersama Stabilo.** Dua belas langkah melintasi Hari ini,
  Pekan, Jurnal, Atur, dan Panduan. Setiap penjelasan punya pilihan jujur
  *Paham / Belum paham*; tiga jawaban salah beruntun membawanya ke fase kesal
  (getar, glitch, vinyet), lalu ia memberi petunjuk dan menawarkan jalan keluar.
  Melewati tur kapan saja tidak pernah dimarahi.
- **Layar bahasa di awal.** Sebelum kata pertama diucapkan, kamu memilih
  Indonesia atau English. Pilihannya dipakai seluruh aplikasi dan bisa diubah
  di Atur.
- **Nama panggilan.** Stabilo menanyakannya di dalam dialog, dan kamu bisa
  mengosongkannya. Bisa diganti kapan saja di Atur → Stabilo.
- **Intensitas.** *Manis* (tanpa getar dan glitch) atau *Seram ringan* (bawaan).
  Pilihannya ditanyakan di awal dan tersimpan.
- **Enam bunyi antarmuka** — klik, benar, salah, glitch, kemunculan, dan aksen.
  Semuanya CC0, jadi tidak ada kewajiban atribusi. Volume bisa dimatikan,
  dipelankan, atau dinormalkan di Atur → Stabilo. Bawaannya menyala.
- **Panel Atur → Stabilo**: tampilkan/sembunyikan, intensitas, efek getar,
  suara, nama panggilan, putar ulang perkenalan, putar tur, dan atur ulang
  kemajuan.
- **Animasi pembuka** kini berjalan setiap aplikasi dibuka (bawaan baru); pilihan
  *sekali saja* dan *mati* tetap ada.

### Perbaikan

- Tombol **Hari ini berantakan** punya target sorotan sendiri, jadi tur tidak
  lagi menyorot seluruh kepala halaman dua kali.
- Tombol tur di **Panduan** dan di **Atur** sama-sama memakai tur Stabilo;
  sebelumnya Panduan masih memulai tur klasik 14 langkah yang teksnya panjang.
- Kotak dialog dipadatkan dan dipersempit ke 680 px, dan Stabilo digeser ke
  kanan supaya tidak menutupi kartu yang sedang dibaca.
- Seluruh naskah Indonesia dan Inggris ditulis ulang: tanpa kalimat berkolon,
  panjangnya hampir separuh.

### Pemasangan

| Berkas | Ukuran | Untuk siapa |
|---|---|---|
| `FlexStudy_0.5.0_x64-setup.exe` | 2.611.817 B (2,49 MiB) | **Disarankan.** Terpasang per pengguna, tidak butuh hak admin |
| `FlexStudy_0.5.0_x64_en-US.msi` | 3.137.536 B (2,99 MiB) | Terpasang mesin-luas di `Program Files`, butuh admin |

Pilih satu format dan pakai konsisten — keduanya menghasilkan pemasangan yang
terpisah, jadi memasang keduanya berarti punya dua aplikasi.

```
3081EDE68CE83E51B205D413B9D36A60986C957BEFB92C6FF32F71A302EAF5F2  FlexStudy_0.5.0_x64-setup.exe
6AAC07189FB274AF4A430EFC051EAB4DB606998590C6243DCC9462B2BBC0CE7A  FlexStudy_0.5.0_x64_en-US.msi
```

Kebutuhan: Windows 10/11 64-bit dengan WebView2 (sudah ada di Windows 11 dan
sebagian besar Windows 10; kalau belum, installer resmi Microsoft memasangnya).

### Yang perlu diketahui

- **Installer belum ditandatangani.** Windows SmartScreen akan menampilkan
  peringatan "Unknown publisher". Pilih *More info* → *Run anyway*. Sertifikat
  code signing berbayar, jadi ini disengaja untuk sekarang.
- **Pemasangan lama tidak berubah setelannya.** Bawaan baru (animasi setiap buka,
  suara menyala) hanya berlaku untuk pemasangan bersih. Untuk profil lama, ubah
  di Atur → Tampilan dan Atur → Stabilo → Suara.
- **Satu tanda pada ekspresi `ph2` hilang.** Sepuluh dari sebelas gambar asli
  dikirim sebagai JPG, yang tidak punya kanal transparansi; alpha-nya
  direkonstruksi dari siluet `stabilo_flat`. Akibatnya tanda tanya yang
  mengambang di luar tubuh tidak ikut. Sumber aslinya tersimpan di
  `design/stabilo-source/` bila ingin diekspor ulang sebagai PNG.
- **Stabilo belum diuji secara visual oleh pengembang** sebelum rilis ini.
  Logika, tipe, dan 161 uji lolos; tata letak di layar belum.

### Pengujian

`tsc` bersih, ESLint bersih, 161 uji unit lulus (11 berkas), build web, build
desktop, dan kedua installer berhasil dibuat.

---

## 0.4.1 — 17 Oktober 2026

- Arsip jurnal dua tingkat: tahun, lalu bulan di dalamnya, dengan jumlah entri
  dan favorit pada baris tahun.

## 0.4.0 — 16 Oktober 2026

- Pencarian dan penanda favorit di jurnal.
- Halaman **Rekap** bulan/tahun seperti raport, dengan target diprorata.
- Gerak pada timer: riak saat *Mulai fokus* dan layar penuh saat waktu habis.
- Animasi pembuka yang bisa diatur: sekali saja, setiap buka, atau mati.
- 139 uji unit; halaman Panduan dan tur terpandu 14 langkah.
