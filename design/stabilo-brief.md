# tourStabilo.md — Stabilo: Tur Interaktif & Penunggu FlexStudy

> Brief UX, naskah, animasi, dan teknis untuk karakter **Stabilo**: pemandu tur bergaya visual novel (rasa Ace Attorney + sentuhan DDLC) dan penunggu yang muncul di momen harian.
> Berdasarkan jawaban AI agent atas repo (Blok A) dan keputusanmu (Blok B).
> **Menggantikan** bagian persona/kepribadian "Hana" di `guideBrief.md`. Tetap berlaku dari `guideBrief.md`: anggaran interupsi (bagian 6), pola pengaturan (bagian 9), dan seluruh fitur **Cadangan otomatis** (bagian 12).
> **Status kode:** contoh kode belum dijalankan. Angka (probabilitas, durasi, ambang) adalah titik awal untuk di-tuning.

---

## 0. Ringkasan keputusan

| Topik | Keputusan | Alasan |
|---|---|---|
| Urutan awal | **Bahasa → Intro (lingkaran pecah) → Stabilo memperkenalkan diri → Template → Tur interaktif di Hari ini** | Teks tur sudah sesuai bahasa; UI yang disorot baru ada setelah template |
| Cara menilai paham | **Dua lapis:** (1) tombol jujur "Paham / Belum paham" tanpa hukuman, (2) kuis "Eh, tunggu dulu!" bergaya Ace Attorney yang memicu fase gedeg bila salah | Jika "Belum paham" dihukum, pengguna akan berbohong |
| Fase gedeg di tur | **Hanya ph1 → ph3**, tidak pernah ph4/ph5 | Keputusanmu (B4) |
| Di luar tur | **Hanya ph1 → ph3** pada v1 (B2a). `ph4`/`ph5` ada tetapi di balik bendera fitur + opt-in "Seram penuh" | B2a + keamanan remaja/audio |
| Jumpscare tanpa peringatan | **Tetap kejutan, tetapi hanya bagi yang sudah menyetujui kategorinya** ("Seram penuh") | Kejutan terjaga; pengguna remaja terlindungi (bagian 11) |
| Intensitas | **Manis · Seram ringan (bawaan) · Seram penuh (opt-in)** | B8 |
| Bahasa tur | Dua naskah terpisah (id & en), ditulis natural, bukan terjemahan literal | B (bahasa natural) |
| Nama pengguna | Ditanya opsional di awal, bisa diganti di Atur, disimpan lokal | B7 |
| Nonaktif | Saklar utama di Atur + dari gelembung + pintasan; tur kembali ke **Tur Klasik** | Yang tak suka tetap bisa fokus |
| Aset | **0 gambar & 0 audio ada di repo saat ini** → pakai placeholder + manifest + kontrak berkas | Temuan agent (bagian 1) |

---

## 1. Temuan repo (fakta dari agent) dan dampaknya

| Temuan | Dampak pada brief |
|---|---|
| Tidak ada berkas gambar Stabilo, audio, maupun kode audio | Bagian 5 & 11: kontrak aset, placeholder, audio lazy + izin gestur |
| i18n buatan sendiri (`src/i18n`, 388 kunci id = en), `settings.locale` bawaan `id`, `<html lang>` sinkron | Bagian 4 & 14: naskah Stabilo dipisah dari kamus UI; layar bahasa di luar `IntroGate` |
| `IntroGate` memutuskan putar/tidak dari `localStorage` **sebelum** hidrasi | Layar bahasa wajib dirender **di luar/di atas** IntroGate dan memakai cermin `flexstudy.locale` |
| Tur klasik: `guided-tour.tsx`, 14 langkah, selektor `data-tour` stabil | Dipakai ulang sebagai sumber langkah; Stabilo hanya "presenter" baru (bagian 15) |
| Kemajuan tur hanya boolean `tourCompleted` | Perlu `stabiloProgress` (langkah, sabar, skor) agar dapat dilanjutkan |
| **Tidak ada event bus**; titik aksi di `store.ts:132-139` | Buat bus kecil + pemancar (bagian 10) |
| "Memulai hari" dan "mengakhiri hari" tidak ada; tanggal Hari ini ditangkap sekali saat mount (bug lewat tengah malam) | Buat `DayClock` (bagian 10); sekaligus memperbaiki bug itu |
| Blok yang tidak dikerjakan tetap `planned` di riwayat; riwayat per hari ada (`instances` terindeks `date`/`status`) | Penentuan "terlewat" dan "7 hari" bisa dihitung dari data yang ada |
| Tidak ada dialog VN, typewriter, atau pilihan bercabang | Bangun `DialogueEngine` (bagian 6) |
| z-index: Sheet z-40/50, tur z-70, layar penuh z-90 | Overlay Stabilo: z-80 (tur/gelembung); jumpscare (flag) z-95 |
| `reduced-motion` global sudah mematikan durasi | Efek getar/glitch/zoom harus menghormatinya dan diberi saklar sendiri |
| Bundle awal 343 KB gzip (selisih dengan README belum dijelaskan) | Anggaran tambahan Stabilo: **≤ 25 KB gzip JS**, aset lazy |
| Hanya GSAP dipakai (impor dinamis); framer-motion/motion terpasang tapi tidak dipakai | **Jangan** tambah pustaka; CSS + GSAP (lazy) cukup |
| Jendela tunggal Tauri 1100×740 | Stabilo hidup dalam jendela utama; tanpa jendela kedua |

---

## 2. Riset ringkas (mengapa rancangannya begini)

**DDLC.** Horornya bekerja karena **kontras manis → tidak nyaman**: gaya kawaii berwarna pastel perlahan "mengalami gangguan" (teks berubah jadi karakter acak, wajah rusak) dan kembali ceria, sehingga pemain merasa cemas terus-menerus. Analisis akademik menyebut efeknya lahir dari "yang akrab menjadi asing" dan dari mekanisme *game-breaking* yang disengaja. Satu ulasan juga menekankan bahwa kekuatannya ada pada manipulasi psikologis, bukan gore atau jumpscare. Gim itu juga **meminta persetujuan terhadap citra mengganggu di awal** sebelum masuk ke judul.
**Implikasi:** (1) jadikan glitch teks, jeda canggung, dan senyum yang bertahan sedikit terlalu lama sebagai alat utama; (2) jumpscare (ph5) hanya "bumbu langka"; (3) persetujuan di awal itu pola yang sah, bukan perusak kejutan.

**Ace Attorney (pola antarmuka, bukan aset).** Pola yang relevan: kotak dialog dengan teks mengetik, "pernyataan" yang bisa ditekan/disanggah, pilihan jawaban, **bilah penalti** yang berkurang saat salah, dan sorakan tegas bergaya banner saat momen kunci. Kita memakai *pola*-nya dengan ungkapan dan seni sendiri ("Eh, tunggu dulu!"), bukan frasa, seni, atau musik berhak cipta.

