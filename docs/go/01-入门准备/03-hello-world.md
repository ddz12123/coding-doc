# 1.3 第一个程序 Hello World

> 本节目标：创建第一个 Go 项目，写出并运行 Hello World，理解每一行代码的含义，掌握 Go 的四条硬性规范。

## 一、创建项目

打开终端，进入你的学习目录，执行：

```bash
mkdir hello        # 创建 hello 目录
cd hello           # 进入这个目录
go mod init hello  # 初始化一个名叫 hello 的 Go 模块
```

> 命令怎么读：`go mod init hello` 读作——用 go 命令的模块（mod）功能，初始化（init）一个名叫 hello 的模块。

执行后目录里多出一个 `go.mod` 文件，内容大概是：

```
module hello    ← 模块名：这个项目叫 hello

go 1.22         ← 这个项目用哪个版本的 Go 编译
```

它的作用是声明"这个目录是一个名叫 hello 的 Go 模块"。**每个 Go 项目开始前都要执行一次 `go mod init`**，先记住这个习惯，细节见 1.4 节。

## 二、编写代码

在 `hello` 目录下新建文件 `main.go`，输入以下内容（建议手敲，熟悉语法）：

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

> 命令怎么读：`go run main.go` 读作——用 go 命令，运行（run）main.go 这个文件。go 命令的规律就是 **go + 动词 + 对象**：run 是运行，build 是构建，mod 是管模块。

看到输出：

```
Hello, World!
你好，Go 语言！
```

第一个 Go 程序运行成功。

## 四、逐行拆解：每一行在干什么

| 代码 | 这行在干什么 |
|------|------|
| `package main` | **包声明**。每个源文件第一行必须声明自己属于哪个包；`main` 是一个特殊的包名，表示"这是一个可以直接运行的程序"（而不是给别人调用的库） |
| `import "fmt"` | **导入包**。`fmt` 是 Go 标准库中负责**格式化输入输出**的包（fmt = format），打印内容到屏幕就靠它 |
| `func main() {` | **主函数**。`func` 是定义函数的关键字；`main` 函数是程序的**入口**，程序运行时从这里开始执行。一个可执行程序必须有且只有一个 `main` 函数 |
| `fmt.Println("Hello, World!")` | 调用 `fmt` 包里的 `Println` 函数（Print line，打印并换行），把引号里的文字输出到屏幕 |
| `fmt.Println("你好，Go 语言！")` | 同上，再打印一行 |
| `}` | 函数体结束。Go 用大括号 `{}` 包裹代码块，**不用**像 Python 那样靠缩进 |

其中调用函数的写法最重要，单独拆解一下：

```
fmt.Println("Hello, World!")
↑   ↑       ↑
包名
    函数名
            参数 —— 要打印的内容
```

读作：调用 fmt 包里的 Println 函数，把括号里的内容打印出来并换行。以后调用标准库、第三方库的函数，全都是 `包名.函数名(...)` 这一个套路：

```go
fmt.Println("Hello")        // Hello
fmt.Println("a", "b", 123)  // a b 123 —— 逗号隔开多个内容，打印时用空格分隔
```

## 五、编译成可执行文件

`go run` 是"编译 + 立即运行"，编译产物放在临时目录里用完即删，适合开发调试。想得到一个可以拷走分发的程序，用 `go build`：

```bash
go build
```

> 命令怎么读：`go build` 读作——构建（build）当前目录的整个包，在当前位置生成可执行文件。

执行后目录下会出现可执行文件（Windows 上是 `hello.exe`，macOS/Linux 上是 `hello`）。直接运行它：

```bash
# Windows
.\hello.exe

# macOS / Linux
./hello
```

这个文件**不需要安装 Go 环境**就能在同类系统上运行——这就是 1.1 节说的"部署方便"。

## 六、Go 的四条硬性规范

刚开始写 Go 大概率会碰到下面这些"报错"，它们其实是 Go 的强制规范——把自由度收走，换来所有 Go 代码长得一样整齐。

### 规范 1：左大括号不能另起一行

```go
// ✅ 正确：{ 跟在行尾
func main() {
}

// ❌ 编译报错：{ 单独占一行
func main()
{
}
```

### 规范 2：导入了的包必须使用，声明了的变量必须使用

```go
import "fmt"   // 如果代码里没用到 fmt，编译直接报错
```

这不是警告，是**错误**，程序根本跑不起来。Go 强制你保持代码干净，临时"留着以后用"行不通，删掉即可。

### 规范 3：不需要写分号

行尾不用写 `;`，编译器会自动处理。

### 规范 4：代码格式是统一的

执行 `gofmt -w main.go`（或在 VS Code 里保存文件）会自动把代码格式化成官方风格。**全世界的 Go 代码都是一个格式**，不存在"格式之争"。

## 新手常见坑

| 报错信息 | 原因 | 解决 |
|---------|------|------|
| `go: cannot find main module` | 没执行 `go mod init` | 在项目目录执行 `go mod init 项目名` |
| `imported and not used: "fmt"` | 导入了包但没用 | 删掉没用到的 import |
| `declared and not used: x` | 声明了变量但没用 | 删掉或使用这个变量 |
| `expected declaration, found xxx` | 代码写在了函数外面 | 语句要写在 `func` 里面 |
| `missing function body` / 大括号相关错误 | `{` 另起一行了 | `{` 放到行尾 |

## 练习

**1. 动手**：修改程序，输出你的名字和今天的日期。

**2. 动手**：把两行 `Println` 删掉，让 `import "fmt"` 用不上，运行 `go run main.go`，观察报错信息长什么样。

**3. 动手**：用 `go build` 编译出可执行文件，然后把它拷贝到别的目录运行，验证它是独立可执行的。

<details>
<summary>点击查看练习 2 答案</summary>

fmt 没用上时，`go run main.go` 直接编译失败，真实报错（Go 1.21+）：

```text
./main.go:3:2: "fmt" imported and not used
```

Go 1.20 及更早版本的文案是 `imported and not used: "fmt"`，含义相同。

含义：你导入了 fmt，但代码里没有使用它。注意这是**编译错误**不是警告——程序根本跑不起来，不存在"先跑起来再说"。解决：删掉这行 import，或者真的用上 `fmt`。

</details>

## 本节小结

- `go mod init 项目名` 是每个 Go 项目的第一步，它生成记录模块信息的 `go.mod`
- `go run` 开发调试用（编译完立刻运行），`go build` 交付用（生成可独立运行的可执行文件）
- `package main` + `func main()` 是程序入口，一个可执行程序必须有且只有一个
- "导入了没用、声明了没用"在别的语言顶多是警告，在 Go 是**编译错误**——代码干净是被强制的

下一节：[1.4 Go 命令与模块初识](04-go-toolchain.md)
