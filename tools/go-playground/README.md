# Go 演练场 WASM 运行器

这个目录是 **Go 演练场（/playground/go）的运行时源码**。它把 [Yaegi](https://github.com/traefik/yaegi) 解释器（Traefik 出品的纯 Go 解释器）编译成 WebAssembly，让用户的 Go 代码直接在浏览器里执行，**无需任何后端服务**。

## 架构一览

```
浏览器页面 (Monaco 编辑器)
    │ postMessage
    ▼
static/go-worker.js (Web Worker，页面不卡)
    │ 加载 wasm_exec.js + main.wasm，调用 runGoCode(源码)
    ▼
main.wasm (本目录 main.go 的编译产物，内嵌 Yaegi 解释器)
    │ 实时回调 __goOutput / __goDone
    ▼
页面输出面板（流式显示 stdout / stderr / 错误）
```

## 目录文件说明

| 文件 | 说明 |
|---|---|
| `main.go` | 运行器源码：注册 `runGoCode()` 给 JS 调用；用户代码在独立 goroutine 里跑（避免 WASM 回调死锁）；stdout/stderr 通过自定义 Writer 实时流式回传；每次运行新建解释器保证环境干净 |
| `go.mod` / `go.sum` | Go 模块定义，锁定 Yaegi 版本 |
| `build.ps1` | 一键编译脚本（见下） |

**编译产物不在本目录**，在 `static/go-wasm/`：

| 产物 | 说明 |
|---|---|
| `static/go-wasm/main.wasm` | 编译产物（约 38MB），**仅存在于本地，不提交 git**（EdgeOne Pages 单文件限 25MiB） |
| `static/go-wasm/main.wasm.gz` | 上面的 gzip 版（约 8MB），**已提交 git**、随整站部署；`go-worker.js` 在浏览器里用 `DecompressionStream` 解压后实例化 |
| `static/go-wasm/wasm_exec.js` | Go 官方的 JS 胶水脚本，从 `$GOROOT/lib/wasm/` 拷贝，**必须与编译用的 Go 版本一致** |

## 什么时候需要重新编译？

日常开发、构建、部署**都不需要**碰这个目录——`main.wasm` 是静态文件，拿来即用。只有两种情况需要重编：

1. **升级 Go / Yaegi 版本**（比如想让演练场支持新版 Go 语法）
2. **修改运行器逻辑**（比如以后想加执行超时、输出长度限制等）

## 如何重新编译（一条命令）

前置条件：本机装有 Go（当前用 **go1.24.2** 编译；Yaegi 官方支持最近两个 Go 大版本，升级 Go 前先确认 Yaegi 已适配）。

```powershell
powershell -File tools/go-playground/build.ps1
```

脚本会自动完成：编译（`-s -w` 瘦身）→ 从 GOROOT 拷贝配套的 `wasm_exec.js` → 打印产物清单。

如果换了新的 Go 大版本，先更新依赖再编译：

```powershell
cd tools/go-playground
go get github.com/traefik/yaegi@latest
go mod tidy
powershell -File build.ps1
```

> 国内网络拉不动模块时，先设置代理：`go env -w GOPROXY=https://goproxy.cn,direct`

## 演练场的能力边界（Yaegi + WASM 的天花板）

- ✅ 真 Go 运行时：goroutine、channel、select、闭包、泛型都真实可用
- ✅ 绝大部分标准库（fmt、strings、time、sort、encoding/json……）
- ❌ 不支持 `go get` 第三方包（Yaegi 只内置标准库符号表）
- ❌ 无网络（net/http 等被浏览器沙箱禁止）、无文件系统
- ⚠️ 死循环会卡住 Worker——页面提供「重启」按钮兜底（杀掉 Worker 重开）

## 踩坑记录

- **不要在 `js.FuncOf` 回调里直接跑用户代码**：回调阻塞会让 Go WASM 运行时死锁（`time.Sleep` 必炸），必须丢进新 goroutine、回调立即返回
- **`wasm_exec.js` 和 Go 版本强绑定**：升级 Go 后忘拷新的 wasm_exec.js，会报奇怪的 `not a function` / ABI 错误；build.ps1 已自动处理
- **`main()` 必须永久阻塞**（`select {}`）：main 返回后 WASM 实例失效，导出的 `runGoCode` 全部不可用
