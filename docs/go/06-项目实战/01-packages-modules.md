# 6.1 包与模块管理

> 本节目标：学会把代码拆分成多个文件、多个包，真正理解 package 和 import。

## 一、包与模块：Go 的两级组织单位

至今我们的代码都写在一个 `main.go` 里。真实项目成千上万行，必须拆分组织。Go 有两级组织单位：

| 概念 | 含义 |
|------|------|
| 包（package） | 一个目录下所有 Go 文件的集合，Go 组织代码的基本单位 |
| 模块（module） | 一个项目，包含一个或多个包，由 `go.mod` 定义 |

记法：**包是文件夹里的代码，模块是整个项目**——一个项目里装着很多文件夹。

## 二、package 声明：每个 Go 文件的第一行

每个 Go 文件的第一行都是 package 声明。拆开看：

```
package main
        ↑
        包名 —— 同一目录下的所有文件，必须声明同一个包名
```

读作：**本文件属于 main 包**。`main` 这个包名有特殊含义：只有 main 包能编译成可执行程序，它的 main 函数是程序入口；其他名字的包都是给别的代码用的库。

同一目录下的多个文件，只要 package 声明相同就属于同一个包，互相调用**不需要 import**：

```
myapp/
├── go.mod          (module myapp)
├── main.go         (package main)
└── helper.go       (package main)
```

```go
// helper.go
package main

func greet(name string) string {
    return "你好，" + name
}
```

```go
// main.go
package main

import "fmt"

func main() {
    fmt.Println(greet("张三"))    // 同包函数直接用，无需 import
}
```

> ⚠️ 多文件项目必须用 `go run .` 运行。`go run main.go` 只编译 main.go 一个文件，同包的 helper.go 不参与编译，报 `undefined: greet`。
>
> `go run .` 怎么读：**编译并运行当前目录的整个包**——`.` 代表当前目录。

## 三、import：要用别的包，先在这里报名字

用别的包之前必须在 import 里登记。先拆解最简单的一条：

```
import "myapp/calc"
        ↑     ↑
        模块名 —— go.mod 里 module 后面写的名字
              目录路径 —— 从模块根往下走的 calc/ 目录
```

读作：**导入 myapp 模块下 calc 目录里的包**，之后用 `calc.Add(...)` 这种"包名.函数名"的方式调用。也就是说，导入路径 = 模块名 + 目录相对路径。

实际项目里 import 通常分组写，每组的来源一目了然：

| 写法 | 含义 |
|------|------|
| `"fmt"` | 标准库 |
| `"myapp/calc"` | 本项目的包 |
| `"github.com/fatih/color"` | 第三方包 |
| `myAlias "myapp/verylongname"` | 起别名，之后用 `myAlias.` 调用 |
| `_ "github.com/lib/pq"` | 匿名导入：只执行包的初始化，不直接使用（数据库驱动常见） |

```go
import (
    "fmt"                          // 标准库
    "os"

    "myapp/calc"                   // 本项目的包

    "github.com/fatih/color"       // 第三方包

    myAlias "myapp/verylongname"   // 起别名
    _ "github.com/lib/pq"          // 匿名导入
)
```

> 💡 分组惯例：标准库 / 本项目 / 第三方 分三组，空行隔开（gofmt 的扩展工具 goimports 会自动整理）。

## 四、创建自己的包

按功能拆目录，每个目录一个包：

```
myapp/
├── go.mod              (module myapp)
├── main.go             (package main)
└── calc/               ← 子目录 = 子包
    └── calc.go         (package calc)
```

```go
// calc/calc.go
package calc            // 包名 = 目录名（惯例，遵守它）

// Add 首字母大写 → 对外公开
func Add(a, b int) int {
    return a + b
}

// helper 首字母小写 → 只有 calc 包内部能用
func helper() {}
```

```go
// main.go
package main

import (
    "fmt"

    "myapp/calc"        // 导入路径 = 模块名/目录路径
)

func main() {
    fmt.Println(calc.Add(1, 2))    // 用 包名.函数名 调用
    // calc.helper()               // ❌ 编译报错：小写不可见
}
```

三条关键规则：

| 规则 | 说明 |
|------|------|
| **首字母大写公开，小写私有** | 函数、变量、结构体、字段全适用，这是 Go 的访问控制机制 |
| 包名 = 目录名 | 不一致能编译，但 import 后用的名字与目录对不上，容易混淆 |
| 不允许循环导入 | A 导入 B、B 又导入 A → 编译报错；应把公共部分抽出第三个包 |

循环导入的最小复现——两个包互相 import：

```
myapp/
├── go.mod
├── a/a.go    import "myapp/b"
└── b/b.go    import "myapp/a"
```

`go build ./...` 的报错原文：

```text
package myapp/a
        imports myapp/b
        imports myapp/a: import cycle not allowed
```

## 五、go mod：模块与依赖的命令行工具

`go mod` 系列命令负责模块和依赖管理。三条最常用的，逐条读：

```bash
go mod init todo
```

读作：**把当前目录初始化成名叫 todo 的模块**，生成 go.mod。新建项目的第一步永远是它。

```bash
go mod tidy
```

读作：**整理依赖**——代码里 import 了但账本没记的补上，账本记了但代码没用的删掉，多退少补。提交代码前跑一次。

```bash
go get github.com/xxx/yyy
```

读作：**下载这个第三方包，并登记进 go.mod / go.sum**。

