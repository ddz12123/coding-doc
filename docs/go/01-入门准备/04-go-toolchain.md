# 1.4 Go 命令与模块初识

> 本节目标：认识日常开发中最常用的 go 命令，理解 go.mod 是干什么的。

Go 安装好之后，你就拥有了一个全能的 `go` 命令。日常开发 90% 的操作都通过它完成。

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

> `./...` 是 Go 命令的特殊写法，意思是"当前目录及所有子目录"。

## 二、go run 与 go build 的区别

```bash
go run main.go    # 编译到临时目录并运行，用完即删 —— 开发时用
go build          # 在当前目录生成可执行文件 —— 交付时用
```

`go run` 也可以直接跑整个包：

```bash
go run .          # 运行当前目录的 main 包（推荐写法）
```

## 三、模块（Module）是什么？

**模块 = 一个项目 + 它的依赖清单。**

当你执行 `go mod init hello` 时，Go 创建了 `go.mod` 文件：

```
module hello

go 1.22
```

- `module hello`：模块名。个人练习随便起；正式项目通常用仓库地址，如 `module github.com/yourname/yourproject`
- `go 1.22`：这个项目使用的 Go 版本

### 当你使用第三方库时

假设代码里用到了别人写的库，只需要：

```bash
go get github.com/fatih/color    # 下载一个能打印彩色文字的库
```

`go.mod` 会自动多出一行依赖记录：

```
module hello

go 1.22

require github.com/fatih/color v1.16.0
```

同时会生成 `go.sum` 文件（记录依赖的校验和，防止被篡改）。**这两个文件都不要手动编辑，也不要删除**，提交代码时要一起提交。

### 体验一下第三方库

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

> **记住 `go mod tidy`**：它会扫描你的代码，缺的依赖自动下载，多余的依赖自动删除。遇到依赖相关的报错，先跑一遍它，多数问题都能解决。

### 下载的依赖去哪了？

还记得安装节讲的 `GOPATH` 吗？所有下载的第三方库都缓存在 `GOPATH/pkg/mod` 里，**全部项目共用**：十个项目都用 `color` 库，磁盘上只存一份。所以 Go 项目目录里**没有** Python 那种 .venv、前端那种 node_modules——`go.mod` 只是一张清单，库本体在全局缓存里。

顺带认识一下 `go install`：它和 `go get` 长得像，但用途不同——`go get` 是给**当前项目**添加依赖；`go install` 是把一个命令行工具装到 `GOPATH/bin` 供**全局使用**，比如：

```bash
go install golang.org/x/tools/cmd/goimports@latest   # 装一个自动整理 import 的工具
```

新手阶段用不到几次，认得出来就行。

## 四、一个新项目的标准开局

以后每次开新项目，流程都是固定的三步：

```bash
mkdir myproject && cd myproject   # 1. 创建目录
go mod init myproject             # 2. 初始化模块
# 3. 创建 main.go 开始写代码
```

## 五、代码格式化与检查

```bash
go fmt ./...   # 把所有代码格式化成官方标准格式
go vet ./...   # 检查常见错误（比如格式化占位符用错）
```

如果你用 VS Code + Go 扩展，保存文件时会自动执行格式化，一般不用手动跑 `go fmt`。

---

## 练习

1. 新建一个项目 `colortest`，按"标准开局"三步走，然后使用 `github.com/fatih/color` 库打印几行彩色文字。
2. 执行 `go env GOPROXY`，确认你的代理配置是否生效。
3. 故意把 `go.mod` 里的 `require` 行删掉，运行 `go run .` 看报错，然后用 `go mod tidy` 修复它。

---

🎉 第一章完成！你已经具备了 Go 开发的基本环境和工具知识。

下一章开始正式学习语法：[2.1 变量与常量](../02-基础语法/01-variables-constants.md)
