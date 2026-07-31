# 6.1 包与模块管理

> 本节目标：学会把代码拆分成多个文件、多个包，真正理解 package 和 import。

## 一、为什么要分包？

至今我们所有代码都写在一个 `main.go` 里。真实项目成千上万行，必须拆分：

- **包（package）**= 一个目录下所有 Go 文件的集合，是 Go 组织代码的基本单位
- **模块（module）**= 一个项目，包含一个或多个包，由 `go.mod` 定义

## 二、同包多文件：最简单的拆分

同一个目录下的多个文件，只要 `package` 声明相同，就属于同一个包，**互相直接访问，不需要 import**：

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
    fmt.Println(greet("张三"))    // 直接用，无需 import
}
```

运行方式注意：`go run .`（跑整个包），而不是 `go run main.go`（那样不会编译 helper.go）。

## 三、创建自己的包

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
package calc            // 包名 = 目录名（惯例，强烈建议遵守）

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

### 三个关键规则

1. **导入路径 = 模块名 + 目录相对路径**：`go.mod` 里是 `module myapp`，目录是 `calc/`，导入就写 `myapp/calc`
2. **大写公开，小写私有**：函数、变量、结构体、字段全适用。这是 Go 的访问控制机制
3. **不允许循环导入**：A 导入 B，B 又导入 A → 编译报错。遇到了说明代码结构要调整（通常是把公共部分抽出第三个包）

## 四、import 的几种写法

```go
import (
    "fmt"                          // 标准库
    "os"

    "myapp/calc"                   // 本项目的包

    "github.com/fatih/color"       // 第三方包

    myAlias "myapp/verylongname"   // 起别名
    _ "github.com/lib/pq"          // 匿名导入：只执行包的初始化，不直接使用（数据库驱动常见）
)
```

分组惯例：标准库 / 本项目 / 第三方 分三组，空行隔开（gofmt 的扩展工具 goimports 会自动整理）。

## 五、包的初始化：init 函数（了解）

包里可以有 `init()` 函数，在包被导入时**自动执行一次**，早于 main：

```go
package calc

import "fmt"

func init() {
    fmt.Println("calc 包初始化了")
}
```

执行顺序：被导入的包先初始化 → 然后才是 main。新手了解即可，**能不用就不用**（隐式执行的代码不好排查）。

## 六、常见项目结构

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

## 七、依赖管理常用命令回顾

| 命令 | 作用 |
|------|------|
| `go get github.com/xxx/yyy` | 添加/更新一个依赖 |
| `go get github.com/xxx/yyy@v1.2.3` | 安装指定版本 |
| `go mod tidy` | 同步依赖（多退少补），提交代码前跑一次 |
| `go list -m all` | 列出所有依赖 |

`go.mod` 与 `go.sum` 都要提交到 git。

---

## 新手常见坑

1. **`go run main.go` 跑不起来多文件项目**：用 `go run .`
2. **导入路径写成目录相对路径**：`import "./calc"` 是错的！必须写 `模块名/calc`
3. **函数明明存在却 undefined**：检查首字母是否小写（未导出）
4. **包名和目录名不一致**：能编译但极易混淆，永远保持一致
5. **循环导入**：`import cycle not allowed`，重新划分包职责

---

## 练习

1. 创建项目 `shapes`，包含 `geometry` 子包，实现 `RectArea(w, h float64)` 和 `CircleArea(r float64)`，在 main.go 中调用。
2. 在 `geometry` 包加一个小写的辅助函数，在 main.go 里尝试调用，观察编译报错信息。
3. 把之前章节的"银行账户"示例改造成独立的 `account` 包：`Account` 结构体、`Deposit`、`Withdraw` 公开，内部校验逻辑用小写函数。

下一节：[6.2 单元测试](02-testing.md)
