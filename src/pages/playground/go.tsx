import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

const DEFAULT_CODE = `// 在这里自由编写 Go 代码，Ctrl + Enter 运行
package main

import "fmt"

func main() {
	ch := make(chan string)
	go func() { ch <- "Hello, Go!" }()
	fmt.Println(<-ch)
}
`;

export default function GoPlayground(): React.JSX.Element {
  return (
    <Layout
      title="Go 演练场"
      description="在浏览器里自由编写并运行 Go 代码，支持 goroutine、channel 与完整标准库，无需安装任何环境">
      <main className="container margin-vert--lg">
        <h1>Go 演练场</h1>
        <p style={{color: 'var(--ifm-color-emphasis-600)'}}>
          Go 解释器（Yaegi）编译成 WASM 在你的浏览器里运行，支持
          goroutine、channel、泛型和绝大部分标准库；不支持 go
          get 第三方包、网络和文件系统。代码自动保存在本地，刷新不丢。
          死循环卡住了就点「重启」。
        </p>
        <BrowserOnly fallback={<div>编辑器加载中…</div>}>
          {() => {
            // Monaco 和 Web Worker 只能在浏览器端加载，SSR 阶段跳过
            const PlaygroundApp =
              require('@site/src/components/PlaygroundApp').default;
            return (
              <PlaygroundApp
                workerUrl="/go-worker.js"
                workerType="classic"
                language="go"
                storageKey="playground.go.code"
                defaultCode={DEFAULT_CODE}
                bootingText="⏳ 正在加载 Go 运行时（约 38MB，首次较慢，加载后有缓存）…"
                versionPrefix="Go"
              />
            );
          }}
        </BrowserOnly>
      </main>
    </Layout>
  );
}
