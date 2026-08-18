import { AISettings, DiscussionTurn } from './types';
import { parseKeyPoints } from './utils';

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

// ===== 提示词构建（纯函数，可单测） =====

export function buildQuestionMessages(
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
      content: `你是一位细心的读书伙伴。用户刚读完《${bookTitle}》并写了一条评论。请基于评论提出一个开放式问题，帮助用户深入思考。问题要简短（不超过 40 字），一次只问一个。`,
    },
    {
      role: 'user',
      content: `我的评论：${comment}\n${historyText ? `之前的问答：\n${historyText}\n` : ''}请提出下一个问题。`,
    },
  ];
}

export function buildExtractMessages(comment: string, discussion: DiscussionTurn[]): ChatMessage[] {
  const discussionText = discussion
    .map((t) => `${t.role === 'assistant' ? '问' : '答'}：${t.text}`)
    .join('\n');
  return [
    {
      role: 'system',
      content: '请从用户的读书评论和后续讨论中提炼出 2-4 条关键观点/思考。每条简短（不超过 30 字），逐行输出，不要编号。',
    },
    {
      role: 'user',
      content: `评论：${comment}\n\n讨论：\n${discussionText}\n\n请提炼关键信息。`,
    },
  ];
}

export function buildSynthesizeMessages(
  bookTitle: string,
  entries: { comment: string; aiKeyPoints?: string[] }[]
): ChatMessage[] {
  const content = entries
    .map(
      (e, i) =>
        `第${i + 1}次记录：${e.comment}${e.aiKeyPoints?.length ? '（要点：' + e.aiKeyPoints.join('；') + '）' : ''}`
    )
    .join('\n\n');
  return [
    {
      role: 'system',
      content: '你是一位读书整理助手。请根据用户对一本书的历次评论和讨论要点，整理出用户对这本书的整体思考和观点。结构清晰：分几个主题，每个主题下有简要阐述。语言自然，不要过度堆砌。',
    },
    {
      role: 'user',
      content: `书名：《${bookTitle}》\n\n用户的所有记录：\n${content}\n\n请整理用户对这本书的思考和观点。`,
    },
  ];
}

// ===== 对外接口 =====

/** discuss 模式：基于评论 + 历史生成一个追问 */
export async function generateQuestion(
  settings: AISettings,
  comment: string,
  history: DiscussionTurn[],
  bookTitle: string
): Promise<string> {
  return chat(settings, buildQuestionMessages(comment, history, bookTitle), 100);
}

/** 从评论 + 讨论中提炼关键信息（列表） */
export async function extractKeyPoints(
  settings: AISettings,
  comment: string,
  discussion: DiscussionTurn[]
): Promise<string[]> {
  const text = await chat(settings, buildExtractMessages(comment, discussion), 300);
  return parseKeyPoints(text);
}

/** 整理整本书的思考与观点 */
export async function synthesizeBook(
  settings: AISettings,
  bookTitle: string,
  entries: { comment: string; aiKeyPoints?: string[] }[]
): Promise<string> {
  return chat(settings, buildSynthesizeMessages(bookTitle, entries), 1500);
}
