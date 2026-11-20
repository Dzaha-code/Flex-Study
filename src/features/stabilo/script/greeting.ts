import type { DialogueNode, DialogueScript, Lang } from "../engine/types";

/**
 * The daily greeting: Stabilo says hello once, the first time the app opens on
 * a new day, and sends the user off with one encouraging line.
 *
 * It is assembled rather than written as one fixed script, so it reads a little
 * differently every day:
 *
 * - the hello follows the time of day;
 * - one line reacts to the actual day: how many blocks are planned, how
 *   yesterday went, a journal streak worth naming;
 * - the encouragement rotates through a pool, picked by the date, so two days
 *   in a row never share a line and the same date always gets the same one
 *   (re-opening the app the same day cannot reshuffle what she said);
 * - Monday, Friday and the weekend get a line of their own.
 *
 * Pure: the clock, the plan and the name are all passed in, so the whole thing
 * is testable without a browser. `{{name}}` is left for the host to fill, the
 * same way the other scripts do it.
 */

export interface GreetingContext {
  lang: Lang;
  /** `YYYY-MM-DD`, the day being greeted. */
  date: string;
  /** Local hour, 0–23. */
  hour: number;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
  blocksToday: number;
  /** Title of the first block on today's timeline, if there is one. */
  firstBlock: string | null;
  plannedYesterday: number;
  doneYesterday: number;
  /** Consecutive journal days ending yesterday or today. */
  journalStreak: number;
  /** True the very first time: she also says how to turn this off. */
  firstTime: boolean;
}

type Slot = "morning" | "noon" | "afternoon" | "evening";

export function slotFor(hour: number): Slot {
  if (hour >= 4 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "noon";
  if (hour >= 15 && hour < 18) return "afternoon";
  return "evening";
}

/** Whole days since 1970-01-01 for a `YYYY-MM-DD`, independent of time zone. */
export function dayNumber(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1) / 86_400_000);
}

/**
 * The pool index for a day. Stepping by a number coprime with the pool size
 * visits every line before repeating, and consecutive days never land on the
 * same line, while still looking less like a plain countdown.
 */
