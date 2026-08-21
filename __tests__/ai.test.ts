import { describe, it, expect } from '@jest/globals';
import {
  buildSynthesizeMessages,
  buildSocraticMessages,
  buildSocraticSummaryMessages,
  isSocraticEnd,
  detectStopIntent,
  farewellFor,
} from '../src/ai';

describe('buildSynthesizeMessages（洞察报告）', () => {
  it('含书名 + 要点/总结 + 字数限制', () => {
    const msgs = buildSynthesizeMessages('三体', [
      { comment: '第一', aiKeyPoints: ['a', 'b'] },
      { comment: '第二', aiSummary: '总结二' },
    ]);
    expect(msgs[1].content).toContain('三体');
    expect(msgs[1].content).toContain('第1次记录：第一 【要点】a；b');
    expect(msgs[1].content).toContain('第2次记录：第二 【总结】总结二');
    expect(msgs[0].content).toContain('洞察报告');
    expect(msgs[0].content).toContain('500 字');
  });
});

describe('buildSocraticMessages', () => {
  it('系统提示含四阶段 + 六类 + 一次一问 + 上限 10 轮 + 结束信号', () => {
    const msgs = buildSocraticMessages('评论', [], '书');
    const sys = msgs[0].content;
    expect(sys).toContain('四阶段');
    expect(sys).toContain('获取信息');
    expect(sys).toContain('倾听并反馈');
    expect(sys).toContain('总结');
    expect(sys).toContain('开放性问题');
    expect(sys).toContain('澄清问题');
    expect(sys).toContain('检验假设');
    expect(sys).toContain('检视证据');
    expect(sys).toContain('探索多元观点');
    expect(sys).toContain('推演后果和影响');
    expect(sys).toContain('关于问题本身的追问');
    expect(sys).toContain('一次只问一个问题');
    expect(sys).toContain('10 轮');
    expect(sys).toContain('[[END]]');
  });

  it('user 消息含笔记与历史', () => {
    const history = [{ role: 'assistant' as const, text: '为什么？' }];
    const msgs = buildSocraticMessages('我的评论', history, '书');
    expect(msgs[1].content).toContain('我的评论');
    expect(msgs[1].content).toContain('你问：为什么？');
  });
});

describe('isSocraticEnd', () => {
  it('识别结束信号（含前导空白）', () => {
    expect(isSocraticEnd('[[END]]总结...')).toBe(true);
    expect(isSocraticEnd('   [[END]]...')).toBe(true);
    expect(isSocraticEnd('下一个问题...')).toBe(false);
  });
});

describe('buildSocraticSummaryMessages', () => {
  it('要求简短总结 + 含笔记与对话', () => {
    const msgs = buildSocraticSummaryMessages('评论', [{ role: 'user' as const, text: '答' }]);
    expect(msgs[0].content).toContain('总结');
    expect(msgs[1].content).toContain('评论');
    expect(msgs[1].content).toContain('答：答');
  });
});

describe('buildSocraticMessages 停止发问约束', () => {
  it('强调 10 轮是上限不是目标、用户想结束即收尾', () => {
    const sys = buildSocraticMessages('评论', [], '书')[0].content;
    expect(sys).toContain('上限');
    expect(sys).toContain('不是目标');
    expect(sys).toContain('就聊到这');
    expect(sys).toContain('下次再说');
  });
});

describe('detectStopIntent', () => {
  it('命中中文停止意图', () => {
    expect(detectStopIntent('就聊到这吧')).toBe(true);
    expect(detectStopIntent('下次再说')).toBe(true);
    expect(detectStopIntent('不聊了')).toBe(true);
    expect(detectStopIntent('再见')).toBe(true);
    expect(detectStopIntent('就这样')).toBe(true);
  });

  it('命中英文停止意图', () => {
    expect(detectStopIntent('see you next time')).toBe(true);
    expect(detectStopIntent('bye')).toBe(true);
    expect(detectStopIntent("let's stop here")).toBe(true);
  });

  it('普通回答不命中', () => {
    expect(detectStopIntent('这本书让我想到很多')).toBe(false);
    expect(detectStopIntent('我觉得作者想表达……')).toBe(false);
    expect(detectStopIntent('')).toBe(false);
  });
});

describe('farewellFor', () => {
  it('含中文 → 中文告别', () => {
    expect(farewellFor('就聊到这')).toBe('我们下次再聊！');
  });
  it('纯英文 → 英文告别', () => {
    expect(farewellFor('see you')).toBe('see you next time!');
  });
});