**WCAG 2.3.1 (kilatan).** Konten tidak boleh berkedip lebih dari **3 kali per detik**, atau harus di bawah ambang kilatan umum/merah; area kilatan yang aman sekitar di bawah 25% dari bidang pandang 10 derajat (± 341×256 piksel pada ukuran acuan). Satu kemunculan mendadak bukan "kilatan berulang", tetapi **layar penuh yang terang dan kontras tinggi** tetap perlu dihindari.
**Implikasi:** ph5 tidak boleh berkedip/strobo, tanpa kilat putih, dan diukur luminansnya (bagian 11.4).

**Pelajaran lama (Clippy, Duolingo)** dari `guideBrief.md`: interupsi harus layak, kendali pengguna mutlak, tidak ada rasa bersalah sebagai alat retensi.

---

## 3. Karakter Stabilo

| Aspek | Ketentuan |
|---|---|
| Wujud | Gadis ceria bergaya shoujo, maskot dari "stabilo" (penanda); senyumnya bisa berubah "terlalu lama" |
| Suara teks | Ceria, hangat, sedikit jahil; pakai "kamu", akhiran lembut ("ya~", "lho", "deh", "nih"), tanda `~` secukupnya, emoji teks seperlunya (✿ ♡ hanya pada momen manis) |
| Sisi gelap | **Manis yang tidak nyaman**, bukan ancaman: jeda terlalu lama, ketawa kecil "hehe...", pertanyaan berulang ("kan? kan...?"), teks yang sempat "rusak", lalu kembali ceria |
| Tidak boleh | Menyalahkan harga diri pengguna; menyindir kemampuan; mengancam; membandingkan dengan orang lain; ucapan posesif/menguntit/mengawasi ("aku selalu melihatmu"); nuansa romantis; menyebut data pribadi; membujuk agar tidak dimatikan |
| Tujuan emosi | Pengguna merasa **bermain dengan karakter**, bukan **dihakimi oleh aplikasi** |

**Aturan emas:** kengerian ditujukan pada *situasi permainan* (kuis salah, jeda aneh), bukan pada *kehidupan nyata pengguna* (ia malas, gagal, sendirian).

> Karena target pengguna remaja, hindari gaya "yandere" (obsesif/posesif). Rasa seram lahir dari keanehan, bukan dari kontrol.

---

## 4. Alur pengguna dari awal

```
[Peluncuran pertama]
   │
   ▼
1. LAYAR BAHASA (id / English)            ← baru, di luar IntroGate
   │  simpan ke flexstudy.locale (cermin) + settings.locale setelah hidrasi
   ▼
2. INTRO "lingkaran pecah" (sudah ada)     ← teks intro sudah dua bahasa
   │
   ▼
3. PERKENALAN STABILO (± 6 simpul, 40–60 dtk) ← baru
   │  salam → nama (opsional) → intensitas (Manis/Seram ringan) → suara
   │  → konsep singkat → "pilih template, ya~"
   ▼
4. ONBOARDING TEMPLATE (sudah ada; Stabilo menyapa singkat di tiap langkah)
   ▼
5. TUR INTERAKTIF di Hari ini (± 3–4 menit, dapat dilewati kapan saja)
   │  penjelasan (template1) → cek paham → kuis → (benar: lanjut | salah: template gedeg)
   ▼
6. Selesai → Stabilo menjadi penunggu (bagian 10), sesuai pengaturan
```

**Pengguna lama / sudah onboarding:** layar bahasa dilewati bila `flexstudy.locale` ada; perkenalan Stabilo ditawarkan sekali lewat banner kecil di Panduan ("Mau berkenalan dengan Stabilo?"), bukan dipaksakan.

**Pintu keluar universal:** tombol **Lewati** kecil di kotak dialog, `Esc`, dan menu ⋯. Melewati tur **tidak pernah** memicu fase gedeg; reaksi Stabilo: sedih manis ("Oke, kapan-kapan ya~").

### 4.1 Layar bahasa (spesifikasi)
- Dua tombol besar, label di bahasanya sendiri: **Bahasa Indonesia** · **English**. Tanpa bendera (bahasa ≠ negara).
- Dirender **sebelum** `IntroGate`; tidak menunggu hidrasi IndexedDB.
- Setelah dipilih: tulis `localStorage["flexstudy.locale"]`, set `document.documentElement.lang`, lalu setelah hidrasi sinkronkan ke `settings.locale`.
- Latar mengikuti `DESIGN.md` (gelap untuk momen merek, kontras tinggi); fokus pertama di tombol Indonesia; dapat dioperasikan keyboard.
- Dapat diubah nanti di Atur → Tampilan; Stabilo ikut berganti bahasa seketika.

---

## 5. Aset dan pemetaan (dengan aset terbatas)

### 5.1 Kontrak berkas (belum ada di repo)
Letakkan di `public/stabilo/` (WebP transparan, kanvas & titik jangkar **identik**, mis. 800×960):

| Berkas | Fungsi |
|---|---|
| `stabilo_flat.webp` | **Idle / mendengarkan / netral** (dasar semua adegan) |
| `stabilo_mouth_closed_speak.webp` | Bicara: mulut menutup (bingkai 1) |
| `stabilo_mouth_open_speak.webp` | Bicara: mulut terbuka (bingkai 2) |
| `stabilo_blink.webp` | Berkedip (disisipkan acak di idle) |
| `stabilo_scarySmile.webp` | Aksen senyum menyeramkan (sesekali) |
| `stabilo_scarySmile_ph1.webp` | Gedeg fase 1: mulai serem |
| `stabilo_scarySmile_ph2.webp` | Fase 2: lebih serem, ada tanda tanya |
| `stabilo_scarySmile_ph3.webp` | Fase 3: mulai bete, seperti ingin meluap |
| `stabilo_scarySmile_ph4.webp` | **(bendera)** Fase 4: kacau (sulit dan jarang) |
| `stabilo_scarySmile_ph5.webp` | **(bendera)** Fase 5: kemunculan mendadak |
| *(gambar ke-11: belum disebut)* | Lihat pertanyaan terbuka #1 |

**Aturan aset:** ukuran ≤ 100 KB untuk 4 gambar dasar, ≤ 160 KB untuk ph1–ph3, ≤ 200 KB untuk ph4/ph5. Sumber berlapis disimpan terpisah. **Posisi kepala/bahu identik** pada flat, closed, open, blink, scarySmile (agar pertukaran tidak "melompat"; agent harus menguji selisih piksel setelah aset ada).

### 5.2 Manifest dan placeholder
- `src/features/stabilo/assets.ts` membaca manifest `STABILO_ASSETS` (kunci → URL). Bila berkas **tidak ada**, tampilkan **siluet placeholder** (SVG) berlabel nama sprite saat mode pengembangan, dan di produksi sembunyikan Stabilo bila aset inti (4 gambar dasar) gagal dimuat (jangan menampilkan gambar rusak; tur klasik tetap berjalan).
- **Pramuat:** 4 gambar dasar setelah layar bahasa dipilih. **Prefetch idle:** `scarySmile` + `ph1–ph3` saat tur dimulai. `ph4/ph5` + audio seram: dimuat **hanya** bila "Seram penuh" aktif.

### 5.3 Pemetaan peran gambar (tanpa gambar emosi tambahan)

