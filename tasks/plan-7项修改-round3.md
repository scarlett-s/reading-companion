# Round 3：参考 ref-landingpage / ref-editcard / ref-dashboard 重新设计

> 用户反馈的 9 项 UI 调整。详见 plan 文件 `~/.claude/plans/fancy-giggling-clarke.md`。
> 不覆盖已有 plan/tasks 文件，只在 `tasks/plan-7项修改.md` 与 `tasks/todo.md` 末尾追加。

## 用户决策
- 菜单**不加「复制」**。
- AI 对话键盘：最初计划用 `react-native-keyboard-controller`，但该库是 native module，需 `expo prebuild` 才能在 iOS 加载，会导致 Expo Go 打不开。**最终改用内置 `KeyboardAvoidingView` + `Keyboard.addListener`**（不引 native 依赖）。
- 豆瓣详情失败时**部分字段也填**。

## 实现要点
- **T30 首页样式**：`NoteCard` 圆角 16，间距 16；正文 4 行 + 「展开」蓝色文字。
- **T31 NoteMenu**：白卡菜单 + 遮罩；三项（AI 对话 / 编辑 / 删除）；底部字数+最后编辑。
- **T32 AI 小标记**：`entryHasAI` 纯函数；右下角胶囊（绿/灰）。
- **T33 豆瓣补全**：`fetchDoubanDetail` HTML 解析 + in-memory cache；`BookSearchResult` 加 `translator`；`Book` 加 `translator`。
- **T34 查看对话弹窗**：蓝色文字 + `Modal` 弹窗。
- **T35 chat 键盘**：`KeyboardProvider` + `KeyboardStickyView` 包裹 footer。
- **T36 note/new 按钮位置**：「与 AI 对话」屏幕右下角；「提交」用 `InputAccessoryView` 放键盘内（iOS），Android 保留底部。
- **T37 Drawer 重设计**：宽 320、品牌头、行高 56、选中态绿条。
- **T38 测试**：utils 加 `entryHasAI`；douban 加 `fetchDoubanDetail` 测试。

## 验收
- `npx tsc --noEmit` + `npm test` 通过；`expo prebuild --clean` 后 iOS 跑通。