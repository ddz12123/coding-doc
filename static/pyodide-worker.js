/**
 * Python 演练场的 Pyodide 运行器（ES Module Web Worker）。
 * 在独立线程里加载 CPython(WASM) 并执行用户代码，避免阻塞页面 UI。
 * 注意：新版 Pyodide 不支持 classic worker，必须用 {type: 'module'} 创建。
 * 所有资源走自托管 /pyodide/，不依赖外部 CDN。
 */
import {loadPyodide} from '/pyodide/pyodide.mjs';

const pyodideReadyPromise = (async () => {
  const pyodide = await loadPyodide({indexURL: '/pyodide/'});
  // print / 异常输出实时转发给页面
  pyodide.setStdout({batched: (text) => postMessage({type: 'stdout', text})});
  pyodide.setStderr({batched: (text) => postMessage({type: 'stderr', text})});
  return pyodide;
})();

pyodideReadyPromise
  .then((pyodide) =>
    postMessage({
      type: 'ready',
      // 取真实的 Python 解释器版本（pyodide.version 是 Pyodide 发行版号，不是 Python 版本）
      version: pyodide.runPython(
        "import sys; '.'.join(map(str, sys.version_info[:3]))",
      ),
    }),
  )
  .catch((error) => postMessage({type: 'fatal', message: String(error)}));

self.onmessage = async (event) => {
  const {type, code} = event.data;
  if (type !== 'run') {
    return;
  }
  const pyodide = await pyodideReadyPromise;
  try {
    // 代码里 import micropip 时自动从 /pyodide/ 加载 micropip 轮子
    await pyodide.loadPackagesFromImports(code);
    const result = await pyodide.runPythonAsync(code);
    let repr = null;
    if (result !== undefined) {
      repr = String(result);
      if (result && typeof result.destroy === 'function') {
        result.destroy();
      }
    }
    postMessage({type: 'done', repr});
  } catch (error) {
    // PythonError.message 就是完整的 Python Traceback
    postMessage({type: 'error', message: error.message || String(error)});
  }
};