| Kebutuhan | Gambar | Teknik tanpa aset baru |
|---|---|---|
| Menyapa / senang | `flat` + bicara | Masuk dengan geser + pantul kecil; kilau (bintang CSS); rona pipi (overlay gradien merah muda 25%) |
| Menjelaskan | `flat` ↔ `closed` ↔ `open` | Angguk halus (translateY ±3 px) saat kalimat berganti |
| Mendengarkan / menunggu jawaban | `flat` + `blink` acak | Bernapas (skala 1→1.012) |
| Sedih/kecewa manis (pengguna lewati tur) | `flat` | Turun 6 px, redup 85%, miring −2°, bicara pelan |
| Senang karena benar | `flat` + bicara | Lompat kecil, kilau, rona pipi |
| Bercanda/jahil | `scarySmile` 0,7–1,1 dtk | Jeda ketik 400 ms lalu kembali `flat` |
| Gedeg ph1–ph3 | `ph1`, `ph2`, `ph3` | Getar teks makin kuat, vinyet gelap di tepi layar, glitch teks ringan |
| Akhir hari | `flat` | Tinted biru-malam 10%, kedip lambat |
| Tidur/istirahat | `blink` ditahan | Opasitas 75%, napas lambat |

**Gambar bicara:** ganti `closed`/`open` secara bergantian **tiap 2–3 huruf** (huruf vokal → open; konsonan/spasi → closed), dengan jeda pada tanda baca. Kecepatan ketik 28–34 ms/huruf (titik/koma: +180/+90 ms).

---

## 6. Mesin dialog (DialogueEngine)

### 6.1 Antarmuka
- **Kotak dialog** di bawah (desktop: lebar 720 px maks; mobile: penuh), label nama "Stabilo" bergaya penanda stabilo, teks 17–18 px, `aria-live="polite"` pada versi teks penuh tersembunyi.
- **Maju:** klik kotak / `Spasi` / `Enter` (klik pertama menuntaskan ketikan, klik kedua maju). **Mundur:** `←` (satu simpul). **Lewati tur:** `Esc` atau tombol kecil.
- **Pilihan:** 2–3 tombol vertikal, dapat dipilih dengan tombol angka `1–3`, fokus terlihat jelas.
- **Sorotan UI:** pakai pola sorotan tur klasik (`data-tour`) dengan bukaan lingkaran lime; kartu Stabilo menghindari menutupi elemen yang disorot (pindah atas/bawah otomatis).
- **Gauge "Kesabaran Stabilo"** (3 titik, tampil **hanya saat kuis**): terisi penuh di awal; berkurang saat salah; **terlihat dan jujur** agar pengguna paham mekaniknya (seperti bilah penalti).

### 6.2 Efek (semua ada saklar "Efek getar & glitch")

| Efek | Spesifikasi | Dipakai saat |
|---|---|---|
| **Getar teks** | tiap huruf `translate(±a px, ±a px)` acak 14–18 Hz; a = 0.5 / 1 / 2 / 3 px (ph0 / ph1 / ph2 / ph3), maks 2 dtk per baris | Emosi kuat, gedeg |
| **Glitch teks** | 1–3 huruf diganti simbol `▒ ░ ? #` selama 120–200 ms lalu pulih; maks 2 kejadian per detik; **tanpa warna berkedip** | ph2, ph3, aksen scarySmile |
| **Vinyet gelap** | gradien radial tepi → 0.35 hitam, 400 ms, bertahan sampai adegan selesai | ph1–ph3 |
| **Jeda canggung** | ketikan berhenti 400–700 ms di tengah kalimat | scarySmile, ph1–ph2 |
| **Banner "Eh, tunggu dulu!"** | pita horizontal slide-in 220 ms + guncangan layar ≤ 4 px/180 ms | Pembuka kuis |
| **Guncangan kecil** | ±3 px selama 180 ms (sekali) | Jawaban salah |
| **Kilau & lompat** | 6 bintang CSS 500 ms | Jawaban benar |

**Gerak dikurangi:** getar, glitch, banner geser, dan guncangan **dimatikan**; digantikan perubahan gambar + teks + vinyet statis.

### 6.3 Format naskah (data, bukan kode)

```ts
type Lang = "id" | "en";
type L = Record<Lang, string>;
type Sprite = "flat" | "scary" | "ph1" | "ph2" | "ph3";   // ph4/ph5 hanya di modul bendera

interface Node {
  id: string;
  text: L;                       // boleh memuat {nama} {start} {shift} (diambil dari kamus UI)
  sprite?: Sprite;               // bawaan: flat
  fx?: ("tremble1"|"tremble2"|"tremble3"|"glitch"|"vignette"|"sparkle"|"pause")[];
  target?: string;               // data-tour (sorotan)
  accent?: boolean;              // boleh disisipi scarySmile (probabilitas, bagian 8.4)
  next?: string;                 // simpul berikutnya
  ask?: "understood";            // tampilkan "Paham / Belum paham"
  quiz?: string;                 // id kuis
  mode?: Partial<Record<"sweet"|"spooky", L>>;  // varian teks per intensitas
}
interface Quiz {
  id: string; kind: "choice" | "point";   // 'point' = tunjuk elemen UI sungguhan
  prompt: L; options?: { label: L; correct?: boolean; hint?: L }[];
  pointTarget?: string;                   // untuk kind 'point'
}
```

Label tombol/menu **selalu diambil dari kamus UI** (mis. `common.start`, `nav.week`), tidak ditulis ulang, agar naskah tidak tertinggal saat UI berubah.

---

## 7. Template 1: alur penjelasan normal

```
[masuk]  flat (geser masuk)
   │
[bicara] flat ⇄ closed ⇄ open  (+ blink acak di jeda)
   │       (accent? → 12%: scarySmile 0,7–1,1 dtk + jeda canggung)
   ▼
[tanya]  "Paham?"  ┬─ Paham!      → simpul berikutnya (ulangi template 1)
                   └─ Belum paham → Template 2 "Ngulang pelan" (tanpa hukuman)
```

**Template 2 "Ngulang pelan":** kalimat lebih pendek, satu gambar sorotan, tanda panah; ketikan lebih lambat (38 ms). Tidak ada penalti, tidak ada gauge, Stabilo tersenyum. Setelah satu pengulangan, tawarkan "Mau coba langsung?" (kuis jenis *point*).

**Aturan scarySmile (aksen):** hanya pada simpul bertanda `accent`, probabilitas 12%, tidak pada dua simpul pertama, maksimal 2 per tur, tidak berturut-turut, tidak saat Intensitas = Manis. Senyum bertahan 0,7–1,1 dtk dan ketikan berhenti sejenak sebelum kembali normal. Tujuannya membuat efek "kok senyumnya kelamaan…" bekerja tanpa suara atau kilatan.

---

## 8. Cek paham, kuis, dan template Gedeg

### 8.1 Dua lapis penilaian
1. **Self-report:** "Paham!" / "Belum paham" → tidak pernah menaikkan kemarahan.
2. **Kuis "Eh, tunggu dulu!":** 3 kuis pendek (bagian 9). Benar → lanjut; salah → gauge berkurang dan fase gedeg berjalan.

