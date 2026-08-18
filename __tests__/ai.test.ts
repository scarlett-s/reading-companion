import { describe, it, expect } from '@jest/globals';
import { buildQuestionMessages, buildExtractMessages, buildSynthesizeMessages } from '../src/ai';

describe('buildQuestionMessages', () => {
  it('包含评论与书名，系统提示要求一次只问一个', () => {
    const msgs = buildQuestionMessages('今天读得很好', [], '三体');
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('三体');
    expect(msgs[1].content).toContain('今天读得很好');
  });

  it('有历史时带上之前的问答', () => {
    const history = [{ role: 'assistant' as const, text: '你喜欢主角吗？' }];
    const msgs = buildQuestionMessages('评论', history, '书');
    expect(msgs[1].content).toContain('你问：你喜欢主角吗？');
  });
});

describe('buildExtractMessages', () => {
  it('包含评论与讨论', () => {
    const msgs = buildExtractMessages('评论', [{ role: 'user' as const, text: '回答' }]);
    expect(msgs[1].content).toContain('评论');
    expect(msgs[1].content).toContain('答：回答');
  });
});

describe('buildSynthesizeMessages', () => {
  it('包含书名与历次记录（含要点）', () => {
    const msgs = buildSynthesizeMessages('三体', [
      { comment: '第一', aiKeyPoints: ['a', 'b'] },
      { comment: '第二' },
    ]);
    expect(msgs[1].content).toContain('三体');
    expect(msgs[1].content).toContain('第1次记录：第一（要点：a；b）');
    expect(msgs[1].content).toContain('第2次记录：第二');
  });
});
