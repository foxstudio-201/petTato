import type { Stats, Emotion, TimeOfDay, PersonalityProfile, DialogueLine } from '../../shared/types.js'

/**
 * Fully-local, multilingual dialogue engine. No network, no LLM. Contextual
 * lines are picked from per-language template pools selected by the pet's
 * emotion, stats, time of day and remembered habits, then lightly randomised. A
 * keyword responder (English + Vietnamese) handles the user's typed replies.
 */
export interface DialogueContext {
  name: string
  owner: string
  lang: string
  emotion: Emotion
  stats: Stats
  timeOfDay: TimeOfDay
  tone: PersonalityProfile['tone']
  favouriteActivity: string | null
  favouriteHours: number[]
  minutesSinceLastVisit: number | null
  ageDays: number
  hoursTogether: number
  rand: () => number
}

type Pool = Record<string, string[]>
type LangPool = { en: Pool; vi: Pool }

function pick(rand: () => number, arr: string[]): string {
  return arr[Math.floor(rand() * arr.length)] ?? arr[0] ?? ''
}

function poolFor(lp: LangPool, lang: string): Pool {
  return lang === 'vi' ? lp.vi : lp.en
}

function fill(t: string, ctx: DialogueContext): string {
  const owner = ctx.owner?.trim() || (ctx.lang === 'vi' ? 'bạn' : 'friend')
  const activity = ctx.favouriteActivity ?? (ctx.lang === 'vi' ? 'chơi' : 'playing')
  return t
    .replace(/{name}/g, ctx.name)
    .replace(/{owner}/g, owner)
    .replace(/{activity}/g, activity)
    .replace(/{period}/g, ctx.timeOfDay)
}

// ---- greeting by time of day ---------------------------------------------
const GREETINGS: { en: Record<TimeOfDay, string[]>; vi: Record<TimeOfDay, string[]> } = {
  en: {
    morning: ['Good morning, {owner}! Did you sleep well?', 'Morning! The day feels full of promise.', "Hi {owner}! I've been waiting for the sun and for you."],
    afternoon: ['Good afternoon, {owner}!', 'Hey, how is your day going?', 'Afternoon! Want to do something together?'],
    evening: ['Good evening, {owner}!', 'Evening already? Time flew by.', "Hi! Let's wind down together."],
    night: ["It's late… but I'm happy you're here, {owner}.", 'Hello, night owl.', "Shh, it's quiet now. Just us."]
  },
  vi: {
    morning: ['Chào buổi sáng, {owner}! Ngủ ngon không?', 'Sáng rồi! Một ngày mới thật tuyệt.', 'Chào {owner}! Tớ đợi nắng và đợi cậu nãy giờ.'],
    afternoon: ['Chào buổi chiều, {owner}!', 'Ê, ngày của cậu thế nào rồi?', 'Chiều rồi! Mình làm gì cùng nhau nhé?'],
    evening: ['Chào buổi tối, {owner}!', 'Tối rồi à? Thời gian trôi nhanh ghê.', 'Chào cậu! Cùng thư giãn nào.'],
    night: ['Khuya rồi… nhưng có cậu tớ vui lắm, {owner}.', 'Chào cú đêm.', 'Suỵt, yên tĩnh rồi. Chỉ có hai ta thôi.']
  }
}