### 8.2 Tangga gedeg dalam tur (maks ph3)

| Jawaban salah ke- (dalam rantai berurutan) | Sprite | Gauge | Efek | Contoh (id) |
|---|---|---|---|---|
| 1 | `ph1` | 2/3 | getar 1 px, vinyet | "Hehe. Bukan yang itu, lho~" |
| 2 | `ph2` | 1/3 | getar 2 px, glitch, jeda | "...Kamu dengerin aku, kan? Kan...?" |
| 3 | `ph3` | 0/3 | getar 3 px, glitch, guncangan | "Aduh, aduh, ADUH! Tiga kali, lho!!" |
| setelah ph3 | `flat` | reset 3/3 | napas panjang | "...Hhh. Maaf, aku kebawa suasana. Kita ulang pelan-pelan, ya? Aku kasih petunjuk deh." |

**Setelah ph3:** Stabilo **mengalah** dan otomatis menyorot jawaban yang benar (petunjuk) serta menawarkan "Lewati kuis ini". Kuis tidak bisa membuat pengguna terjebak.

**Pemulihan:** jawaban benar menurunkan fase 1 tingkat (bukan langsung nol) agar terasa seperti permainan dan tidak terlalu gampang.

**Mode Manis:** salah menampilkan petunjuk lembut tanpa gambar ph (hanya `flat` + goyang kecil), gauge tetap tampil.

### 8.3 Probabilitas dan angka (analisis mandiri)
- **Target:** hanya **5–15%** pengguna mencapai ph3 selama satu tur. Bila > 25% → kuis tidak jelas/tidak adil; bila < 2% → terlalu mudah (turunkan petunjuk).
- Kuis memakai 3 pilihan; satu jawaban jelas benar, dua salah yang masuk akal tetapi tidak menjebak (tanpa soal trik).
- Tiap kuis: salah pertama selalu memberi **petunjuk tersirat**, bukan hukuman besar.
- Tidak ada "hukuman permanen": reset gauge pada tiap kuis.

### 8.4 Rangkuman tabel peluang

| Elemen | Nilai awal |
|---|---|
| scarySmile per simpul `accent` | 12% (maks 2/tur) |
| Getar teks ph1/ph2/ph3 | 1 / 2 / 3 px |
| Peluang glitch teks per kalimat ph2/ph3 | 60% / 100% |
| Kecepatan ketik | 30 ms/huruf (38 ms di Template 2) |
| Durasi senyum aksen | 0,7–1,1 dtk |

---

## 9. Naskah tur (id / en)

Placeholder: `{nama}`, `{start}` (=`common.start`), `{finish}`, `{skip}`, `{shift}` (label Geser dari kamus), `{today}`, `{week}`, `{journal}`, `{settings}`, `{guide}`.

### 9.1 Perkenalan Stabilo (sebelum template)

| ID | Sprite/Efek | id | en |
|---|---|---|---|
| S01 | flat, geser masuk | Halo, halo~ Akhirnya ketemu juga! Aku Stabilo, penunggu FlexStudy. | Hello, hello~ We finally meet! I'm Stabilo, FlexStudy's resident guide. |
| S02 | flat | Boleh aku tahu namamu? Boleh dikosongkan, kok. *[input]* | What should I call you? You can leave it blank, too. *[input]* |
| S03 | flat | Salam kenal, {nama}~ ✿ | Nice to meet you, {nama}~ ✿ |
| S04 | flat | Satu hal lagi: kamu mau aku manis banget, atau dengan sedikit... bumbu? *[Manis aja / Sedikit bumbu]* | One more thing: do you want me super sweet, or with a little... spice? *[Just sweet / A little spice]* |
| S05 | flat | Mau ada bunyi-bunyian kecil? Tenang, bisa dimatikan kapan saja. *[Tanpa suara / Pelan]* | Want some little sound effects? Don't worry, you can turn them off anytime. *[No sound / Soft]* |
| S06 | flat | FlexStudy itu jadwal belajar yang memaafkan. Harimu dibagi jadi blok-blok, dan kalau berantakan, tinggal digeser. | FlexStudy is a study schedule that forgives. Your day is split into blocks, and when it gets messy, you just shift it. |
| S07 | flat | Sekarang pilih template yang paling mirip hidupmu, ya~ | Now pick the template that looks most like your life~ |

Pada S05 "Pelan": putar bunyi uji kecil (memenuhi syarat gestur audio).

### 9.2 Tur interaktif (di Hari ini)

| ID | Target | id | en |
|---|---|---|---|
| T01 | `nav` | Ini menu utama. Kamu akan paling sering ada di **{today}**. | This is the main menu. You'll mostly hang out in **{today}**. |
| T02 | `focus` | Blok pertamamu ada di sini. Tekan **{start}** dan timernya langsung jalan. | Your first block is here. Press **{start}** and the timer starts right away. |
| Q1 | `focus` | **Eh, tunggu dulu!** Kalau mau memulai timer, kamu tekan yang mana? | **Wait a second!** To start the timer, which one do you press? |
|  |  | ◉ {start} (benar) · ○ {finish} · ○ {skip} | ◉ {start} (correct) · ○ {finish} · ○ {skip} |
| T03 | `progress` | Garis ini menunjukkan berapa blok yang sudah beres hari ini. | This line shows how many blocks you've finished today. |
| T04 | `add`/shift | Kalau hari ini berantakan, jangan panik. Ada **{shift}**: sisa blokmu pindah, targetmu tetap aman. | If today turns messy, don't panic. There's **{shift}**: your leftover blocks move, and your targets stay safe. |
| Q2 | shift | **Eh, tunggu dulu!** Hari ini nggak keburu. Kamu pilih apa? | **Wait a second!** Today isn't going to fit. What do you choose? |
|  |  | ◉ {shift} (benar) · ○ Hapus semua blok · ○ Pura-pura nggak lihat | ◉ {shift} (correct) · ○ Delete every block · ○ Pretend I didn't see |
| T05 | `week-targets` | Di **{week}**, kamu bisa lihat target tiap kategori. Pelan-pelan aja, yang penting konsisten. | In **{week}** you can see your target per category. Take it slow, consistency matters most. |
| Q3 | *point* | **Eh, tunggu dulu!** Coba tunjuk: di mana kamu melihat target minggu ini? *(klik elemen sungguhan di menu)* | **Wait a second!** Try pointing: where do you see this week's targets? *(click the real menu item)* |
| T06 | `journal-entry` | Di **{journal}**, dua kalimat saja sudah cukup. Aku suka kalau kamu bercerita~ | In **{journal}**, two sentences are enough. I love it when you tell me about your day~ |
| T07 | `settings-appearance`, aksen | Kalau kamu lebih suka tanpa aku, matikan aku di **{settings}** → Stabilo. Aku nggak akan marah... mungkin. Hehe. | If you prefer it without me, switch me off in **{settings}** → Stabilo. I won't be mad... probably. Hehe. |
| T08 | `guide-quick` | Itu saja yang perlu kamu tahu. Kalau lupa, panggil aku lewat **{guide}**. Selamat belajar, ya~ ✿ | That's all you need to know. If you forget, call me from **{guide}**. Happy studying~ ✿ |

