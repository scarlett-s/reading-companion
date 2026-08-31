# 阅读伴侣 · UI 设计规范

> 本文档描述当前代码库的**实际**设计系统。所有 token 以 `src/theme.ts` 为单一事实来源；本文只做说明，不重复实现细节。
> 风格方向：**minimalist（极简）+ editorial（编辑/文学感）**。

---

## 1. 设计原则

1. **少而准的颜色**：一个主色（绿）负责 CTA/进度/成功，一个强调色（蓝）只用于文字链接。不出现第三套品牌色。
2. **字体靠字重与字距说话**：全站单一无衬线家族，靠大小、粗细、italic、tracked-caps 建立层级，不混用衬线/无衬线。
3. **层次靠空白与背景，不靠边框**：卡片保留柔和暖色阴影，去掉描边外框；列表用 hairline 分割线。
4. **图标全 SF Symbols**：禁用 unicode/emoji 当图标，跨端渲染不一致。
5. **所有颜色走 token**：禁止硬编码 hex，除 `theme.ts` 与「有意保留的绿色 ramp」外。

---

## 2. 色彩系统

单一来源：`src/theme.ts` 的 `colors`。

| Token | 值 | 用途 |
|---|---|---|
| `bg` | `#F3F5F2` | 页面底色（米白，微暖偏绿） |
| `surface` | `#FFFFFF` | 卡片 / 输入框 / 弹层 |
| `surfaceMuted` | `#FAFBF8` | 次级背景（chip、气泡、AI 总结块） |
| `text` | `#1A1A1A` | 主文字（off-black，非纯黑） |
| `textMuted` | `#6B6B66` | 次级文字（暖灰） |
| `textSubtle` | `#9B9B95` | 三级文字 / placeholder / 空态图标 |
| `border` | `#E5E5DF` | 发丝分割线 / 骨架屏底色 |
| `borderStrong` | `#D4D4CD` | 更强分割 / 禁用态 |
| `primary` | `#7CB342` | **主色**：CTA 按钮、进度条、成功、AI 徽标（可用态） |
| `primaryPressed` | `#6FA13A` | 主色按压态 |
| `primaryText` | `#FFFFFF` | 主色底上的文字 |
| `primaryTint` | `#F4FAF1` | 主色极淡绿 wash（选中/关联高亮行） |
| `accent` | `#208AEF` | **强调色**：文字链接、书名字链、光标/选区色 |
| `gold` | `#F5B400` | 星级评分激活色 |
| `danger` | `#C0392B` | 错误 / 删除 |
| `warning` | `#B8860B` | 警告 |
| `backdrop` | `rgba(0,0,0,0.45)` | 菜单/弹层遮罩 |
| `overlay` | `rgba(0,0,0,0.55)` | 模态遮罩 |

**规则**
- **绿 ≠ 蓝**：绿色只做「填充」类操作（按钮、进度、选中），蓝色只做「链接」类操作。永远不要用蓝底填充按钮。
- **灰是暖灰**：全部灰调统一暖色相，不混冷灰。
- **主色饱和克制**：`#7CB342` 为去饱和叶绿，不刺眼。

---

## 3. 字体系统

单一来源：`typography` / `fontFamily`。

- **家族**：Noto Sans SC（思源黑体 SC 子集），中文/英文/中英混排统一一个家族。
- **字重**：`400 Regular` / `500 Medium` / `700 Bold`。**没有 600 SemiBold** —— 强字重用 `500 Medium`。
- **加载**：`src/app/_layout.tsx` 用 `useFonts` + `SplashScreen` 一次性加载三个字重。

### 字阶（typography tokens）

