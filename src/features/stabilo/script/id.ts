import type { DialogueScript } from "../engine/types";

/**
 * Naskah Indonesia.
 *
 * Aturan yang dipegang: satu gagasan per simpul, kalimat pendek, dan tidak ada
 * daftar berkolon — bahasa yang diucapkan jarang berbunyi seperti dokumentasi.
 * Partikel ("ya", "kok", "lho") dipakai secukupnya supaya terdengar seperti
 * orang, bukan seperti teks bantuan.
 */

export const INTRO_ID: DialogueScript = {
  id: "intro",
  lang: "id",
  start: "i01",
  nodes: {
    i01: {
      id: "i01",
      text: "Halo! Akhirnya ketemu juga. Aku Stabilo, penunggu FlexStudy.",
      next: "i02",
    },
    i02: {
      id: "i02",
      text: "Sebelum mulai, aku boleh tahu namamu?",
      input: "nickname",
      next: "i03",
    },
    i03: {
      id: "i03",
      text: "Salam kenal{{name}}~ ✿",
      fx: ["sparkle"],
      next: "i04",
    },
    i04: {
      id: "i04",
      text: "Mau aku yang manis, atau boleh sedikit nakal?",
      pick: "intensity",
      next: "i05",
    },
    i05: {
      id: "i05",
      text: "FlexStudy itu jadwal yang memaafkan. Kalau harimu berantakan, tinggal digeser.",
      next: "i06",
    },
    i06: {
      id: "i06",
      text: "Sekarang pilih template yang paling mirip hidupmu, ya.",
      next: "i07",
    },
    i07: {
      id: "i07",
      text: "Aku tunggu di sana. Panggil saja kalau bingung.",
      fx: ["sparkle"],
    },
  },
};

