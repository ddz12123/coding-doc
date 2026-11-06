/**
 * 悬浮训练场：全局右下角悬浮按钮 + 可拖动 / 缩放的迷你演练场面板。
 * 与整页演练场（/playground）完全独立：复用同一批 static Worker 与 Monaco
 * 自托管资源，但组件实例、localStorage key、worker 实例互不干扰。
 * 本组件不在 Docusaurus Provider 树内渲染（由客户端模块挂到 body），
 * 因此主题不能走 useColorMode，改用 html[data-theme] + MutationObserver 跟随。
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import Editor, {loader} from '@monaco-editor/react';
import styles from './styles.module.css';

// Monaco 静态资源自托管在 /monaco/vs，不走默认的 jsdelivr CDN。
// 与 PlaygroundApp 的配置完全相同，重复调用是幂等的。
loader.config({paths: {vs: '/monaco/vs'}});

type Lang = 'python' | 'go';

type LangConfig = {
  lang: Lang;
  label: string;
  workerUrl: string;
  /** Pyodide 必须 module，Go 的 wasm_exec.js 必须 classic */
  workerType: 'classic' | 'module';
  /** Monaco 语言 id */
  language: string;
  /** 加载中的提示文案（体积不同，文案不同） */
  bootingText: string;
  /** 就绪后版本号前缀 */
  versionPrefix: string;
  /** 首次进入时的占位代码 */
  defaultCode: string;
};

const LANGS: LangConfig[] = [
  {
    lang: 'python',
    label: 'Python',
    workerUrl: '/pyodide-worker.js',
    workerType: 'module',
    language: 'python',
    bootingText: '⏳ 正在加载 Python 运行时（约 14MB，首次稍慢）…',
    versionPrefix: 'Python',
    defaultCode: `# 在这里自由编写 Python 代码，Ctrl + Enter 运行
print("Hello, Python!")

for i in range(3):
    print(f"第 {i + 1} 次循环")
`,
  },
  {
    lang: 'go',
    label: 'Go',
    workerUrl: '/go-worker.js',
    workerType: 'classic',
    language: 'go',
    bootingText: '⏳ 正在加载 Go 运行时（约 38MB，首次较慢，加载后有缓存）…',
    versionPrefix: 'Go',
    defaultCode: `// 在这里自由编写 Go 代码，Ctrl + Enter 运行
package main

import "fmt"

func main() {
	ch := make(chan string)
	go func() { ch <- "Hello, Go!" }()
	fmt.Println(<-ch)
}
`,
  },
];

// localStorage key 全部以 floatingPlayground 开头，与整页演练场的 playground.* 完全隔离
const STORAGE = {
  code: (lang: Lang) => `floatingPlayground.${lang}.code`,
  geometry: 'floatingPlayground.panel',
  pref: 'floatingPlayground.pref',
};

type Status = 'booting' | 'ready' | 'running' | 'crashed';

type OutputLine = {
  kind: 'stdout' | 'stderr' | 'system';
  text: string;
};

type PanelGeometry = {x: number; y: number; width: number; height: number};

type Pref = {lang: Lang; open: boolean};

// 输出保护参数：防止死循环狂打印把内存与渲染打爆（与 PlaygroundApp 同一套上限）
const MAX_OUTPUT_LINES = 1000;
const MAX_LINE_CHARS = 10000;
const FLUSH_INTERVAL = 50;
const SAVE_DEBOUNCE = 300;

const PANEL_DEFAULT = {width: 560, height: 520};
const PANEL_MIN = {width: 380, height: 320};
const PANEL_MARGIN = 24;
/** ≤996px 是 Docusaurus 导航栏折叠点，此宽度下面板走 CSS 近全屏、不可拖动 */
const MOBILE_QUERY = '(max-width: 996px)';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// 面板几何保底：不超视口、不出屏幕
function clampGeometry(g: PanelGeometry): PanelGeometry {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = clamp(g.width, PANEL_MIN.width, vw - 16);
  const height = clamp(g.height, PANEL_MIN.height, vh - 16);
  return {
    width,
    height,
    x: clamp(g.x, 8, vw - width - 8),
    y: clamp(g.y, 8, vh - height - 8),
  };
}

