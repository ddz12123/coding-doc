/**
 * 演练场通用核心组件（仅浏览器端渲染）。
 * Monaco 编辑器 + Web Worker 运行器，语言无关：
 * Python(Pyodide) / Go(Yaegi WASM) 通过 props 传入各自的 worker 与配置。
 * Worker 消息协议：ready(version) / stdout / stderr / done / error / fatal。
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import Editor, {loader} from '@monaco-editor/react';
import {useColorMode} from '@docusaurus/theme-common';
import styles from './styles.module.css';

// Monaco 静态资源自托管在 /monaco/vs，不走默认的 jsdelivr CDN
loader.config({paths: {vs: '/monaco/vs'}});

export type PlaygroundProps = {
  /** Worker 脚本地址，如 /pyodide-worker.js */
  workerUrl: string;
  /** Pyodide 必须 module，Go 的 wasm_exec.js 必须 classic */
  workerType: 'classic' | 'module';
  /** Monaco 语言 id，如 python / go */
  language: string;
  /** localStorage 持久化 key，两个演练场必须不同 */
  storageKey: string;
  /** 首次进入时的占位代码 */
  defaultCode: string;
  /** 加载中的提示文案（体积不同，文案不同） */
  bootingText: string;
  /** 就绪后版本号前缀，如 Python / Go */
  versionPrefix: string;
};

type Status = 'booting' | 'ready' | 'running' | 'crashed';

type OutputLine = {
  kind: 'stdout' | 'stderr' | 'system';
  text: string;
};

// 输出保护参数：防止死循环狂打印把页面内存与渲染打爆
const MAX_OUTPUT_LINES = 1000;
const MAX_LINE_CHARS = 10000;
const FLUSH_INTERVAL = 50;
const SAVE_DEBOUNCE = 300;

export default function PlaygroundApp(props: PlaygroundProps): React.JSX.Element {
  const {workerUrl, workerType, language, storageKey, defaultCode, bootingText, versionPrefix} =
    props;
  const {colorMode} = useColorMode();
  const workerRef = useRef<Worker | null>(null);
  // 编辑器内容不进 state，避免每次按键都重渲染
  const codeRef = useRef<string>(
    window.localStorage.getItem(storageKey) ?? defaultCode,
  );
  const [status, setStatus] = useState<Status>('booting');
  const [runtimeVersion, setRuntimeVersion] = useState<string>('');
  const [output, setOutput] = useState<OutputLine[]>([]);
  const outputRef = useRef<HTMLPreElement | null>(null);
  // 输出缓冲：高频 print 时先攒起来，定时批量进 state，避免每行一次重渲染
  const pendingRef = useRef<OutputLine[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const statusText: Record<Status, string> = {
    booting: bootingText,
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
    (line: OutputLine) => {
      // 单条超长截断（例如一次性 print 超大字符串）
      const text =
        line.text.length > MAX_LINE_CHARS
          ? `${line.text.slice(0, MAX_LINE_CHARS)} ……（单条输出过长，已截断）`
          : line.text;
      pendingRef.current.push({kind: line.kind, text});
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
      workerUrl,
      workerType === 'module' ? {type: 'module'} : undefined,
    );
    worker.onmessage = (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'ready':
          setRuntimeVersion(msg.version);
          setStatus('ready');
          break;
        case 'stdout':
          appendOutput({kind: 'stdout', text: msg.text});
          break;
        case 'stderr':
          appendOutput({kind: 'stderr', text: msg.text});
          break;
        case 'done':
          if (msg.repr !== null) {
            appendOutput({kind: 'stdout', text: msg.repr});
          }
          setStatus('ready');
          break;
        case 'error':
          appendOutput({kind: 'stderr', text: msg.message});
          setStatus('ready');
          break;
        case 'fatal':
          appendOutput({kind: 'stderr', text: msg.message});
          setStatus('crashed');
          break;
        default:
          break;
      }
    };
    worker.onerror = () => setStatus('crashed');
    workerRef.current = worker;
  }, [appendOutput, workerUrl, workerType]);

  useEffect(() => {
    spawnWorker();
    return () => workerRef.current?.terminate();
  }, [spawnWorker]);

  // 刷新/关闭页面时立即杀掉 Worker 并落盘代码：
  // 刷新时 React 的清理函数不会执行，不显式 terminate 的话，
  // 旧页面的 WASM 实例要等浏览器慢慢 GC，连续刷新会看到内存不断叠加
  useEffect(() => {
    const onPageHide = () => {
      workerRef.current?.terminate();
      window.localStorage.setItem(storageKey, codeRef.current);
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
        window.localStorage.setItem(storageKey, codeRef.current);
      }
    };
  }, [storageKey]);

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
    appendOutput({kind: 'system', text: `—— 已重启 ${versionPrefix} 运行时 ——`});
    spawnWorker();
  }, [appendOutput, spawnWorker, versionPrefix]);

  return (
    <div className={styles.playground}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className="button button--primary"
          disabled={status !== 'ready'}
          onClick={runCode}>
          ▶ 运行（Ctrl + Enter）
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={clearOutput}>
          清空输出
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={restart}>
          重启
        </button>
        <span className={styles.status} data-status={status}>
          {statusText[status]}
          {status === 'ready' && runtimeVersion
            ? `（${versionPrefix} ${runtimeVersion}）`
            : ''}
        </span>
      </div>
      <div className={styles.editorWrap}>
        <Editor
          height="52vh"
          defaultLanguage={language}
          defaultValue={codeRef.current}
          theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
          loading="编辑器加载中…"
          onChange={(value) => {
            codeRef.current = value ?? '';
            // 防抖落盘：不必每敲一个键就写一次 localStorage
            if (saveTimerRef.current !== null) {
              window.clearTimeout(saveTimerRef.current);
            }
            saveTimerRef.current = window.setTimeout(() => {
              saveTimerRef.current = null;
              window.localStorage.setItem(storageKey, codeRef.current);
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
            fontSize: 14,
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
    </div>
  );
}