| Token | 字号 / 行高 | 字重 | 用途 |
|---|---|---|---|
| `display` | 32 / 40 | Bold，-0.5 字距 | 日历月标题、大数字 |
| `title` | 22 / 30 | Bold，-0.2 字距 | 图书详情标题、子页标题 |
| `heading` | 18 / 26 | Medium | 列表行标题、sheet 头 |
| `subheading` | 15 / 22 | Medium | 对话框标题、按钮文字 |
| `body` | 16 / 26 | Regular | 阅读正文、笔记内容（1.625 行高） |
| `bodyStrong` | 15 / 22 | Medium | 卡片内强调、书名 |
| `caption` | 13 / 19 | Regular | 日期、元信息、辅助文字 |
| `micro` | 11 / 14 | Medium | chip、徽标、微标签 |
| `label` | 11 / 14 | Bold，+1.5 字距，UPPERCASE | editorial 区块标签 |
| `emphasis` | 16 / 26 | Regular Italic | 引文强调 |

**规则**
- 大标题用**负字距**，小标签用**正字距**（tracked caps）。
- 数字（统计/进度/日期）用 `fontVariant: ['tabular-nums']` 等宽数字。
- editorial 感来自：字重大小对比、italic 引文、tracked UPPERCASE 区块标签，**不是**衬线/无衬线混排。

---

## 4. 间距（spacing）

| Token | 值 |
|---|---|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 |
| `xl` | 20 |
| `xxl` | 24 |
| `xxxl` | 32 |
| `xxxxl` | 40 |

- 页面内容左右留白 `lg`（16）起，卡片内 padding 通常 `lg+2`（18）。
- 卡片之间 `gap: lg`；区块之间用 `xxl`（24）或 `xxxl`（32）制造呼吸感。
- **宁可偏松不偏紧**：editorial 需要空白。

---

## 5. 圆角（radius）

| Token | 值 | 用途 |
|---|---|---|
| `sm` | 8 | 小元素（封面、chip 内元素） |
| `md` | 12 | 输入框、下拉、次级容器 |
| `lg` | 16 | 卡片、按钮 |
| `xl` | 20 | 大容器 |
| `pill` | 999 | 胶囊（chip、开关、AI 徽标、骨架圆形） |

- 卡片统一 `lg`；输入/下拉 `md`；chip 用 `pill`。
- 不出现 `borderRadius > 16` 的卡片（偏 SaaS 感）。

---

## 6. 阴影与层次

单一来源：`shadow`。**所有阴影暖色相 `#5A4F3A`**（不是纯黑）。

| Token | 用途 |
|---|---|
| `subtle` | 卡片、时间线条目（默认卡片层次） |
| `card` | 略强的卡片/封面投影 |
| `floating` | 浮层：FAB、抽屉、菜单、Modal |

**规则**
- 卡片 = `surface` 白底 + `shadow.subtle`，**不加边框**。
- 浮层（FAB/抽屉/菜单/Modal）= `shadow.floating`。
- 列表行之间用 `hairline`（`StyleSheet.hairlineWidth` 底边 `colors.border`）分割，不用边框。
- 例外：`library` 的「添加图书」占位卡保留 `borderStyle: 'dashed'` 虚线框，作为「添加」的可供性提示。

---

## 7. 组件规范

### 7.1 按压反馈（`Pressable.tsx`）
- 所有可点元素走封装的 `Pressable`（`forwardRef<View>`）。
- 默认：`scale 0.98` + `opacity 0.85`（按压）、`opacity 0.95`（hover）。
- FAB 用 `scale 0.94` 更弹；小图标按钮用 `hitSlop` 保证热区。

### 7.2 卡片（NoteCard / timeline card）
- 白底 + `shadow.subtle` + `radius.lg` + `padding lg+2`。
- 标题（书名）用 `accent` 蓝链；日期用 `micro` 灰。
- 正文引文（`「」` / `""` 包裹）用 italic + `textMuted`（见 7.6）。
- AI 徽标：可用态 = `primary` 绿底，已用过 = `borderStrong` 灰底，文字 `primaryText`。