*Catatan T07:* kalimat "mungkin. Hehe." hanya di Intensitas ≠ Manis; di Manis: "Aku nggak akan marah, kok."

### 9.3 Reaksi kuis

| Kondisi | id | en |
|---|---|---|
| Benar | Betul! Pintar~ ✿ | Correct! Nice one~ ✿ |
| Salah #1 (ph1) | Hehe. Bukan yang itu, lho~ | Hehe. That's not the one, you know~ |
| Salah #2 (ph2) | ...Kamu dengerin aku, kan? Kan...? | ...You're listening to me, right? Right...? |
| Salah #3 (ph3) | Aduh, aduh, ADUH! Tiga kali, lho!! | Ugh, ugh, UGH! That's three times!! |
| Reset | ...Hhh. Maaf, aku kebawa suasana. Kita ulang pelan-pelan, ya? Aku kasih petunjuk deh. | ...Hah. Sorry, I got carried away. Let's go again, slowly, okay? I'll give you a hint. |
| Salah (Manis) | Hmm, bukan yang itu~ Coba lagi? | Hmm, not that one~ Try again? |
| Pengguna lewati tur | Oke, kapan-kapan ya~ Aku di sini kalau kamu butuh. | Okay, another time~ I'll be here if you need me. |
| "Belum paham" | Nggak apa-apa! Aku jelasin lebih pelan. | No worries! I'll go slower. |

---

## 10. Penunggu: kemunculan harian

### 10.1 Peristiwa yang harus dibuat (belum ada di repo)
Bus ringan `src/lib/events.ts` (EventTarget). Pemancar ditaruh di aksi store (baris sekitar `store.ts:132-139`) dan di layanan baru **`DayClock`**.

| Peristiwa | Dipancarkan oleh | Definisi |
|---|---|---|
| `day.started` | `DayClock` | Pembukaan pertama pada tanggal kalender lokal baru (juga bila aplikasi terbuka melewati tengah malam) |
| `day.ended` | `DayClock` | Mencapai `settings.dayEnd` **atau** semua blok hari itu selesai/dilewati/ditunda (yang lebih dulu) |
| `block.completed` | `completeBlock` | Blok ditandai selesai |
| `block.missed` | `DayClock` saat `day.ended`/`day.started` berikutnya | Blok berstatus **`planned`** (tidak disentuh) pada hari yang sudah lewat |
| `streak.absent` | `DayClock` | Jumlah hari terjadwal berturut-turut tanpa blok selesai |

**Definisi adil "terlewat":** hanya `planned` yang dihitung. `skipped` (pengguna memutuskan) dan `deferred` (pengguna menggeser) **bukan** terlewat dan tidak pernah dimarahi.
**Absen ≠ gagal:** bila aplikasi tidak dibuka ≥ 2 hari, saat dibuka lagi Stabilo menyambut ("Selamat datang kembali~"), **tanpa** tangga gedeg pada pembukaan itu. Ada opsi **Jeda libur** (n hari) yang menghentikan pemicu.

### 10.2 Pemicu, nada, dan batas

| Pemicu | Tampilan | Teks (id) | Batas |
|---|---|---|---|
| **Memulai hari** (`day.started`) | `flat`, geser masuk, kilau | "Pagi~ Hari ini ada {n} blok, sekitar {total}. Pelan-pelan aja ya!" | 1×/hari, otomatis tutup 7 dtk |
| **Blok selesai** | `flat` + lompat kecil, kilau | "Satu blok beres~ ✿" | Blok pertama hari itu & blok terakhir; selebihnya 1 dari 3; tidak saat timer lain berjalan |
| **Semua selesai** | `flat` + kilau besar | "Semua beres! Kamu keren banget hari ini~" | 1×/hari |
| **Mengakhiri hari** (`day.ended`) | `flat`, tint malam | Selesai semua: "Selesai {done}/{total}. Istirahat yang cukup ya~" · Sisa: "Masih ada {k} blok. Mau kugeser ke besok?" (tombol **{shift}** / **Nanti**) | 1×/hari |
| **Tidak selesai** (tangga di 10.3) | sesuai tangga | sesuai tangga | Maks 1 per hari; tidak saat jam tenang |

Anggaran global: **maks 3 kemunculan/hari**, jarak ≥ 20 menit, tidak muncul saat timer berjalan, tidak pada jam tenang (22:30–06:30, bisa diubah). Setiap kemunculan punya ✕ dan menu ⋯ ("Kurangi / Diamkan 1 jam / Matikan Stabilo").

### 10.3 Tangga "tidak selesai" (v1: hanya ph1–ph3)

Dihitung dari **hari terjadwal berturut-turut yang memiliki blok `planned` terlewat** (`missedStreak`).

| `missedStreak` | Manis | Seram ringan (bawaan) |
|---|---|---|
| 1 hari | "Hari ini agak padat ya. Mau kugeser?" | sama |
| 2 hari | "Blokmu kemarin masih menunggu~" | `ph1`: "Hehe... blok kemarin masih nunggu, lho." |
| 3–4 hari | "Pelan-pelan juga nggak apa-apa. Satu blok kecil?" | `ph2`: "...Kamu baik-baik aja? Blokmu sepi banget akhir-akhir ini." |
| ≥ 5 hari | "Aku kangen belajar bareng~ Satu blok kecil aja?" | `ph3`: "Aduh, aku mulai gemas! Satu blok kecil aja, ya? Pleaseee~" |

Setiap pesan menyertakan dua tombol: **"Mulai satu blok kecil"** (membuat/menyorot blok terpendek) dan **"Aku butuh jeda"** (Jeda libur). Tidak ada tekanan lain; tidak ada hitungan beruntun yang "hilang".

### 10.4 Seram penuh (`ph4`/`ph5`, di balik bendera, **tidak ada di v1**)
Lihat bagian 11.

---

## 11. Intensitas, "Seram penuh", dan jumpscare

### 11.1 Tiga intensitas

| Intensitas | Tur | Di luar tur | Bawaan |
|---|---|---|---|
| **Manis** | Tanpa ph, tanpa glitch/getar; salah = petunjuk lembut | Hanya pesan manis | – |
| **Seram ringan** | scarySmile, ph1–ph3, getar & glitch halus | ph1–ph3 mengikuti tangga 10.3 | **Ya** |
| **Seram penuh** | sama dengan Seram ringan di tur (maks ph3) | + `ph4`/`ph5` (bagian 11.2–11.5) | **Opt-in, bendera mati di v1** |

### 11.2 Persetujuan "Seram penuh" (menjaga kejutan, melindungi pengguna)
Keputusanmu: jumpscare **tanpa peringatan**. Kejutannya tetap dipertahankan; yang dimintakan hanyalah **persetujuan terhadap kategori** (seperti gim horor yang memberi tahu "berisi adegan mengejutkan"), **bukan** peringatan sebelum tiap kejadian. Alasan: target remaja, kemungkinan dipakai di kelas/tempat umum, dan suara keras lewat headset.