export function rotate(day: number, size: number, salt = 0): number {
  if (size <= 1) return 0;
  let step = 7;
  while (gcd(step, size) !== 1) step += 1;
  return (((day + salt) * step) % size + size) % size;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

interface Lines {
  hello: Record<Slot, string[]>;
  /** Teasing alternates for the "spooky" temperament; sweet uses `hello`. */
  helloSpooky: Record<Slot, string>;
  weekday: Partial<Record<number, string>>;
  blocks: (count: number, first: string | null) => string;
  empty: string;
  yesterdayGood: (done: number, planned: number) => string;
  yesterdayAll: (done: number) => string;
  yesterdayRough: string;
  streak: (days: number) => string;
  cheer: string[];
  closing: string[];
  howToTurnOff: string;
}

const ID: Lines = {
  hello: {
    morning: [
      "Selamat pagi{{name}}! ✿",
      "Pagi{{name}}~ Sudah minum air putih?",
      "Halo, selamat pagi{{name}}. Aku sudah bangun duluan, lho.",
    ],
    noon: [
      "Selamat siang{{name}}!",
      "Siang{{name}}~ Sudah makan, belum?",
      "Siang{{name}}! Matahari lagi tinggi-tingginya.",
    ],
    afternoon: [
      "Selamat sore{{name}}!",
      "Sore{{name}}~ Masih ada waktu buat satu blok, kok.",
      "Halo{{name}}, sore yang pas buat fokus sebentar.",
    ],
    evening: [
      "Selamat malam{{name}}.",
      "Malam{{name}}~ Belajar malam juga tetap dihitung.",
      "Sudah malam{{name}}. Jangan begadang terlalu larut, ya.",
    ],
  },
  helloSpooky: {
    morning: "Pagi{{name}}... aku sudah menunggumu dari subuh. Hehe~",
    noon: "Siang{{name}}. Akhirnya kamu buka aku juga~",
    afternoon: "Sore{{name}}... kupikir kamu lupa padaku. Hehe.",
    evening: "Malam{{name}}... di jam segini aku paling bersemangat, lho~",
  },
  weekday: {
    1: "Senin lagi. Awal pekan itu kesempatan buat mulai rapi.",
    5: "Sudah Jumat! Satu dorongan lagi sebelum akhir pekan.",
    6: "Akhir pekan. Blok yang ringan pun tetap berarti.",
    0: "Hari Minggu. Santai boleh, asal jangan lupa menyiapkan pekan depan.",
  },
  blocks: (count, first) =>
    first
      ? `Hari ini ada ${count} blok. Yang pertama: ${first}.`
      : `Hari ini ada ${count} blok menunggumu.`,
  empty: "Hari ini masih kosong. Mau mulai dengan satu blok kecil?",
  yesterdayGood: (done, planned) =>
    `Kemarin kamu menyelesaikan ${done} dari ${planned} blok. Itu kemajuan.`,
  yesterdayAll: (done) => `Kemarin kamu menyelesaikan semua ${done} blok. Keren sekali! ✿`,
  yesterdayRough: "Kemarin terasa berat? Nggak apa-apa. Hari ini kita mulai lagi.",
  streak: (days) => `Jurnalmu sudah ${days} hari berturut-turut. Jangan putus, ya~`,
  cheer: [
    "Nggak perlu sempurna. Yang penting kamu kembali lagi hari ini.",
    "Satu blok yang selesai lebih baik dari sepuluh yang cuma direncanakan.",
    "Mulai dari yang paling kecil dulu. Momentum datang belakangan.",
    "Kalau harimu berantakan, geser saja jadwalnya. Itu bukan gagal.",
    "Fokus 25 menit saja dulu. Sisanya biasanya ikut.",
    "Kamu lebih jauh dari yang kamu kira. Lihat saja tujuh hari terakhirmu.",
    "Istirahat juga bagian dari rencana, bukan musuhnya.",
    "Hari ini cukup jadi sedikit lebih baik dari kemarin.",
    "Tarik napas dulu. Satu hal, lalu yang berikutnya.",
    "Tugas yang paling kamu hindari biasanya yang paling lega setelah selesai.",
    "Aku percaya kamu bisa. Aku kan sudah lihat catatanmu~",
    "Belajar itu bukan lomba. Pelan asal terus, tetap sampai.",
    "Matikan notifikasi sebentar. Dunia bisa menunggu satu blok.",
    "Tulis satu hal yang kamu pelajari nanti malam. Itu sudah kemenangan.",
  ],
  closing: [
    "Semangat, ya! Aku ada di sini kalau kamu butuh.",
    "Ayo mulai. Aku menyemangati dari pinggir~",
    "Sudah, sana fokus! Sampai jumpa besok pagi.",
    "Semoga harimu menyenangkan. ✿",
  ],
  howToTurnOff:
    "Oh iya, aku akan menyapa sekali setiap hari. Kalau kurang suka, matikan saja di Atur → Stabilo.",
};

const EN: Lines = {
  hello: {
    morning: [
      "Good morning{{name}}! ✿",
      "Morning{{name}}~ Had some water yet?",
      "Hi, good morning{{name}}. I was up before you, you know.",
    ],
    noon: [
      "Good afternoon{{name}}!",
      "Hi{{name}}~ Have you eaten yet?",
      "Good afternoon{{name}}, the sun is at its highest.",
    ],
    afternoon: [
      "Good afternoon{{name}}!",
      "Afternoon{{name}}~ There is still time for one block.",
      "Hi{{name}}, a nice afternoon for a little focus.",
    ],
    evening: [
      "Good evening{{name}}.",
      "Evening{{name}}~ Studying at night still counts.",
      "Good evening{{name}}. Don't stay up too late, okay?",
    ],
  },
  helloSpooky: {
    morning: "Morning{{name}}... I've been waiting since dawn. Hehe~",
    noon: "Afternoon{{name}}. You finally opened me~",
    afternoon: "Evening is coming{{name}}... I thought you forgot me. Hehe.",
    evening: "Evening{{name}}... this is when I'm most awake, you know~",
  },
  weekday: {
    1: "Monday again. A new week is a chance to start tidy.",
    5: "It's Friday! One more push before the weekend.",
    6: "Weekend. Even a light block still counts.",
    0: "Sunday. Rest is fine, just don't forget to set up next week.",
  },
  blocks: (count, first) =>
    first
      ? `You have ${count} blocks today. The first one: ${first}.`
      : `${count} blocks are waiting for you today.`,
  empty: "Today is still empty. Want to start with one small block?",
  yesterdayGood: (done, planned) =>
    `Yesterday you finished ${done} of ${planned} blocks. That's progress.`,
  yesterdayAll: (done) => `Yesterday you finished all ${done} blocks. Amazing! ✿`,
  yesterdayRough: "Was yesterday heavy? That's okay. Today we start again.",
  streak: (days) => `Your journal is on a ${days}-day streak. Don't break it~`,
  cheer: [
    "It doesn't have to be perfect. What matters is that you came back today.",
    "One finished block beats ten that were only planned.",
    "Start with the smallest thing. Momentum comes later.",
    "If your day falls apart, just shift it. That isn't failing.",
    "Just 25 minutes of focus first. The rest usually follows.",
    "You're further along than you think. Look at your last seven days.",
    "Rest is part of the plan, not its enemy.",
    "Today only has to be a little better than yesterday.",
    "Breathe first. One thing, then the next.",
    "The task you avoid most is usually the biggest relief once it's done.",
    "I believe in you. I've seen your notes, after all~",
    "Learning isn't a race. Slow but steady still arrives.",
    "Silence your notifications for a bit. The world can wait one block.",
    "Write down one thing you learned tonight. That's already a win.",
  ],
  closing: [
    "You've got this! I'm here if you need me.",
    "Let's begin. I'll be cheering from the side~",
    "Go on, focus! See you tomorrow morning.",
    "Have a lovely day. ✿",
  ],
  howToTurnOff:
    "Oh, and I'll say hello once a day. If you'd rather I didn't, turn it off in Settings → Stabilo.",
};

const LINES: Record<Lang, Lines> = { id: ID, en: EN };

/** The line about today's plan or yesterday's result, whichever says more. */
function situationLine(lines: Lines, context: GreetingContext): string {
  if (context.plannedYesterday > 0) {
    if (context.doneYesterday >= context.plannedYesterday) {
      return lines.yesterdayAll(context.doneYesterday);
    }
    if (context.doneYesterday === 0) return lines.yesterdayRough;
  }
  if (context.blocksToday === 0) return lines.empty;
  if (context.plannedYesterday > 0 && context.doneYesterday > 0) {
    return `${lines.yesterdayGood(context.doneYesterday, context.plannedYesterday)} ${lines.blocks(
      context.blocksToday,
      context.firstBlock,
    )}`;
  }
  return lines.blocks(context.blocksToday, context.firstBlock);
}

export function buildGreeting(context: GreetingContext): DialogueScript {
  const lines = LINES[context.lang] ?? ID;
  const day = dayNumber(context.date);
  const slot = slotFor(context.hour);
  const hellos = lines.hello[slot];

  const order: DialogueNode[] = [];

  order.push({
    id: "g-hello",
    text: hellos[rotate(day, hellos.length)] ?? hellos[0] ?? "",
    mode: { spooky: lines.helloSpooky[slot] },
    fx: ["sparkle"],
  });

  const weekdayLine = lines.weekday[context.weekday];
  if (weekdayLine) order.push({ id: "g-weekday", text: weekdayLine });

  order.push({ id: "g-today", text: situationLine(lines, context) });

  if (context.journalStreak >= 3) {
    order.push({ id: "g-streak", text: lines.streak(context.journalStreak) });
  }

  order.push({
    id: "g-cheer",
    text: lines.cheer[rotate(day, lines.cheer.length, 3)] ?? lines.cheer[0] ?? "",
  });

  if (context.firstTime) order.push({ id: "g-off", text: lines.howToTurnOff });

  order.push({
    id: "g-bye",
    text: lines.closing[rotate(day, lines.closing.length, 1)] ?? lines.closing[0] ?? "",
    fx: ["sparkle"],
  });

  const nodes: Record<string, DialogueNode> = {};
  order.forEach((node, index) => {
    const next = order[index + 1];
    nodes[node.id] = next ? { ...node, next: next.id } : node;
  });

  return { id: "greeting", lang: context.lang, start: order[0]?.id ?? "g-hello", nodes };
}
