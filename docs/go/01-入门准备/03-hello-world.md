# 1.3 第一个程序 Hello World

> 本节目标：亲手写出、运行你的第一个 Go 程序，并理解每一行代码的含义。

## 一、创建项目

打开终端，进入你的学习目录，执行：

```bash
mkdir hello
cd hello
go mod init hello
```

`go mod init hello` 会创建一个 `go.mod` 文件，内容大概是：

```
module hello

go 1.22
```

它的作用是声明"这个目录是一个名叫 hello 的 Go 模块"。**每个 Go 项目开始前都要执行一次 `go mod init`**，先记住这个习惯，细节后面讲。

## 二、编写代码

在 `hello` 目录下新建文件 `main.go`，输入以下内容（建议手敲，不要复制）：

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
    fmt.Println("你好，Go 语言！")
}
```

## 三、运行程序

在终端执行：

```bash
go run main.go
```

看到输出：

```
Hello, World!
你好，Go 语言！
```

🎉 恭喜，你已经是一名 Go 程序员了！

## 四、逐行解释这段代码

```go
package main
```

**包声明**。Go 的每个源文件第一行必须声明自己属于哪个包。`main` 是一个特殊的包名，表示"这是一个可以直接运行的程序"（而不是给别人调用的库）。

```go
import "fmt"
```

**导入包**。`fmt` 是 Go 标准库中负责**格式化输入输出**的包（fmt = format），打印内容到屏幕就靠它。

```go
func main() {
```

**主函数**。`func` 是定义函数的关键字。`main` 函数是程序的**入口**——程序运行时从这里开始执行。一个可执行程序必须有且只有一个 `main` 函数。

```go
    fmt.Println("Hello, World!")
```

调用 `fmt` 包里的 `Println` 函数（Print line，打印并换行），把括号里的文字输出到屏幕。注意调用格式是 `包名.函数名(...)`。

```go
}
```

函数体结束。Go 用大括号 `{}` 包裹代码块，**不用**像 Python 那样靠缩进。

## 五、编译成可执行文件

`go run` 是"编译+立即运行"，适合开发调试。如果想得到一个可以独立分发的程序：

```bash
go build
```

执行后目录下会出现可执行文件（Windows 上是 `hello.exe`，macOS/Linux 上是 `hello`）。直接运行它：

```bash
# Windows
.\hello.exe

# macOS / Linux
./hello
```

这个文件**不需要安装 Go 环境**就能在同类系统上运行——这就是 Go 部署方便的原因。

## 六、新手必看：Go 的几条硬规矩

刚开始写 Go，你大概率会碰到这些"报错"，它们其实是 Go 的强制规范：

### 1. 左大括号不能另起一行

```go
// ✅ 正确
func main() {
}

// ❌ 编译报错！
func main()
{
}
```

### 2. 导入了的包必须使用，声明了的变量必须使用

```go
import "fmt"   // 如果代码里没用到 fmt，编译直接报错
```

这不是警告，是**错误**。Go 强制你保持代码干净。临时想"留着以后用"是行不通的，删掉即可。

### 3. 不需要写分号

Go 编译器会自动处理，行尾不用写 `;`。

### 4. 代码格式是统一的

执行 `gofmt -w main.go`（或在 VS Code 里保存文件）会自动把代码格式化成官方风格。**全世界的 Go 代码都是一个格式**，不存在"格式之争"。

## 七、常见报错对照表

| 报错信息 | 原因 | 解决 |
|---------|------|------|
| `go: cannot find main module` | 没执行 `go mod init` | 在项目目录执行 `go mod init 项目名` |
| `imported and not used: "fmt"` | 导入了包但没用 | 删掉没用到的 import |
| `declared and not used: x` | 声明了变量但没用 | 删掉或使用这个变量 |
| `expected declaration, found xxx` | 代码写在了函数外面 | 语句要写在 `func` 里面 |
| `missing function body` / 大括号相关错误 | `{` 另起一行了 | `{` 放到行尾 |

---

## 练习

1. 修改程序，输出你的名字和今天的日期。
2. 故意把 `import "fmt"` 里的 fmt 用不上（把两行 Println 删掉），运行 `go run main.go`，观察报错信息长什么样。
3. 用 `go build` 编译出可执行文件，然后把它拷贝到别的目录运行，验证它是独立可执行的。

下一节：[1.4 Go 命令与模块初识](04-go-toolchain.md)