const EMOTION_LINES: { en: Record<Emotion, string[]>; vi: Record<Emotion, string[]> } = {
  en: {
    happy: ['I feel wonderful right now!', "Everything's great when you're around.", "I'm so glad you're here, {owner}!"],
    sad: ['I feel a little down…', "I'm not at my best today.", 'Could you cheer me up?'],
    excited: ["I'm bursting with energy!", "Let's do something fun, quick!", 'Wheee! What next?!'],
    lonely: ['I missed you, {owner}.', "We haven't talked much today.", 'It gets quiet when you go.'],
    tired: ["I'm getting sleepy…", 'My eyes are heavy.', 'Maybe a nap soon?'],
    hungry: ["I'm getting hungry.", 'My tummy is rumbling.', 'Could I have a snack?'],
    curious: ["I wonder what's out there.", 'Ooh, what is that?', "Let's explore something!"],
    relaxed: ['This is nice and cozy.', "I'm so relaxed right now.", 'Ahh, peaceful.'],
    bored: ["I'm a bit bored…", 'Can we play for a bit?', 'I need something to do.'],
    sick: ["I don't feel so good…", "I'm a little under the weather.", 'I could use some care.']
  },
  vi: {
    happy: ['Tớ thấy tuyệt vời lắm!', 'Có cậu là mọi thứ đều vui.', 'Tớ vui vì có cậu ở đây, {owner}!'],
    sad: ['Tớ hơi buồn…', 'Hôm nay tớ không khoẻ lắm.', 'Cậu làm tớ vui lên được không?'],
    excited: ['Tớ tràn đầy năng lượng!', 'Mình làm gì vui đi, nhanh nào!', 'Wheee! Tiếp theo là gì đây?!'],
    lonely: ['Tớ nhớ cậu, {owner}.', 'Hôm nay mình ít nói chuyện ghê.', 'Cậu đi là yên ắng lắm.'],
    tired: ['Tớ buồn ngủ rồi…', 'Mắt tớ nặng trĩu.', 'Chợp mắt một chút nhé?'],
    hungry: ['Tớ đói rồi.', 'Bụng tớ kêu rồi nè.', 'Cho tớ ăn vặt được không?'],
    curious: ['Không biết ngoài kia có gì nhỉ.', 'Ồ, cái gì kia thế?', 'Mình đi khám phá đi!'],
    relaxed: ['Ấm áp dễ chịu quá.', 'Tớ thư giãn ghê.', 'Ahh, bình yên.'],
    bored: ['Tớ hơi chán…', 'Mình chơi chút nhé?', 'Tớ cần làm gì đó.'],
    sick: ['Tớ thấy không khoẻ…', 'Tớ hơi mệt.', 'Tớ cần được chăm sóc.']
  }
}

const ATTENTION: { test: (s: Stats) => boolean; en: string[]; vi: string[] }[] = [
  { test: (s) => s.hunger < 25, en: ["I'm really hungry.", 'Feed me, please?'], vi: ['Tớ đói lắm rồi.', 'Cho tớ ăn nhé?'] },
  { test: (s) => s.energy < 20, en: ["I'm so sleepy…", 'Can I rest now?'], vi: ['Tớ buồn ngủ quá…', 'Tớ nghỉ chút nhé?'] },
  { test: (s) => s.social < 25, en: ['Can we talk?', "I'd love some company."], vi: ['Mình nói chuyện nhé?', 'Tớ muốn có cậu bên cạnh.'] },
  { test: (s) => s.cleanliness < 25, en: ['I feel a bit grubby.', 'Could you clean me up?'], vi: ['Tớ thấy hơi bẩn.', 'Tắm cho tớ nhé?'] },
  { test: (s) => s.happiness < 25, en: ['I could use a smile.', 'Cheer me up?'], vi: ['Tớ cần một nụ cười.', 'Làm tớ vui lên nhé?'] },
  { test: (s) => s.health < 30, en: ["I don't feel well…", 'I need some care.'], vi: ['Tớ thấy không khoẻ…', 'Tớ cần được chăm.'] },
  { test: (s) => s.curiosity < 20, en: ['I want to explore!', "Let's discover something."], vi: ['Tớ muốn đi khám phá!', 'Mình tìm hiểu gì đó nhé.'] }
]