Teks dialog opt-in (di Atur → Stabilo → Intensitas → Seram penuh):

> **Seram penuh**
> Stabilo bisa sesekali muncul tiba-tiba dengan gambar menyeramkan dan suara keras, hanya kalau kamu lama tidak mengerjakan blok. Paling sering sekali dalam 2 minggu.
> Kurang cocok kalau kamu belajar di tempat umum atau memakai headset.
> Kamu bisa mematikannya kapan saja.
> [ Aktifkan ] [ Batal ]

Dua kali konfirmasi (dialog + tombol "Ya, aku mengerti"). Tidak ada pratinjau gambar ph5.

### 11.3 Syarat kemunculan ph5 (semua harus terpenuhi)
- Bendera `STABILO_FULL_HORROR` hidup **dan** Intensitas = Seram penuh **dan** Suara ≠ Tanpa suara (jika Tanpa suara: ph5 hanya visual, tanpa stinger).
- `missedStreak ≥ 7` hari terjadwal berturut-turut tanpa satu pun blok selesai *(asumsi A1; parameter `PH5_MISSED_DAYS`)*, **dan** pengguna sudah melihat ph3 minimal 2 kali.
- ≥ 21 hari sejak instalasi; ≥ 14 hari sejak ph5 terakhir.
- Tidak ada timer berjalan, bukan jam tenang, aplikasi di latar depan, ada gestur pengguna sejak peluncuran (agar audio boleh).
- Pengguna tidak sedang dalam Jeda libur.
- Peluang kemunculan per kesempatan: 35% (agar tidak dapat diprediksi).

### 11.4 Spesifikasi jumpscare (bila bendera hidup)
- **Layar penuh** z-95, ph5 `cover`, masuk **instan** (satu bingkai), zoom pelan 1.00→1.06 selama 700 ms, total tampil **900 ms**, keluar fade 300 ms.
- **Tanpa strobo/kilatan:** tidak ada pergantian terang-gelap berulang; **satu** kemunculan saja. Ukur luminansnya (agent): rata-rata, persentase piksel > 90% putih, kontras merah-putih; jika gambar memiliki area besar sangat terang, tambahkan lapisan redup (pengali 0.7).
- **Audio:** satu *stinger* ≤ 1,2 dtk, puncak ≤ −6 dBFS, `masterGain` ≤ 0.5, tanpa lonjakan frekuensi tinggi; BGM seram pendek opsional (≤ 4 dtk, fade-in). Tidak ada audio bila Suara = Tanpa suara.
- **Dapat dihentikan:** `Esc`/klik/`Spasi` langsung menutup; tombol kecil "Matikan Seram penuh" muncul pada gelembung susulan.
- **Gerak dikurangi:** tanpa zoom; tetap bisa dimatikan sepenuhnya (ph5 jadi gambar statis 600 ms, tanpa suara).

### 11.5 Setelah ph5 (B5)
`flat` kembali (napas), lalu bicara singkat **seakan bukan dirinya** (glitch ringan), lalu menghilang dengan geser keluar:

| id | en |
|---|---|
| "...eh? Aku tadi ngapain? Maaf ya. Pokoknya... satu blok kecil aja, boleh?" | "...huh? What was I doing just now? Sorry. Anyway... just one tiny block, okay?" |

Tombol: **Mulai satu blok kecil** · **Aku butuh jeda** · **Matikan Seram penuh**. Tidak ada kalimat yang menyalahkan.

---

## 12. Pengaturan: Atur → Stabilo

| Kontrol | Pilihan | Bawaan |
|---|---|---|
| **Tampilkan Stabilo** (utama) | Hidup / Mati | Hidup (dipilih saat perkenalan) |
| Intensitas | Manis · Seram ringan · Seram penuh (opt-in, bagian 11.2) | Seram ringan |
| Suara | Tanpa suara · Pelan · Normal | Tanpa suara |
| Efek getar & glitch | Hidup / Mati | Hidup (mati bila gerak dikurangi) |
| Kemunculan harian | Mulai hari · Akhir hari · Blok selesai · Blok terlewat (saklar masing-masing) | Semua hidup |
| Jam tenang | Mulai–selesai | 22:30–06:30 |
| Jeda libur | 1–14 hari | – |
| Nama panggilan | Teks | Dari perkenalan |
| Perkenalan & tur | **Putar ulang perkenalan** · **Putar tur** · **Atur ulang kemajuan** | – |

**Saat dimatikan:** tidak ada timer, listener, atau aset termuat; tur kembali memakai **Tur Klasik** yang sudah ada; Stabilo berpamitan satu kali tanpa bujukan ("Oke, aku istirahat. Panggil aku di Atur kalau mau~").

**Cara cepat meredam:** menu ⋯ di setiap kemunculan (*Kurangi yang seperti ini · Diamkan 1 jam · Matikan Stabilo*), klik kanan, dan pintasan (mis. `Ctrl/Cmd + Shift + S`).

**Belajar dari penolakan:** gelembung ditutup < 1 dtk tiga kali berturut → pemicu itu diredam 7 hari, satu pertanyaan: "Mau aku lebih jarang soal ini?" Data lokal, bisa dihapus.

---

## 13. Analisis: bagaimana mencegah pengguna marah

| # | Risiko | Peluang | Dampak | Mitigasi |
|---|---|---|---|---|
| 1 | **Kaget saat sedang fokus / di kelas** (suara) | Sedang | Tinggi | Tanpa suara bawaan; tidak muncul saat timer; jam tenang; ph5 hanya opt-in + bendera mati di v1 |
| 2 | **Terasa dihakimi** ("aku dimarahi karena malas") | Tinggi | Tinggi | Kemarahan hanya pada kuis/situasi permainan; definisi "terlewat" hanya `planned`; tangga naik pelan; selalu ada jalan keluar; tanpa kalimat soal karakter pengguna |
| 3 | **Terlalu sering muncul** | Sedang | Sedang | Maks 3/hari, jarak 20 mnt, pembelajaran penolakan, saklar per pemicu |
| 4 | **Tidak bisa dimatikan** / sulit | Rendah | Sangat tinggi | Saklar di 3 tempat, pamitan tanpa bujukan, tur klasik tetap ada |
| 5 | **Remaja terintimidasi** | Sedang | Tinggi | Bawaan Seram ringan (ph1–ph3 saja), tanpa romansa/posesif, ph4/ph5 opt-in berlapis, tanpa data usia tapi dianggap mungkin di bawah umur |
| 6 | **Peka cahaya / kilatan** | Rendah | Sangat tinggi | Patuhi 3 kilatan/detik (WCAG 2.3.1); tanpa strobo; ukur luminans; lapisan redup; gerak dikurangi |
| 7 | **Kuis terasa tidak adil** | Sedang | Sedang | Self-report tanpa hukuman; pilihan tidak menjebak; petunjuk setelah salah; reset gauge; "Lewati kuis"; target ph3 hanya 5–15% |
| 8 | **Terjebak di tur** | Sedang | Tinggi | Lewati/Esc kapan saja; kemajuan tersimpan; tidak ada tur wajib |
| 9 | **Bahasa canggung / terjemahan kaku** | Sedang | Sedang | Naskah id & en ditulis terpisah; layar bahasa di awal; tinjauan penutur asli |
| 10 | **Pemicu salah** (liburan/sakit dianggap gagal) | Sedang | Tinggi | Absen ≠ gagal; Jeda libur; `skipped`/`deferred` bukan terlewat |
| 11 | **Audio terblokir/terlalu keras** | Sedang | Sedang | Audio hanya setelah gestur; tombol uji di perkenalan; gain dibatasi; fallback visual |
| 12 | **Pengguna merasa diawasi** | Rendah | Tinggi | Tanpa kalimat "aku melihatmu"; data lokal; nama opsional |
| 13 | **RAM/ukuran membengkak** | Sedang | Sedang | Aset lazy, WebP, batas ukuran, ph4/ph5/audio seram hanya bila opt-in |
| 14 | **Efek getar mual/pusing** | Rendah | Sedang | Amplitudo ≤ 3 px, maks 2 dtk/baris, saklar efek, mati saat gerak dikurangi |
| 15 | **Hak cipta/IP** | Rendah | Tinggi | Pola antarmuka saja; seni, frasa, dan musik orisinal/berlisensi; catat lisensi audio |
| 16 | **Konflik ekspektasi** (aplikasi produktivitas vs horor) | Sedang | Sedang | Pilihan intensitas di awal; bawaan lembut; tampilkan contoh nada di perkenalan |

