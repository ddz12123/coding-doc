# 1.4 Go 命令与模块初识

> 本节目标：认识日常开发中最常用的 go 命令，理解 go.mod 和 go.sum 的作用，掌握新项目的标准开局流程。

Go 安装好之后，你就拥有了一个全能的 `go` 命令。日常开发 90% 的操作都通过它完成。它的结构很有规律，先拆解一下：

```
go   run   main.go
↑    ↑     ↑
固定前缀
     动词：干什么
           对象：对谁干
```

记住了"**go + 动词 + 对象**"这个规律，下面的命令一个都不用死记。

## 一、最常用的命令速览

| 命令 | 作用 | 使用频率 |
|------|------|---------|
| `go run main.go` | 编译并立即运行（不留下文件） | ⭐⭐⭐⭐⭐ |
| `go build` | 编译，生成可执行文件 | ⭐⭐⭐⭐ |
| `go mod init 名字` | 初始化一个新模块（新项目第一步） | ⭐⭐⭐⭐ |
| `go mod tidy` | 自动整理依赖（该下的下，没用的删） | ⭐⭐⭐⭐ |
| `go get 包地址` | 下载第三方库 | ⭐⭐⭐ |
| `go test` | 运行测试 | ⭐⭐⭐ |
| `go fmt ./...` | 格式化当前项目所有代码 | ⭐⭐⭐ |
| `go vet ./...` | 静态检查，找出可疑代码 | ⭐⭐ |
| `go version` | 查看 Go 版本 | ⭐ |
| `go env` | 查看 Go 环境配置 | ⭐ |

## 二、go run 与 go build 的区别

这两个动词是日常主力，区别在编译产物去哪：

| 命令 | 编译产物去哪 | 什么时候用 |
|------|------------|-----------|
| `go run main.go` | 临时目录，用完即删 | 开发调试，快速看结果 |
| `go build` | 当前目录，生成可执行文件 | 交付部署，要一个能拷走的程序 |

`go run` 也可以直接跑整个包：

```
go run .
       ↑
       一个点 = 当前目录的包
```

读作：运行当前目录的包。不用指定文件名，包里有几个 .go 文件都能一起编进去，**推荐写法**。

## 三、模块（Module）

**模块 = 一个项目 + 它的依赖清单。** 打个比方：`go.mod` 是项目的"进货清单"——记录用了哪些第三方库、各是什么版本；`go.sum` 是每件货的"防伪码"（校验和），防止下载的东西被人篡改。

### go.mod：依赖清单

执行 `go mod init hello` 时，Go 创建 `go.mod` 文件：

```
module hello

go 1.22
```

| 行 | 含义 |
|----|------|
| `module hello` | 模块名。个人练习随便起；正式项目通常用仓库地址，如 `module github.com/yourname/yourproject` |
| `go 1.22` | 这个项目使用的 Go 版本 |

### 添加第三方依赖：go get

代码里用到了别人写的库时，只需要：

```bash
go get github.com/fatih/color    # 下载一个能打印彩色文字的库
```

> 命令怎么读：`go get 包地址` 读作——获取（get）这个包，装进当前项目的依赖里。

`go.mod` 会自动多出一行依赖记录：

```
module hello

go 1.22

require github.com/fatih/color v1.16.0
↑       ↑                      ↑
require 是固定关键字
        库的地址 —— 从哪下载
                               版本号 —— 用哪一版
```

读作：本项目依赖 github.com/fatih/color，版本 v1.16.0。

同时会生成 `go.sum` 文件（记录依赖的校验和，防止被篡改）。**这两个文件都不要手动编辑，也不要删除**，提交代码时要一起提交。

### 体验第三方库

```go
package main

import "github.com/fatih/color"

func main() {
    color.Red("这行字是红色的！")
    color.Green("这行字是绿色的！")
}
```

```bash
go mod tidy   # 自动下载代码中用到的依赖
go run .
```

> 命令怎么读：`go mod tidy` 读作——用模块功能整理（tidy）依赖：扫描代码，缺的自动下载，没用的自动删除。
>
> **记住 `go mod tidy`**：遇到依赖相关的报错，先跑一遍它，多数问题都能解决。

