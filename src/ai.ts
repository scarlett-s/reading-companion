import { AISettings, DiscussionTurn } from './types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 调用 OpenAI 兼容的 chat 接口（DeepSeek / Ollama / OpenAI） */
async function chat(settings: AISettings, messages: ChatMessage[], maxTokens = 500): Promise<string> {
  const base = settings.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: settings.model,
      messages,
      max_tokens: maxTokens,
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`AI 请求失败：${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// ===== 苏格拉底式提问 =====

/** 构建苏格拉底式提问的提示词：四阶段 + 六类问题，一次一问，AI 判断结束，上限 10 轮 */
export function buildSocraticMessages(
  comment: string,
  history: DiscussionTurn[],
  bookTitle: string
): ChatMessage[] {
  const historyText = history
    .map((t) => `${t.role === 'assistant' ? '你问' : '我答'}：${t.text}`)
    .join('\n');
  return [
    {
      role: 'system',
      content: `你是一位苏格拉底式的读书伙伴。用户刚读完《${bookTitle}》并写了一条笔记，你的任务是持续提问，帮用户把想法挖得更深。

每轮回答遵循「四阶段」层层递进：
1. 获取信息——先理解用户刚说的内容，必要时澄清；
2. 倾听并反馈——用自己的话复述确认理解；
3. 总结——小结目前已经明确的观点；
4. 提出开放性问题——抛出一个新的开放问题，推动思考深入。

六类问题（轮流使用、避免重复）：①澄清问题 ②检验假设 ③检视证据 ④探索多元观点 ⑤推演后果和影响 ⑥关于问题本身的追问。

规则：
- 一次只问一个问题，问题要简短、开放。
- 10 轮只是上限、不是目标：一旦用户的想法已充分展开、信息足够，就尽快结束，不必非问满 10 轮。
- 当用户明确表达想结束（例如「就聊到这」「下次再说」「不聊了」等），立即结束，不要再继续提问。
- 结束的方式统一：回复以「[[END]]」开头并附一段简短、温暖的总结；否则只回复下一个问题。最多 10 轮提问。`,
    },
    {
      role: 'user',
      content: `我的笔记：${comment}\n${historyText ? `之前的问答：\n${historyText}\n` : ''}请继续（提问，或给出结束总结）。`,
    },
  ];
}

/** 判断 AI 是否发出结束信号 */
export function isSocraticEnd(text: string): boolean {
  return text.trim().startsWith('[[END]]');
}

// ===== 停止意图识别 + 预设告别回复 =====

/** 用户表达「想结束聊天」的常见中文说法 */
const STOP_PATTERNS = [
  '就聊到这',
  '先聊到这',
  '聊到这',
  '就到这里',
  '先到这',
  '先这样',
  '下次再说',
  '下次再聊',
  '以后再聊',
  '改天再聊',
  '不聊了',
  '不说了',
  '不想聊了',
  '聊完了',
  '聊得差不多',
  '结束',
  '收工',
  '今天就到这',
  '就到这',
  '再见',
  '拜拜',
  '回见',
  '晚安',
  '就这样',
];

/** 用户表达「想结束聊天」的常见英文说法 */
const STOP_PATTERNS_EN = [
  'see you',
  'see u',
  'goodbye',
  'bye',
  'good night',
  "let's stop",
  'lets stop',
  'stop here',
  'stop now',
  'i want to stop',
  'next time',
  'talk later',
  'enough',
  "that's enough",
  'that is enough',
  'im done',
  "i'm done",
  'i am done',
  'wrap up',
];

/** 判断用户是否表达了停止/结束聊天的意愿 */
export function detectStopIntent(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return STOP_PATTERNS.some((p) => t.includes(p)) || STOP_PATTERNS_EN.some((p) => t.includes(p));
}

/** 预设告别回复 */
export const FAREWELL = {
  zh: '我们下次再聊！',
  en: 'see you next time!',
};

/** 根据用户最后一句的语言选择告别回复（含中文 → 中文；否则英文） */
export function farewellFor(text: string): string {
  return /[一-鿿]/.test(text) ? FAREWELL.zh : FAREWELL.en;
}

/** 对话结束时，让 AI 写一段简短总结（核心想法/观点） */
export function buildSocraticSummaryMessages(comment: string, history: DiscussionTurn[]): ChatMessage[] {
  const discussionText = history
    .map((t) => `${t.role === 'assistant' ? '问' : '答'}：${t.text}`)
    .join('\n');
  return [
    {
      role: 'system',
      content: '请基于用户的笔记与整个对话，写一段简短的总结（不超过 150 字），概括用户的核心想法、观点与思考变化。直接输出总结正文，不要编号、不要标题。',
    },
    {
      role: 'user',
      content: `笔记：${comment}\n\n对话：\n${discussionText}\n\n请总结。`,
    },
  ];
}

/** 苏格拉底提问：返回下一个问题，或「[[END]]」开头的结束总结 */
export async function generateSocraticQuestion(
  settings: AISettings,
  comment: string,
  history: DiscussionTurn[],
  bookTitle: string
): Promise<string> {
  return chat(settings, buildSocraticMessages(comment, history, bookTitle), 300);
}

/** 对话结束时生成总结 */
export async function generateSocraticSummary(
  settings: AISettings,
  comment: string,
  history: DiscussionTurn[]
): Promise<string> {
  return chat(settings, buildSocraticSummaryMessages(comment, history), 300);
}

// ===== 洞察报告（整理整本书） =====

/** 构建「洞察报告」提示词：综合全部笔记 + 对话总结，≤500 字 */
export function buildSynthesizeMessages(
  bookTitle: string,
  entries: { comment: string; aiKeyPoints?: string[]; aiSummary?: string }[]
): ChatMessage[] {
  const content = entries
    .map((e, i) => {
      const extra = e.aiSummary
        ? `【总结】${e.aiSummary}`
        : e.aiKeyPoints?.length
          ? `【要点】${e.aiKeyPoints.join('；')}`
          : '';
      return `第${i + 1}次记录：${e.comment}${extra ? ` ${extra}` : ''}`;
    })
    .join('\n\n');
  return [
    {
      role: 'system',
      content: '你是一位读书整理助手。请根据用户对一本书的全部笔记与思考，生成一份「洞察报告」：洞察用户整体的思路、观点、偏好的主题，以及思考的演变。结构清晰、语言自然，控制在 500 字以内。',
    },
    {
      role: 'user',
      content: `书名：《${bookTitle}》\n\n用户的所有记录：\n${content}\n\n请生成洞察报告。`,
    },
  ];
}

/** 生成整本书的洞察报告 */
export async function synthesizeBook(
  settings: AISettings,
  bookTitle: string,
  entries: { comment: string; aiKeyPoints?: string[]; aiSummary?: string }[]
): Promise<string> {
  return chat(settings, buildSynthesizeMessages(bookTitle, entries), 800);
}
