/**
 * Go 演练场的运行器（classic Web Worker）。
 * 加载 Go 官方胶水脚本 + Yaegi 解释器 WASM（tools/go-playground 编译产出），
 * 执行用户 Go 代码。所有资源走自托管 /go-wasm/，不依赖外部 CDN。
 * 注意：wasm_exec.js 是传统脚本，这里必须用 classic worker（和 Pyodide 相反）。
 */
/* global Go */
importScripts('/go-wasm/wasm_exec.js');

// main.wasm 里的 Go 代码通过这三个全局回调与页面通信
self.__goOutput = (kind, text) => postMessage({type: kind, text});
self.__goDone = (errMsg) => {
  if (errMsg) {
    postMessage({type: 'error', message: errMsg});
  } else {
    postMessage({type: 'done', repr: null});
  }
};
self.__goReady = (version) => postMessage({type: 'ready', version});

const go = new Go();
(async () => {
  try {
    // EdgeOne Pages 限制单文件 25MiB，main.wasm（约 38MB）以 gzip 形式托管（约 8MB），
    // 下载后用浏览器原生 DecompressionStream 解压
    const resp = await fetch('/go-wasm/main.wasm.gz');
    if (!resp.ok) {
      throw new Error(`下载 main.wasm.gz 失败：HTTP ${resp.status}`);
    }
    let buf = await resp.arrayBuffer();
    // 若服务器按 Content-Encoding: gzip 返回并被浏览器自动解压，拿到的已是原始 wasm（魔数 \0asm）
    const m = new Uint8Array(buf, 0, 4);
    const isRawWasm = m[0] === 0x00 && m[1] === 0x61 && m[2] === 0x73 && m[3] === 0x6d;
    if (!isRawWasm) {
      const stream = new Response(buf).body.pipeThrough(new DecompressionStream('gzip'));
      buf = await new Response(stream).arrayBuffer();
    }
    const result = await WebAssembly.instantiate(buf, go.importObject);
    // go.run 会一直阻塞（main.go 里 select{} 保活），不能 await
    go.run(result.instance);
  } catch (error) {
    postMessage({type: 'fatal', message: String(error)});
  }
})();

self.onmessage = (event) => {
  const {type, code} = event.data;
  if (type !== 'run') {
    return;
  }
  try {
    self.runGoCode(code);
  } catch (error) {
    postMessage({type: 'error', message: String(error)});
  }
};
