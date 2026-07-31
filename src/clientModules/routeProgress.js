/**
 * 页面切换进度条：路由跳转超过 200ms 才显示，避免快速切换时闪烁。
 * 实现方式来自 Docusaurus 官方 clientModules 示例。
 */
import nprogress from 'nprogress';
import 'nprogress/nprogress.css';

nprogress.configure({showSpinner: false});

const DELAY = 200;

export function onRouteUpdate({location, previousLocation}) {
  // previousLocation 为 null 说明是首次加载/刷新，此时没有路由切换，不显示进度条
  if (previousLocation && location.pathname !== previousLocation.pathname) {
    const timeout = window.setTimeout(() => nprogress.start(), DELAY);
    return () => window.clearTimeout(timeout);
  }
  return undefined;
}

export function onRouteDidUpdate({location, previousLocation}) {
  if (previousLocation && location.pathname !== previousLocation.pathname) {
    nprogress.done();
  }
}
