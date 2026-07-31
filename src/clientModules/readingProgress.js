/**
 * 阅读进度条：文档页顶部随滚动前进的细条，短页面自动隐藏。
 */
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

const BAR_ID = 'reading-progress-bar';

function getBar() {
  let bar = document.getElementById(BAR_ID);
  if (!bar) {
    bar = document.createElement('div');
    bar.id = BAR_ID;
    document.body.appendChild(bar);
  }
  return bar;
}

function update() {
  const el = document.documentElement;
  const max = el.scrollHeight - el.clientHeight;
  const bar = getBar();
  // 内容不足一屏半的短页面不显示进度
  if (max < el.clientHeight * 0.5) {
    bar.style.opacity = '0';
    return;
  }
  bar.style.opacity = '1';
  bar.style.width = `${(el.scrollTop / max) * 100}%`;
}

if (ExecutionEnvironment.canUseDOM) {
  window.addEventListener('scroll', update, {passive: true});
  window.addEventListener('resize', update, {passive: true});
}

export function onRouteDidUpdate({location}) {
  // 只在教程文档页显示
  getBar().style.display = location.pathname.startsWith('/docs/') ? 'block' : 'none';
  update();
}