**Prinsip penutup:** pengguna harus selalu merasa **memegang kendali** (bisa lewati, redam, matikan), **dipahami** (absen ≠ gagal), dan **diajak bermain** (bukan dihakimi).

---

## 14. Bahasa dan naskah

- **Dua naskah, bukan terjemahan:** `script.id.ts` dan `script.en.ts` (struktur sama, kalimat ditulis natural). Kamus UI tetap di `src/i18n`.
- **Nada id:** akrab, "kamu", partikel ("lho", "deh", "nih", "ya~"), tidak berlebihan; hindari slang yang cepat basi; hindari bahasa baku kaku.
- **Nada en:** playful, contractions ("don't", "I'll"), jangan terjemah harfiah partikel Indonesia; gunakan `~` hemat.
- **Panjang:** ≤ 2 baris per simpul (≤ 90 karakter); tiap simpul satu gagasan.
- **Nama:** `{nama}` bila ada; bila kosong, gunakan "kamu"/"you". Stabilo tidak menyebut nama saat ph3/ph5.
- **Placeholder UI:** semua label tombol dari kamus; saat label berubah, naskah ikut.
- **Pengujian bahasa:** baca keras 2 penutur asli per bahasa; hapus kalimat yang terasa menyindir.

---

## 15. Arsitektur kode

```
src/features/stabilo/
  index.ts                      # titik masuk; lazy-load, bendera, prefs
  StabiloProvider.tsx           # hanya memuat bila prefs.enabled
  engine/
    dialogue.ts                 # mesin simpul, pilihan, kuis, gauge (TS murni)
    typewriter.ts               # ketik + lip-flap (closed/open) + jeda tanda baca
    effects.ts                  # tremble, glitch, vignette, sparkle (CSS class + timer)
    schedule.ts                 # aturan kemunculan harian + anggaran + tangga
  ui/
    DialogueBox.tsx  Sprite.tsx  Gauge.tsx  QuizPoint.tsx  Banner.tsx  Bubble.tsx
  script/
    tour.id.ts  tour.en.ts  daily.id.ts  daily.en.ts
  assets.ts                     # manifest + prefetch + placeholder
  audio.ts                      # lazy; izin gestur; gain; fallback
  flags.ts                      # STABILO_FULL_HORROR (false di v1)
src/lib/events.ts               # bus peristiwa
src/features/day/DayClock.ts    # day.started / day.ended / block.missed / streak.absent
src/features/language/LanguageGate.tsx  # layar bahasa (di luar IntroGate)
```

**Aturan:**
1. `engine/*` **tanpa React**; menerima peristiwa, mengembalikan instruksi; mudah diuji.
2. Tur klasik dan Stabilo berbagi satu daftar langkah (`data-tour`); `TourPresenter = Classic | Stabilo` dipilih dari `prefs.enabled`.
3. Preferensi disimpan di tabel `meta` (kunci `stabilo`), **tanpa** mengubah indeks Dexie. Kemajuan: `{ nodeId, gauge, quizResults, startedAt }`.
4. **Tanpa dependensi baru.** Animasi: CSS; GSAP (lazy, sudah ada) hanya untuk zoom jumpscare/guncangan bila perlu.
5. Anggaran: JS Stabilo ≤ 25 KB gzip (selain naskah); naskah id/en dimuat sesuai bahasa.
6. `DayClock` berjalan hanya bila Stabilo aktif; interval 60 dtk; berhenti saat jendela tersembunyi.
7. Perbaiki bug tanggal Hari ini (tanggal kini mengikuti `day.started`), sebagai PR terpisah bila perlu.

**Tipe preferensi:**

```ts
interface StabiloPrefs {
  enabled: boolean;
  intensity: "sweet" | "spooky" | "full";     // 'full' = opt-in, bendera
  sound: "off" | "soft" | "normal";
  fx: boolean;                                 // getar & glitch
  triggers: { dayStart: boolean; dayEnd: boolean; done: boolean; missed: boolean };
  quietHours: { from: string; to: string };
  holidayUntil?: number;                       // Jeda libur (epoch ms)
  nickname?: string;
  muted: Partial<Record<string, number>>;      // pemicu yang diredam sampai (epoch ms)
  progress?: { nodeId: string; gauge: 0|1|2|3; quiz: Record<string, "ok"|"fail"> };
  lastPh5At?: number; ph3Seen: number;
}
```

**Potongan inti (sketsa, belum dijalankan):**

```ts
// engine/typewriter.ts
export function speak(text: string, opts: { ms?: number; onFrame(s: "closed"|"open"): void; onChar(i: number): void; signal: AbortSignal }) {
  const ms = opts.ms ?? 30; let open = false;
  return new Promise<void>((res) => {
    let i = 0;
    const tick = () => {
      if (opts.signal.aborted || i >= text.length) { opts.onFrame("closed"); return res(); }
      const ch = text[i++]; opts.onChar(i);
      if (/[aiueoAIUEO]/.test(ch)) { open = !open; opts.onFrame(open ? "open" : "closed"); } else opts.onFrame("closed");
      const pause = /[.!?…]/.test(ch) ? 180 : /[,;:]/.test(ch) ? 90 : 0;
      setTimeout(tick, ms + pause);
    };
    tick();
  });
}
```

```css
/* efek getar per huruf; amplitudo dari variabel --a */
.tremble > .ch { display:inline-block; animation: tr .07s steps(2) infinite; }
@keyframes tr { 0%{transform:translate(calc(var(--a)*-1), 0)} 100%{transform:translate(var(--a), calc(var(--a)*.5))} }
@media (prefers-reduced-motion: reduce) { .tremble > .ch { animation:none } }
```

---

## 16. Aksesibilitas