// 首次打开时的默认位置：右下角
function defaultGeometry(): PanelGeometry {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(PANEL_DEFAULT.width, vw - 32);
  const height = Math.min(PANEL_DEFAULT.height, vh - 32);
  return {x: vw - width - PANEL_MARGIN, y: vh - height - PANEL_MARGIN, width, height};
}

function readGeometry(): PanelGeometry | null {
  try {
    const raw = localStorage.getItem(STORAGE.geometry);
    if (raw) {
      const g = JSON.parse(raw);
      if (
        typeof g.x === 'number' &&
        typeof g.y === 'number' &&
        typeof g.width === 'number' &&
        typeof g.height === 'number'
      ) {
        return clampGeometry(g);
      }
    }
  } catch {}
  return null;
}

function readPref(): Pref {
  try {
    const raw = localStorage.getItem(STORAGE.pref);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {lang: parsed.lang === 'go' ? 'go' : 'python', open: parsed.open === true};
    }
  } catch {}
  return {lang: 'python', open: false};
}

function savePref(pref: Pref): void {
  try {
    localStorage.setItem(STORAGE.pref, JSON.stringify(pref));
  } catch {}
}

// 主题不在 Provider 内，直接监听 html[data-theme]
function useDarkMode(): boolean {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  );
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function applyGeometryTo(panel: HTMLElement, geo: PanelGeometry): void {
  panel.style.left = `${geo.x}px`;
  panel.style.top = `${geo.y}px`;
  panel.style.width = `${geo.width}px`;
  panel.style.height = `${geo.height}px`;
}