| 命令 | 作用 |
|------|------|
| `go get github.com/xxx/yyy` | 添加/更新一个依赖 |
| `go get github.com/xxx/yyy@v1.2.3` | 安装指定版本 |
| `go mod tidy` | 同步依赖（多退少补），提交代码前跑一次 |
| `go list -m all` | 列出所有依赖 |

`go.mod` 与 `go.sum` 是依赖账本，不手编、不删除；提交 git 时两者一起带上。

## 六、包的初始化：init 函数（了解）

包里可以定义 `func init()`——无参数、无返回值，**包被导入时自动执行一次**，早于 main。执行顺序：被导入的包先 init → main 自己的 init → main 函数。

两个文件验证执行顺序：

```
myapp/
├── go.mod          (module myapp)
├── main.go
└── calc/calc.go
```

```go
// calc/calc.go
package calc

import "fmt"

func init() {
    fmt.Println("① calc 的 init 执行了")
}

func Add(a, b int) int {
    return a + b
}
```

```go
// main.go
package main

import (
    "fmt"

    "myapp/calc"
)

func init() {
    fmt.Println("② main 的 init 执行了")
}

func main() {
    fmt.Println("③ main 函数执行了：", calc.Add(1, 2))
}
```

`go run .` 输出：

```text
① calc 的 init 执行了
② main 的 init 执行了
③ main 函数执行了： 3
```

> ⚠️ **能不用就不用**：init 隐式执行，出了问题不好排查。

## 七、常见项目结构

小项目不必过度设计，由简到繁：

```
# 入门项目：单包足矣
myapp/
├── go.mod
├── main.go
└── xxx.go

# 小型项目：按功能分几个包
myapp/
├── go.mod
├── main.go
├── config/       配置读取
├── storage/      数据存取
└── handler/      业务逻辑

# 社区常见约定（做大了再用）
myapp/
├── go.mod
├── cmd/myapp/main.go     程序入口
├── internal/...          私有包（其他项目无法导入 internal 下的包）
└── pkg/...               愿意给外部复用的包
```

> `internal/` 是 Go 工具链特殊对待的目录名：里面的包只有本模块能导入，天然的"项目私有"。

---

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `undefined: greet`（函数明明写了） | `go run main.go` 只编译 main.go 一个文件，同包的 helper.go 没带上 | 多文件项目用 `go run .` 跑整个包 |
| `import "./calc"` 直接编译报错 | Go 不支持目录相对路径导入 | 导入路径 = 模块名 + 目录：`myapp/calc` |
| `undefined: calc.helper` | 函数首字母小写，包外不可见（未导出） | 想对外公开就改成大写开头 |
| 包名和目录名不一致 | 能编译，但 import 后用的名字和目录对不上，容易混淆 | 包名永远 = 目录名 |
| `import cycle not allowed` | A 导入 B、B 又导入 A，形成循环依赖 | 把公共部分抽到第三个包 |

---

## 练习

1. 创建项目 `shapes`，包含 `geometry` 子包，实现 `RectArea(w, h float64)` 和 `CircleArea(r float64)`，在 main.go 中调用。
2. 在 `geometry` 包加一个小写的辅助函数，在 main.go 里尝试调用，观察编译报错信息。
3. 把之前章节的"银行账户"示例改造成独立的 `account` 包：`Account` 结构体、`Deposit`、`Withdraw` 公开，内部校验逻辑用小写函数。

<details>
<summary>点击查看答案</summary>

**1.** 目录 `shapes/geometry/geometry.go`（`package geometry`），导出 `RectArea` 和 `CircleArea`；main.go 里 `import "shapes/geometry"` 后 `fmt.Println(geometry.RectArea(3, 4), geometry.CircleArea(1))`（使用 `go run .` 运行）。公式：矩形 `w*h`，圆 `math.Pi * r * r`。

**2.** 在 geometry 包里写 `func helper() {}`，main.go 调用 `geometry.helper()`，真实报错：

```text
./main.go:10:26: undefined: geometry.helper
```

函数存在却报 undefined：Go 的小写标识符 = 私有，包外不可见。（旧版 Go 的报错文案是 `cannot refer to unexported name`，含义相同。）

**3. 参考结构：**

```go
// account/account.go
package account

import "errors"

type Account struct {
    owner   string // 小写：外部改不了持有人
    balance int    // 金额用"分"存整数（2.2 节的纪律）
}

func New(owner string) *Account {
    return &Account{owner: owner}
}

func (a *Account) Deposit(amount int) error {
    if !a.positive(amount) {
        return errors.New("金额必须为正")
    }
    a.balance += amount
    return nil
}

func (a *Account) Withdraw(amount int) error {
    if !a.positive(amount) {
        return errors.New("金额必须为正")
    }
    if amount > a.balance {
        return errors.New("余额不足")
    }
    a.balance -= amount
    return nil
}

func (a *Account) Balance() int {
    return a.balance
}

// positive 小写：内部校验逻辑，包外不可见
func (a *Account) positive(n int) bool {
    return n > 0
}
```

</details>

## 本节小结

- 同目录同 package = 同一个包，内部直接调用、不用 import；多文件项目用 `go run .` 跑整个包
- 导入路径 = 模块名 + 目录；**首字母大写公开、小写私有**，Go 的访问控制全靠这一条
- 包初始化顺序：被导入的包先 init，再轮到 main 自己；包之间不许循环导入
- `go mod init` 建项目、`go get` 加依赖、`go mod tidy` 理账本；`go.mod` / `go.sum` 不手编、不删除，提交 git 时一起带上

下一节：[6.2 单元测试](02-testing.md)
