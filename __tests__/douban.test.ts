import { describe, it, expect } from '@jest/globals';
import { mapDoubanResult, parseDoubanDetailHtml, fetchDoubanDetail } from '../src/douban';

describe('mapDoubanResult', () => {
  it('映射豆瓣字段 + 封面 /s/ → /l/', () => {
    const r = mapDoubanResult({
      id: '4913064',
      title: '活着',
      author_name: '余华',
      pic: 'https://img9.doubanio.com/view/subject/s/public/s29869926.jpg',
      year: '2012',
    });
    expect(r.key).toBe('4913064');
    expect(r.title).toBe('活着');
    expect(r.author).toBe('余华');
    expect(r.publishYear).toBe(2012);
    expect(r.coverUrl).toBe('https://img9.doubanio.com/view/subject/l/public/s29869926.jpg');
  });

  it('缺 year / pic 时不报错', () => {
    const r = mapDoubanResult({ title: '某书' });
    expect(r.title).toBe('某书');
    expect(r.publishYear).toBeUndefined();
    expect(r.coverUrl).toBeUndefined();
  });
});

describe('parseDoubanDetailHtml', () => {
  it('解析出版社/页数/出版年（中文书无译者）', () => {
    const html = `
      <div id="info">
        <span class="pl"> 作者</span>: <a>余华</a><br/>
        <span class="pl">出版社:</span> <a>作家出版社</a><br/>
        <span class="pl">出版年:</span> 2012-8<br/>
        <span class="pl">ISBN:</span> 9787506365437<br/>
        <span class="pl">页数:</span> 191<br/>
        <span class="pl">装帧:</span> 平装<br/>
        <span class="pl">定价:</span> 28.00元<br/>
      </div>
    `;
    expect(parseDoubanDetailHtml(html)).toEqual({
      publisher: '作家出版社',
      pageCount: 191,
      publishYear: 2012,
    });
  });

  it('解析译者字段', () => {
    const html = `
      <div id="info">
        <span class="pl"> 作者</span>: <a>[法]圣埃克苏佩里</a><br/>
        <span class="pl"> 译者</span>: <a>胡雨苏</a><br/>
        <span class="pl">出版社:</span> 中国友谊出版公司<br/>
        <span class="pl">出版年:</span> 2000-9<br/>
        <span class="pl">页数:</span> 111<br/>
      </div>
    `;
    const r = parseDoubanDetailHtml(html);
    expect(r.translator).toBe('胡雨苏');
    expect(r.pageCount).toBe(111);
    expect(r.publishYear).toBe(2000);
  });

  it('缺 #info 时返回空对象', () => {
    expect(parseDoubanDetailHtml('<html></html>')).toEqual({});
  });
});

describe('fetchDoubanDetail', () => {
  const base = mapDoubanResult({ id: '4913064', title: '活着', author_name: '余华', pic: '', year: '2012' });

  it('请求失败时返回 base', async () => {
    const realFetch = global.fetch;
    global.fetch = (async () => new Response('nope', { status: 500 })) as typeof fetch;
    try {
      const r = await fetchDoubanDetail('4913064', base);
      expect(r).toEqual(base);
    } finally {
      global.fetch = realFetch;
    }
  });

  it('请求成功时合并字段（缺啥补啥）', async () => {
    const html = `<div id="info"><span class="pl">出版社:</span> 作家出版社<br/><span class="pl">页数:</span> 191<br/><span class="pl">出版年:</span> 2012-8<br/></div>`;
    const realFetch = global.fetch;
    global.fetch = (async () => new Response(html, { status: 200 })) as typeof fetch;
    try {
      const r = await fetchDoubanDetail('4913064', base);
      expect(r.publisher).toBe('作家出版社');
      expect(r.pageCount).toBe(191);
      expect(r.publishYear).toBe(2012);
    } finally {
      global.fetch = realFetch;
    }
  });
});
