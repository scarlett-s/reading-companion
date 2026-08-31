// 单例：让 (drawer) 布局内的页面（如 /calendar）触发打开侧边栏。
// drawer 布局在挂载时 registerOpenDrawer(() => setOpen(true))，
// 任何子页面可以 import openDrawer 并调用。

let openFn: (() => void) | null = null;

export function registerOpenDrawer(fn: () => void): void {
  openFn = fn;
}

export function openDrawer(): void {
  openFn?.();
}
