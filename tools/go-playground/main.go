// Go 演练场的 WASM 运行器：把 Yaegi 解释器包装成浏览器可调用的 runGoCode()。
//
// 本文件编译成 static/go-wasm/main.wasm 后在 Web Worker 里运行，
// 编译方法与注意事项见同目录 README.md。
package main

import (
	"fmt"
	"runtime"
	"strings"
	"sync/atomic"
	"syscall/js"

	"github.com/traefik/yaegi/interp"
	"github.com/traefik/yaegi/stdlib"
)

// jsWriter 把解释器的 stdout/stderr 实时转发给 Worker 里的 __goOutput 回调，
// 页面因此能看到流式输出，而不是等代码跑完后一次性返回。
type jsWriter struct {
	kind string
}

func (w *jsWriter) Write(p []byte) (int, error) {
	js.Global().Call("__goOutput", w.kind, string(p))
	return len(p), nil
}

// running 防止重复执行（页面在运行中会禁用按钮，这里只是兜底）。
var running atomic.Bool

// runGoCode 由 Worker 的 onmessage 调用。
//
// 重要：用户代码必须放进新 goroutine 执行、回调本身立即返回——
// 在 js.FuncOf 回调里阻塞会导致 Go WASM 运行时死锁（官方文档明确警告），
// 放 goroutine 里 time.Sleep、channel 阻塞等才能正常工作。
func runGoCode(this js.Value, args []js.Value) any {
	code := args[0].String()
	if !running.CompareAndSwap(false, true) {
		return nil
	}
	go func() {
		defer running.Store(false)
		var errMsg string
		defer func() {
			// 用户代码 panic 时不能带崩整个 WASM 运行时
			if r := recover(); r != nil {
				errMsg = fmt.Sprintf("panic: %v", r)
			}
			js.Global().Call("__goDone", errMsg)
		}()
		// 每次运行都新建解释器：干净环境，上次运行的变量/状态不残留
		i := interp.New(interp.Options{
			Stdout: &jsWriter{kind: "stdout"},
			Stderr: &jsWriter{kind: "stderr"},
		})
		if err := i.Use(stdlib.Symbols); err != nil {
			errMsg = "加载标准库失败: " + err.Error()
			return
		}
		if _, err := i.Eval(code); err != nil {
			errMsg = err.Error()
		}
	}()
	return nil
}

func main() {
	js.Global().Set("runGoCode", js.FuncOf(runGoCode))
	// 通知 Worker 就绪，并上报 Go 版本（如 "1.24.2"，去掉 "go" 前缀）
	js.Global().Call("__goReady", strings.TrimPrefix(runtime.Version(), "go"))
	// WASM 的 main() 一旦返回，导出的函数就全部失效，必须永久阻塞保活
	select {}
}