/** 单语言运行器：自持 worker / 输出 / 草稿，挂载后常驻（只做 CSS 显隐），会话内不销毁 */
function Runner({
  config,
  dark,
  visible,
}: {
  config: LangConfig;
  dark: boolean;
  visible: boolean;
}): React.JSX.Element {
  const workerRef = useRef<Worker | null>(null);
  // 编辑器内容不进 state，避免每次按键都重渲染
  const codeRef = useRef<string>(
    (() => {
      try {
        return localStorage.getItem(STORAGE.code(config.lang)) ?? config.defaultCode;
      } catch {
        return config.defaultCode;
      }
    })(),
  );
  const [status, setStatus] = useState<Status>('booting');
  const [runtimeVersion, setRuntimeVersion] = useState<string>('');
  const [output, setOutput] = useState<OutputLine[]>([]);
  const outputRef = useRef<HTMLPreElement | null>(null);
  // 输出缓冲：高频 print 先攒起来，定时批量进 state，避免每行一次重渲染
  const pendingRef = useRef<OutputLine[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const statusText: Record<Status, string> = {
    booting: config.bootingText,
    ready: '✅ 就绪',
    running: '⏳ 运行中…',
    crashed: '❌ 运行时已崩溃，请点「重启」',
  };

  const flushOutput = useCallback(() => {
    flushTimerRef.current = null;
    if (pendingRef.current.length === 0) {
      return;
    }
    const pending = pendingRef.current;
    pendingRef.current = [];
    setOutput((prev) => {
      let next = prev.concat(pending);
      // 行数封顶：只保留最近的行，防止 DOM 节点与数组无限膨胀
      if (next.length > MAX_OUTPUT_LINES) {
        next = next.slice(next.length - MAX_OUTPUT_LINES);
        next[0] = {
          kind: 'system',
          text: `…… 输出过多，仅保留最近 ${MAX_OUTPUT_LINES} 行 ……`,
        };
      }
      return next;
    });
  }, []);

  const appendOutput = useCallback(
    (kind: OutputLine['kind'], text: string) => {
      // 单条超长截断（例如一次性 print 超大字符串）
      const clipped =
        text.length > MAX_LINE_CHARS
          ? `${text.slice(0, MAX_LINE_CHARS)} ……（单条输出过长，已截断）`
          : text;
      pendingRef.current.push({kind, text: clipped});
      if (flushTimerRef.current === null) {
        flushTimerRef.current = window.setTimeout(flushOutput, FLUSH_INTERVAL);
      }
    },
    [flushOutput],
  );

  const clearOutput = useCallback(() => {
    pendingRef.current = [];
    if (flushTimerRef.current !== null) {
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    setOutput([]);
  }, []);

  const spawnWorker = useCallback(() => {
    workerRef.current?.terminate();
    setStatus('booting');
    const worker = new Worker(
      config.workerUrl,
      config.workerType === 'module' ? {type: 'module'} : undefined,
    );
    worker.onmessage = (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'ready':
          setRuntimeVersion(msg.version);
          setStatus('ready');
          break;
        case 'stdout':
          appendOutput('stdout', msg.text);
          break;
        case 'stderr':
          appendOutput('stderr', msg.text);
          break;
        case 'done':
          if (msg.repr !== null) {
            appendOutput('stdout', msg.repr);
          }
          setStatus('ready');
          break;
        case 'error':
          appendOutput('stderr', msg.message);
          setStatus('ready');
          break;
        case 'fatal':
          appendOutput('stderr', msg.message);
          setStatus('crashed');
          break;
        default:
          break;
      }
    };
    worker.onerror = () => setStatus('crashed');
    workerRef.current = worker;
  }, [appendOutput, config.workerType, config.workerUrl]);

  // Runner 挂载即启动运行时（首次展开面板 / 首次切到该语言时才挂载，FAB 待机零开销）
  useEffect(() => {
    spawnWorker();
    return () => workerRef.current?.terminate();
  }, [spawnWorker]);

  // 刷新 / 关闭页面时立即杀掉 Worker 并落盘草稿
  useEffect(() => {
    const onPageHide = () => {
      workerRef.current?.terminate();
      window.localStorage.setItem(STORAGE.code(config.lang), codeRef.current);
    };
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
        window.localStorage.setItem(STORAGE.code(config.lang), codeRef.current);
      }
    };
  }, [config.lang]);

  // 输出有新内容时自动滚到底部
  useEffect(() => {
    const el = outputRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [output]);

  const statusRef = useRef(status);
  statusRef.current = status;

  const runCode = useCallback(() => {
    if (statusRef.current !== 'ready' || !workerRef.current) {
      return;
    }
    clearOutput();
    setStatus('running');
    workerRef.current.postMessage({type: 'run', code: codeRef.current});
  }, [clearOutput]);

  // 死循环 / 卡死时的逃生通道：干掉 Worker 重开一个
  const restart = useCallback(() => {
    appendOutput('system', `—— 已重启 ${config.versionPrefix} 运行时 ——`);
    spawnWorker();
  }, [appendOutput, config.versionPrefix, spawnWorker]);

  return (
    <div className={styles.runner} style={{display: visible ? 'flex' : 'none'}}>
      <div className={styles.editorWrap}>
        <Editor
          height="100%"
          defaultLanguage={config.language}
          defaultValue={codeRef.current}
          theme={dark ? 'vs-dark' : 'light'}
          loading="编辑器加载中…"
          onChange={(value) => {
            codeRef.current = value ?? '';
            // 防抖落盘：不必每敲一个键就写一次 localStorage
            if (saveTimerRef.current !== null) {
              window.clearTimeout(saveTimerRef.current);
            }
            saveTimerRef.current = window.setTimeout(() => {
              saveTimerRef.current = null;
              window.localStorage.setItem(STORAGE.code(config.lang), codeRef.current);
            }, SAVE_DEBOUNCE);
          }}
          onMount={(editor, monaco) => {
            editor.addCommand(
              monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
              () => runCode(),
            );
          }}
          options={{
            minimap: {enabled: false},
            fontSize: 13,
            tabSize: 4,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
          }}
        />
      </div>
      <div className={styles.outputPanel}>
        <div className={styles.outputTitle}>输出</div>
        <pre className={styles.output} ref={outputRef}>
          {output.length === 0 ? (
            <span className={styles.outputPlaceholder}>
              运行代码后，输出会显示在这里
            </span>
          ) : (
            output.map((line, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={i} className={styles[line.kind]}>
                {line.text}
                {'\n'}
              </span>
            ))
          )}
        </pre>
      </div>
      <div className={styles.footer}>
        <button
          type="button"
          className="button button--primary button--sm"
          disabled={status !== 'ready'}
          onClick={runCode}>
          ▶ 运行
        </button>
        <button
          type="button"
          className="button button--secondary button--sm"
          onClick={clearOutput}>
          清空输出
        </button>
        <button
          type="button"
          className="button button--secondary button--sm"
          onClick={restart}>
          重启
        </button>
        <span className={styles.status} data-status={status}>
          {statusText[status]}
          {status === 'ready' && runtimeVersion
            ? `（${config.versionPrefix} ${runtimeVersion}）`
            : ''}
        </span>
      </div>
    </div>
  );
}