### 下载的依赖存在哪

1.2 节讲过：所有下载的第三方库都缓存在 `GOPATH/pkg/mod` 里，**全部项目共用**——十个项目都用 `color` 库，磁盘上只存一份。所以 Go 项目目录里**没有** Python 那种 .venv、前端那种 node_modules：`go.mod` 只是一张清单，库本体在全局缓存里。

### go get 与 go install 的区别

| 命令 | 用途 | 结果 |
|------|------|------|
| `go get 包地址` | 给**当前项目**添加依赖 | 写进 go.mod |
| `go install 包地址@版本` | 把一个命令行工具装到 `GOPATH/bin`，供**全局使用** | 得到一个全局可用的工具 |

```bash
go install golang.org/x/tools/cmd/goimports@latest   # 装一个自动整理 import 的工具
```

新手阶段用不到几次，认得出来就行。

## 四、一个新项目的标准开局

以后每次开新项目，流程都是固定的三步：

1. `mkdir myproject && cd myproject` —— 创建目录并进入
2. `go mod init myproject` —— 初始化模块，生成 go.mod
3. 新建 `main.go`，开始写代码

## 五、代码格式化与检查

```
go fmt ./...
       ↑↑↑↑↑
       ./ = 当前目录，... = 连同所有子目录
```

读作：对当前目录及所有子目录生效。`./...` 是 Go 命令的特殊写法，值得单独记住。

```bash
go fmt ./...   # 把所有代码格式化成官方标准格式
go vet ./...   # 静态检查，找出可疑代码（比如格式化占位符用错）
```

如果用 VS Code + Go 扩展，保存文件时会自动执行格式化，一般不用手动跑 `go fmt`。

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `no required module provides package ...` | 代码 import 了包，但 go.mod 里没有依赖记录 | 运行 `go mod tidy`，或按报错提示 `go get` |
| 手动编辑 go.mod、删除 go.sum | 误以为是普通配置文件 | 两个文件都不手编、不删除，提交代码时一起带上 |
| 混淆 go get 与 go install | 两者用途不同 | `go get` 装项目依赖；`go install` 装全局命令行工具 |
| 依赖下载失败 | GOPROXY 未配置国内镜像 | 见 1.2 节的 GOPROXY 配置 |

## 练习

**1. 动手**：新建一个项目 `colortest`，按"标准开局"三步走，然后使用 `github.com/fatih/color` 库打印几行彩色文字。

**2. 动手**：执行 `go env GOPROXY`，确认你的代理配置是否生效。

**3. 动手**：故意把 `go.mod` 里的 `require` 行删掉，运行 `go run .` 看报错，然后用 `go mod tidy` 修复它。

<details>
<summary>点击查看练习 3 答案</summary>

删掉 require 行后，`go run .` 的真实报错：

```text
main.go:3:8: no required module provides package github.com/fatih/color; to add it:
        go get github.com/fatih/color
```

含义：代码 import 了 color 包，但 `go.mod` 里没有它的依赖记录，Go 不知道去哪找——报错同时给出了修复命令。

用 tidy 修复：

```bash
go mod tidy    # 扫描代码：import 用到但 go.mod 没记的依赖，自动下载并补回 require 行
go run .       # 又能跑了，彩色文字回来了
```

**依赖报错，先跑 `go mod tidy`。**

</details>

## 本节小结

- 日常主力命令就三个：`go run .` 开发跑、`go build` 出交付物、`go mod tidy` 整理依赖
- 模块 = 项目 + 依赖清单；清单是 `go.mod`、校验账本是 `go.sum`——都不手编、不删除，提交 git 时一起带上
- `go get` 给**当前项目**装依赖（写进 go.mod）；`go install` 装**全局命令行工具**（进 GOPATH/bin），别搞混
- 新项目标准开局三步：建目录 → `go mod init 名字` → 写 main.go

第一章到此完成，下一章开始正式学习语法。

[返回教程目录](../README.md)