export const TOUR_ID: DialogueScript = {
  id: "tour",
  lang: "id",
  start: "t01",
  nodes: {
    t01: {
      id: "t01",
      route: "/",
      target: "nav",
      text: "Ini menu utama. Pagi-pagi kamu paling sering ke {{today}}.",
      next: "t02",
    },
    t02: {
      id: "t02",
      route: "/",
      target: "focus",
      text: "Blok pertamamu di sini. Tombol {{start}} langsung menyalakan timer.",
      ask: "understood",
      onUnsure: "t02b",
      next: "q1",
    },
    t02b: {
      id: "t02b",
      route: "/",
      target: "focus",
      slow: true,
      text: "Lihat blok ini. Ada tombol {{start}} di dalamnya.",
      next: "q1",
    },
    q1: {
      id: "q1",
      route: "/",
      target: "focus",
      text: "Eh, tunggu dulu!",
      fx: ["pause"],
      quiz: {
        id: "quiz-start",
        kind: "choice",
        prompt: "Mau menyalakan timer, tekan yang mana?",
        options: [
          { label: "{{start}}", correct: true },
          { label: "{{finish}}" },
          { label: "{{skip}}" },
        ],
      },
      next: "t03",
    },
    t03: {
      id: "t03",
      route: "/",
      target: "progress",
      text: "Garis ini terisi pelan-pelan tiap blok selesai.",
      next: "t04",
    },
    t04: {
      id: "t04",
      route: "/",
      target: "shift",
      text: "Kalau hari berantakan, pakai {{shift}}. Sisa blok pindah, target tetap.",
      ask: "understood",
      onUnsure: "t04b",
      next: "q2",
    },
    t04b: {
      id: "t04b",
      route: "/",
      target: "shift",
      slow: true,
      text: "Tombol {{shift}} memindahkan sisa blok. Targetmu tidak ikut turun.",
      next: "q2",
    },
    q2: {
      id: "q2",
      route: "/",
      target: "shift",
      text: "Eh, tunggu dulu!",
      fx: ["pause"],
      quiz: {
        id: "quiz-shift",
        kind: "choice",
        prompt: "Hari ini nggak keburu. Kamu pilih apa?",
        options: [
          { label: "{{shift}}", correct: true },
          { label: "Hapus semua blok" },
          { label: "Diamkan saja" },
        ],
      },
      next: "t04c",
    },
    t04c: {
      id: "t04c",
      route: "/",
      target: "add",
      text: "Butuh blok lain? Tambah di sini.",
      next: "t04d",
    },
    t04d: {
      id: "t04d",
      route: "/",
      target: "streak",
      text: "Kotak-kotak ini menandai hari yang kamu kerjakan.",
      next: "t04e",
    },
    t04e: {
      id: "t04e",
      route: "/",
      target: "recap",
      text: "Mau lihat sebulan? Rekap ada di sini.",
      next: "t05",
    },
    t05: {
      id: "t05",
      route: "/week",
      target: "week-targets",
      accent: true,
      text: "Target tiap kategori tinggal di {{week}}.",
      next: "q3",
    },
    q3: {
      id: "q3",
      route: "/week",
      target: "week-targets",
      text: "Eh, tunggu dulu!",
      fx: ["pause"],
      quiz: {
        id: "quiz-week",
        kind: "choice",
        prompt: "Target mingguan ada di layar mana?",
        options: [
          { label: "{{week}}", correct: true },
          { label: "{{journal}}" },
          { label: "{{settings}}" },
        ],
      },
      next: "t06",
    },
    t06: {
      id: "t06",
      route: "/journal",
      target: "journal-entry",
      text: "Malamnya, dua kalimat di {{journal}} sudah cukup.",
      next: "t06b",
    },
    t06b: {
      id: "t06b",
      route: "/journal",
      target: "journal-history",
      text: "Tulisan lama tersimpan di bawah. Bisa dicari dan dibintangi.",
      next: "t07",
    },
    t07: {
      id: "t07",
      route: "/settings",
      target: "settings-appearance",
      text: "Tema dan lebar layar diatur di sini.",
      mode: {
        sweet: "Tema dan lebar layar diatur di sini. Sesukamu.",
        spooky: "Tema dan lebar layar diatur di sini. Aku suka yang gelap.",
      },
      accent: true,
      next: "t07a",
    },
    t07a: {
      id: "t07a",
      route: "/settings",
      target: "settings-custom-templates",
      text: "Simpan susunan blokmu jadi template sendiri, lalu pakai lagi kapan saja.",
      next: "t07b",
    },
    t07b: {
      id: "t07b",
      route: "/settings",
      target: "settings-data",
      text: "Di sini datamu bisa dicadangkan ke satu berkas.",
      next: "t07c",
    },
    t07c: {
      id: "t07c",
      route: "/settings",
      target: "settings-stabilo",
      text: "Kalau aku terlalu berisik, matikan aku di panel ini.",
      next: "t08",
    },
    t08: {
      id: "t08",
      route: "/guide",
      target: "guide-quick",
      text: "Itu saja. Kalau lupa, panggil aku di {{guide}}.",
      fx: ["sparkle"],
    },
  },
};

/**
 * The same walkthrough for a day with no blocks yet.
 *
 * The tour used to describe a focus card that only exists once a block does, so
 * on a fresh install the first real step had nothing to point at — no ring, and
 * a line about a button the user could not see. Only three nodes differ; the
 * rest of the route is shared, so the two variants cannot drift apart.
 */
export const TOUR_ID_EMPTY: DialogueScript = {
  ...TOUR_ID,
  nodes: {
    ...TOUR_ID.nodes,
    t02: {
      id: "t02",
      route: "/",
      target: "first-block",
      text: "Hari ini masih kosong. Mulai dari tombol ini, ya.",
      ask: "understood",
      onUnsure: "t02b",
      next: "q1",
    },
    t02b: {
      id: "t02b",
      route: "/",
      target: "first-block",
      slow: true,
      text: "Lihat tombol ini. Satu blok dulu, jangan banyak-banyak.",
      next: "q1",
    },
    q1: {
      id: "q1",
      route: "/",
      target: "first-block",
      text: "Eh, tunggu dulu!",
      fx: ["pause"],
      quiz: {
        id: "quiz-first",
        kind: "choice",
        prompt: "Mau bikin blok pertama, tekan yang mana?",
        options: [
          { label: "Buat blok pertama", correct: true },
          { label: "Buka template" },
          { label: "Hari ini berantakan" },
        ],
      },
      next: "t03",
    },
  },
};