export default function FloatingPlayground(): React.JSX.Element {
  const dark = useDarkMode();
  // 首次挂载时读回上次的语言与展开状态；几何在打开瞬间再读，避免布局抖动
  const [open, setOpen] = useState<boolean>(() => readPref().open);
  const [lang, setLang] = useState<Lang>(() => readPref().lang);
  // Runner 懒挂载：只有被激活过的语言才创建 worker，挂载后常驻
  const [mounted, setMounted] = useState<Record<Lang, boolean>>({
    python: false,
    go: false,
  });
  const panelRef = useRef<HTMLDivElement | null>(null);
  const savedGeometryRef = useRef<PanelGeometry | null>(null);

  // 打开 / 切换语言时：挂载对应 Runner、恢复面板几何、记忆偏好
  useEffect(() => {
    if (open) {
      if (savedGeometryRef.current === null) {
        savedGeometryRef.current =
          readGeometry() ?? defaultGeometry();
      }
      if (panelRef.current) {
        applyGeometryTo(panelRef.current, savedGeometryRef.current);
      }
      setMounted((prev) => (prev[lang] ? prev : {...prev, [lang]: true}));
    }
    savePref({lang, open});
  }, [open, lang]);

  // 拖动：直接操作面板 DOM style，不走 state，避免拖动过程中重渲染 Monaco
  const startDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // 点在按钮 / Tab 上不是拖动
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (window.matchMedia(MOBILE_QUERY).matches) {
      return; // 移动端面板固定近全屏，不可拖动
    }
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    const rect = panel.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    e.preventDefault();
    const onMove = (ev: PointerEvent) => {
      const geo = clampGeometry({
        x: ev.clientX - offsetX,
        y: ev.clientY - offsetY,
        width: rect.width,
        height: rect.height,
      });
      panel.style.left = `${geo.x}px`;
      panel.style.top = `${geo.y}px`;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const after = clampGeometry({
        x: panel.getBoundingClientRect().left,
        y: panel.getBoundingClientRect().top,
        width: rect.width,
        height: rect.height,
      });
      applyGeometryTo(panel, after);
      savedGeometryRef.current = after;
      try {
        localStorage.setItem(STORAGE.geometry, JSON.stringify(after));
      } catch {}
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  // 缩放：右下角手柄，同拖动一样直改 DOM style
  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (window.matchMedia(MOBILE_QUERY).matches) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    const rect = panel.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const onMove = (ev: PointerEvent) => {
      const geo = clampGeometry({
        x: rect.left,
        y: rect.top,
        width: rect.width + (ev.clientX - startX),
        height: rect.height + (ev.clientY - startY),
      });
      panel.style.width = `${geo.width}px`;
      panel.style.height = `${geo.height}px`;
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const after = clampGeometry({
        x: rect.left,
        y: rect.top,
        width: panel.getBoundingClientRect().width,
        height: panel.getBoundingClientRect().height,
      });
      applyGeometryTo(panel, after);
      savedGeometryRef.current = after;
      try {
        localStorage.setItem(STORAGE.geometry, JSON.stringify(after));
      } catch {}
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, []);

  return (
    <>
      {!open && (
        <button
          type="button"
          className={styles.fab}
          aria-label="打开悬浮训练场"
          title="悬浮训练场"
          onClick={() => setOpen(true)}>
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true">
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
        </button>
      )}
      <div
        ref={panelRef}
        className={styles.panel}
        style={{display: open ? 'flex' : 'none'}}
        role="dialog"
        aria-label="悬浮训练场">
        <div className={styles.header} onPointerDown={startDrag}>
          <span className={styles.title}>悬浮训练场</span>
          <div className={styles.tabs}>
            {LANGS.map((config) => (
              <button
                key={config.lang}
                type="button"
                className={clsx(styles.tab, lang === config.lang && styles.tabActive)}
                onClick={() => setLang(config.lang)}>
                {config.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.collapseBtn}
            aria-label="收起面板"
            title="收起"
            onClick={() => setOpen(false)}>
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
        <div className={styles.body}>
          {LANGS.map(
            (config) =>
              mounted[config.lang] && (
                <Runner
                  key={config.lang}
                  config={config}
                  dark={dark}
                  visible={lang === config.lang}
                />
              ),
          )}
        </div>
        <div className={styles.resizeHandle} onPointerDown={startResize} />
      </div>
    </>
  );
}