- Gambar Stabilo `aria-hidden`; teks dialog tersedia di wilayah `aria-live="polite"` (versi penuh, tidak per huruf); pilihan dan kuis dapat dioperasikan keyboard (angka, Tab, Enter).
- Fokus: pindah ke kotak dialog saat tur mulai, kembali ke pemicu saat selesai; tidak mencuri fokus pada kemunculan harian (gelembung `role="status"`).
- Gerak dikurangi: tanpa getar, glitch, banner geser, zoom; tidur/napas statis.
- Kontras teks sesuai `DESIGN.md`; ukuran ≥ 17 px untuk dialog.
- Kilatan: patuhi WCAG 2.3.1 (≤ 3/detik, tanpa strobo, area aman).
- Opsi "Pembaca layar: jangan bacakan Stabilo".
- Target sentuh ≥ 44 px.

---

## 17. Pengujian dan metrik

**Uji kegunaan (5–8 pengguna, termasuk remaja):**
1. Lewati tur di 3 titik berbeda (tidak boleh ada keadaan setengah jadi).
2. Jawab salah 3 kali di Q1 (apakah ph3 terasa lucu atau mengintimidasi? apakah mudah keluar?).
3. Matikan Stabilo (target ≤ 15 detik tanpa petunjuk).
4. Tangkap reaksi saat blok tidak dikerjakan 3 hari berturut-turut (apakah terasa menghakimi?).
5. Ganti bahasa di tengah penggunaan (naskah ikut berganti).

**Metrik (lokal):**

| Metrik | Target awal |
|---|---|
| Selesai tur (atau lewati dengan sadar) | ≥ 80% |
| Jawaban benar pertama pada kuis | ≥ 70% |
| Mencapai ph3 dalam tur | 5–15% |
| Stabilo masih aktif setelah 7 hari | ≥ 60% |
| Dimatikan dalam 24 jam pertama | < 15% |
| Gelembung ditutup < 1 dtk | < 30% |
| Penggunaan Seram penuh (setelah bendera hidup) | Pantau; bukan target |

**Uji teknis:** RAM/CPU saat OFF, IDLE, tur berjalan (OFF harus sama dengan tanpa fitur); tidak ada loncatan saat pertukaran sprite (selisih piksel); audio terblokir → fallback visual; kilatan (luminans ph5) sebelum bendera hidup.

---

## 18. Rencana bertahap dan kriteria selesai

| Fase | Isi |
|---|---|
| **1** | LanguageGate; kontrak aset + manifest + placeholder; DialogueEngine; perkenalan Stabilo; Template 1 & 2; Tur Stabilo (T01–T08, Q1–Q3); ph1–ph3; pengaturan dasar; tur klasik sebagai cadangan |
| **2** | Event bus + DayClock; kemunculan harian (mulai/akhir/selesai/terlewat) dengan tangga ph1–ph3; anggaran, jam tenang, Jeda libur; pembelajaran penolakan |
| **3** | Audio (SFX kecil) + izin gestur; efek glitch/getar penuh; kuis *point* |
| **4** *(bendera)* | `ph4`/`ph5`, Seram penuh, jumpscare, uji luminans, opt-in berlapis |

**Kriteria selesai v1 (Fase 1–2):**
- [ ] Urutan bahasa → intro → perkenalan → template → tur berjalan; layar bahasa memengaruhi seluruh naskah.
- [ ] Tur selesai tanpa ph4/ph5; ph3 maksimum; **Lewati** selalu tersedia dan tidak memicu gedeg.
- [ ] Jawaban salah tiga kali berakhir dengan reset + petunjuk (tidak terjebak).
- [ ] Self-report "Belum paham" tidak pernah menaikkan gedeg.
- [ ] Mematikan Stabilo menghapus semua beban (tanpa timer/aset) dan tur klasik tetap berfungsi.
- [ ] Kemunculan harian mematuhi anggaran, jam tenang, dan tidak muncul saat timer berjalan.
- [ ] "Terlewat" hanya menghitung `planned`; absen ≥ 2 hari tidak memicu tangga.
- [ ] Gerak dikurangi mematikan getar/glitch/geser.
- [ ] JS Stabilo ≤ 25 KB gzip; aset ph1–ph3 lazy; tanpa dependensi baru.
- [ ] Daftar risiko (bagian 13) ditinjau; uji kegunaan dengan remaja lulus.

---

## 19. Instruksi untuk AI agent

1. Baca `DESIGN.md`, `INTRO-ANIMATION.md`, `guideBrief.md` (bagian 6, 9, 12), dan dokumen ini. Jangan mengubah token desain.
2. Kerjakan **per fase**; mulai Fase 1. Jangan menambah dependensi. Jangan mengimpor Tauri di luar `src/lib/desktop.ts` dan `src/lib/backup.ts`.
3. Aset belum ada: bangun dengan placeholder dan manifest; **jangan** membuat/mengarang gambar atau audio. Catat jalur berkas yang dibutuhkan.
4. `engine/*` murni TS dengan uji unit: simpul, pilihan, kuis, gauge, tangga, anggaran, `missedStreak`, aturan scarySmile, jam tenang.
5. Verifikasi di Tauri: perilaku gestur audio, `localStorage` pra-hidrasi untuk bahasa, z-index overlay (z-80/z-95).
6. Jangan mengaktifkan `STABILO_FULL_HORROR`; implementasi ph4/ph5 hanya setelah Fase 1–3 disetujui.
7. Laporkan: angka RAM/CPU, ukuran bundel tambahan, selisih piksel sprite, hasil uji kegunaan, dan deviasi dari dokumen ini.

---

## 20. Pertanyaan terbuka

1. **Gambar ke-11** apa? (Disebut "11 gambar utama" tetapi 10 nama; mungkin idle/senyum biasa?)
2. **Asumsi A1:** "7 hari terakhir blok belum selesai" kuartikan sebagai **7 hari terjadwal berturut-turut tanpa satu pun blok selesai**. Benar, atau maksudmu rasio (mis. < 25% dalam 7 hari)?
3. **Sumber audio:** direkam sendiri, dibeli, atau bebas lisensi? (Wajib catat lisensi.)
4. **Pintasan keyboard** sembunyikan Stabilo: `Ctrl/Cmd + Shift + S` cocok?
5. **Q3 jenis *point*** (klik elemen asli) sebaiknya masuk v1 atau Fase 3?
6. **Nama "Stabilo"** akan diterjemahkan/dipakai sama di versi Inggris? (Disarankan tetap.)

---

## 21. Sumber

- DDLC (kawaii → uncanny, glitch, persetujuan awal): press-start.gla.ac.uk ("Doki Doki Subversion Club!", Matthew Allan); tortoise.princeton.edu ("The Cute as Uncanny"); bloody-disgusting.com ("The Craft of Fourth Wall Breaking Anxiety in DDLC"); unionstreetjournal.com ("Cute girls and a horror story").
- Kilatan dan keselamatan: w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold; digitalaccessibility.nyu.edu/testing/sc231.html; kb.daisy.org (ambang area kilatan).
- Pola Clippy/Duolingo: lihat daftar sumber di `guideBrief.md` bagian 22.