### 7.3 表单输入
- 白底 + `radius.md`，**无边框**，placeholder 用 `textSubtle`。
- 光标/选区色 = `accent`。

### 7.4 区块标签（section title）
- 用 `typography.label`（11px Bold + 1.5 字距 + UPPERCASE）+ `colors.textMuted`。
- 用于「最近在读」「我的书库」「导出范围」等区块标题。

### 7.5 状态组件
| 组件 | 用途 |
|---|---|
| `Skeleton` | 异步加载占位，按内容形状（封面/标题行/卡片）呼吸脉冲（opacity 0.45→0.95，700ms loop，native driver） |
| `EmptyState` | 屏幕级空态：SF Symbol（40px，`textSubtle`）+ 标题 + 提示 |
| `FadeIn` | 骨架屏 → 真实内容切换时 240ms 淡入 |

- **屏幕级空态**用 `EmptyState`（首页、书库、图书详情的笔记/洞察）。
- **卡片级空态**（日历「本月暂无进度」、搜索「没有匹配」）保留小号 `textSubtle` 内联文字，不放大图标。
- 错误态：内联 `danger` 红字（如 `organizeError`），不用 `alert()`。

### 7.6 引文 italic（`segmentQuotes`）
- 正文里 `「…」`、`"…"` 包裹的引文渲染为 italic + `textMuted`。
- 与 `segmentTags`（`#标签` 高亮）嵌套：先切标签，再切引文。

### 7.7 图标（SF Symbols）
- 统一 `expo-symbols` 的 `SymbolView`，`type="monochrome"` + `tintColor` token。
- **禁用** unicode/emoji 当图标（`★` `✓` `🖼` `➤` `☰`）。
- 已映射：`star.fill/star`（评分）、`checkmark`（关联）、`photo`/`list.bullet`/`number`/`bold`/`italic`/`underline`/`paperplane`（工具栏）。

### 7.8 按钮
- **主操作**：`primary` 绿底 + `primaryText` 白字，圆角 `lg`/`pill`，禁用态 `borderStrong`。
- **链接式操作**（「展开」「返回」「书名」）：`accent` 蓝文字，**无底色**。
- **危险操作**：「删除」文字 `danger`。

---

## 8. 交互与动效

- **按压**：scale + opacity（见 7.1），即点即应。
- **加载**：骨架屏呼吸脉冲（非居中 spinner），native driver。
- **切换**：骨架 → 内容 240ms 淡入（`FadeIn`）。
- **弹层**：Modal 用系统 `animationType="fade"`。

---

## 9. 文案语气

- 简洁、主动、无感叹号；错误直接说「导出失败」而非「Oops」。
- 空态用一句话引导 + 一句提示，例如「还没有笔记」+「点右下角 ＋ 记录第一条读书笔记。」

---

## 10. 反模式（Don't）

- ❌ `accent` 蓝做填充按钮。
- ❌ 硬编码 hex（用 `colors.*` token）。
- ❌ unicode/emoji 当图标。
- ❌ 卡片加 `borderWidth` 外框（用阴影 + 空白分层；虚线添加卡除外）。
- ❌ 混用衬线/无衬线家族。
- ❌ 纯黑 `#000` 文字 / 纯白刺眼对比（用 off-black / 米白）。
- ❌ 冷灰与暖灰混用。

---

## 11. 有意保留的例外（绿色 ramp）

以下硬编码绿色渐变是**有意为之**的 editorial 数据色阶，不 token 化：

- `HeatMap.tsx` / `Drawer.tsx` 的 `COLORS` 渐变数组。
- `calendar.tsx` 进度条低值 `#C8E2A8` / `#3B6B2E`。
- `NoteCard.tsx` 标签 `#3B6B2E` / `#EFF3E8`。
- `AIInsightCard.tsx` 强调绿 `#EAF3E4` / `#3F6B2A`。

`diagnostics.tsx` 为开发调试屏，暂不纳入本规范约束。
