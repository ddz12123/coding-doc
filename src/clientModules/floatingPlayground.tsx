/**
 * 悬浮训练场客户端模块：把全局悬浮面板挂到 body 上，
 * 独立于 Docusaurus 应用树（不参与路由、不做按路径显隐）。
 * 模式与 readingProgress.js 一致：ExecutionEnvironment 守卫，仅浏览器端执行。
 */
import React from 'react';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import {createRoot} from 'react-dom/client';
import FloatingPlayground from '@site/src/components/FloatingPlayground';

const CONTAINER_ID = 'floating-playground-root';

function mount() {
  if (document.getElementById(CONTAINER_ID)) {
    return;
  }
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  document.body.appendChild(container);
  createRoot(container).render(<FloatingPlayground />);
}

if (ExecutionEnvironment.canUseDOM) {
  // client module 执行时机早于 DOM 就绪的情况兜底
  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', mount, {once: true});
  } else {
    mount();
  }
}