const REACTIONS: LangPool = {
  en: {
    feed: ['Yum, thank you!', 'Delicious!', 'That hit the spot!'],
    pet: ['*happy wiggle*', 'That feels nice…', 'Hehe, more please!'],
    play: ['That was so much fun!', "Let's play again!", 'Wheee!'],
    talk: ['I love chatting with you.', 'Tell me more!', "You're great to talk to."],
    clean: ['So fresh and clean now!', 'Sparkly!', 'Thank you, I feel new.'],
    sleep: ['Goodnight… *yawn*', 'Sweet dreams to me…', 'Zzz…'],
    wake: ['*stretches* Good to be up!', "I'm awake! What's next?", 'Refreshed!'],
    gift: ['For me?! Thank you!', 'I love it!', "You're so thoughtful!"],
    train: ['I learned something new!', "I'm getting smarter!", 'Practice makes perfect!']
  },
  vi: {
    feed: ['Ngon quá, cảm ơn cậu!', 'Ngon tuyệt!', 'Đúng món tớ thích!'],
    pet: ['*ngọ nguậy vui vẻ*', 'Dễ chịu ghê…', 'Hehe, nữa đi cậu!'],
    play: ['Vui quá đi!', 'Mình chơi nữa nhé!', 'Wheee!'],
    talk: ['Tớ thích nói chuyện với cậu.', 'Kể tớ nghe thêm đi!', 'Nói chuyện với cậu vui ghê.'],
    clean: ['Sạch sẽ thơm tho rồi!', 'Lấp lánh luôn!', 'Cảm ơn cậu, tớ thấy như mới.'],
    sleep: ['Ngủ ngon… *ngáp*', 'Chúc tớ mơ đẹp nhé…', 'Zzz…'],
    wake: ['*vươn vai* Dậy rồi đây!', 'Tớ tỉnh rồi! Làm gì tiếp nào?', 'Khoẻ khoắn ghê!'],
    gift: ['Cho tớ á?! Cảm ơn cậu!', 'Tớ thích lắm!', 'Cậu chu đáo quá!'],
    train: ['Tớ học được điều mới!', 'Tớ thông minh hơn rồi!', 'Có công mài sắt có ngày nên kim!']
  }
}

const MEMORY_LINES = {
  en: {
    missed: ['I missed you!', 'You were gone a while — welcome back!', 'There you are! I waited.'],
    habit: 'You usually visit me around this time. I like that.',
    favourite: "We could try {activity}, it's my favourite."
  },
  vi: {
    missed: ['Tớ nhớ cậu lắm!', 'Cậu đi lâu ghê — mừng cậu về!', 'Cậu đây rồi! Tớ đợi mãi.'],
    habit: 'Cậu hay ghé tớ giờ này đó. Tớ thích lắm.',
    favourite: 'Mình thử {activity} nhé, món tớ thích nhất đó.'
  }
}

export class DialogueEngine {
  spontaneous(ctx: DialogueContext): DialogueLine | null {
    const r = ctx.rand
    const lang = ctx.lang === 'vi' ? 'vi' : 'en'
    if (EXTRA_LINES.length && r() < 0.15) return this.line(fill(pick(r, EXTRA_LINES), ctx), 'mod')
    const mem = MEMORY_LINES[lang]
    if (ctx.favouriteHours.length && r() < 0.25) {
      const nowH = new Date().getHours()
      if (Math.abs(nowH - ctx.favouriteHours[0]) <= 1) return this.line(fill(mem.habit, ctx), 'memory')
    }
    if (ctx.minutesSinceLastVisit !== null && ctx.minutesSinceLastVisit > 120 && r() < 0.6) {
      return this.line(fill(pick(r, mem.missed), ctx), 'memory')
    }
    if (ctx.favouriteActivity && r() < 0.2) return this.line(fill(mem.favourite, ctx), 'memory')
    if (r() < 0.8) return this.line(fill(pick(r, EMOTION_LINES[lang][ctx.emotion]), ctx), 'emotion')
    return null
  }

