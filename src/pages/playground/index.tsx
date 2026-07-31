import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

const DEFAULT_CODE = `# 在这里自由编写 Python 代码，Ctrl + Enter 运行
print("Hello, Python!")

for i in range(3):
    print(f"第 {i + 1} 次循环")
`;

export default function PythonPlayground(): React.JSX.Element {
  return (
    <Layout
      title="Python 演练场"
      description="在浏览器里自由编写并运行 Python 代码，完整 CPython 标准库，无需安装任何环境">
      <main className="container margin-vert--lg">
        <h1>Python 演练场</h1>
        <p style={{color: 'var(--ifm-color-emphasis-600)'}}>
          真正的 CPython 在你的浏览器里运行（Pyodide），完整标准库可用，
          代码自动保存在本地，刷新不丢。死循环卡住了就点「重启」。
        </p>
        <BrowserOnly fallback={<div>编辑器加载中…</div>}>
          {() => {
            // Monaco 和 Web Worker 只能在浏览器端加载，SSR 阶段跳过
            const PlaygroundApp =
              require('@site/src/components/PlaygroundApp').default;
            return (
              <PlaygroundApp
                workerUrl="/pyodide-worker.js"
                workerType="module"
                language="python"
                storageKey="playground.python.code"
                defaultCode={DEFAULT_CODE}
                bootingText="⏳ 正在加载 Python 运行时（约 14MB，首次稍慢）…"
                versionPrefix="Python"
              />
            );
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