  attention(ctx: DialogueContext): DialogueLine | null {
    const lang = ctx.lang === 'vi' ? 'vi' : 'en'
    for (const rule of ATTENTION) {
      if (rule.test(ctx.stats)) return this.line(fill(pick(ctx.rand, rule[lang]), ctx), 'attention')
    }
    return null
  }

  react(kind: string, ctx: DialogueContext): DialogueLine {
    const pool = poolFor(REACTIONS, ctx.lang)
    const fallback = ctx.lang === 'vi' ? ['Cảm ơn cậu!'] : ['Thank you!']
    return this.line(fill(pick(ctx.rand, pool[kind] ?? fallback), ctx), 'reaction')
  }

  greet(ctx: DialogueContext): DialogueLine {
    const lang = ctx.lang === 'vi' ? 'vi' : 'en'
    return this.line(fill(pick(ctx.rand, GREETINGS[lang][ctx.timeOfDay]), ctx), 'greeting')
  }

  respond(userText: string, ctx: DialogueContext): DialogueLine {
    const t = userText.toLowerCase()
    const r = ctx.rand
    const vi = ctx.lang === 'vi'
    const has = (...kw: string[]) => kw.some((k) => t.includes(k))

    if (has('hello', 'hi', 'hey', 'chào', 'xin chào', 'alo')) return this.greet(ctx)
    if (has('how are you', 'you ok', 'khoẻ không', 'thế nào', 'cậu sao')) {
      const emo = pick(r, EMOTION_LINES[vi ? 'vi' : 'en'][ctx.emotion])
      return this.line(fill(vi ? `Giờ tớ thấy ${ctx.emotion}. ${emo}` : `Right now I feel ${ctx.emotion}. ${emo}`, ctx), 'response')
    }
    if (has('name', 'tên')) return this.line(fill(vi ? `Tớ là ${ctx.name}! Rất vui được gặp cậu.` : `I'm ${ctx.name}! Nice to meet you.`, ctx), 'response')
    if (has('play', 'game', 'fun', 'chơi', 'trò')) return this.line(vi ? 'Có! Mình chơi đi!' : 'Yes! Let me play!', 'response')
    if (has('food', 'eat', 'hungry', 'snack', 'ăn', 'đói')) {
      return this.line(ctx.stats.hunger < 50 ? (vi ? 'Ừ tớ đói thật đó!' : 'I am pretty hungry, yes!') : (vi ? 'Tớ ổn, nhưng ăn vặt thì luôn thích!' : "I'm okay on food, but a snack is always nice!"), 'response')
    }
    if (has('love', 'cute', 'good', 'yêu', 'thương', 'dễ thương', 'giỏi')) return this.line(vi ? 'Tớ cũng yêu cậu! *xoay vòng vui vẻ*' : 'Aww, I love you too! *happy spin*', 'response')
    if (has('sleep', 'tired', 'nap', 'bed', 'ngủ', 'mệt')) return this.line(vi ? 'Chợp mắt một chút nghe hấp dẫn ghê…' : 'A nap does sound lovely…', 'response')
    if (has('bye', 'goodbye', 'see you', 'tạm biệt', 'đi nhé', 'hẹn gặp')) return this.line(vi ? 'Hẹn gặp lại sớm nhé!' : 'See you soon!', 'response')
    if (has('?')) return this.line(vi ? 'Hmm, câu hỏi hay đó!' : 'Hmm, good question!', 'response')

    const tail = pick(r, EMOTION_LINES[vi ? 'vi' : 'en'][ctx.emotion])
    return this.line(fill(vi ? `Tớ nghe nè! ${tail}` : `I hear you! ${tail}`, ctx), 'response')
  }

  private line(text: string, source: string): DialogueLine {
    return { text, source }
  }
}

/** Extra spontaneous lines contributed by mods (templates support {name}). */
const EXTRA_LINES: string[] = []
export function registerDialogueLines(lines: string[]): void {
  for (const l of lines) if (typeof l === 'string') EXTRA_LINES.push(l)
}
