# 4.3 错误处理

> 本节目标：掌握 Go 的错误处理哲学与惯用写法，分清 error 和 panic——从 2.5 埋到现在的 `(结果, error)` 伏笔，本节一次性兑现。

一路走来你已经写过很多次 `if err != nil` 了：2.5 的除法函数、3.2 的取款示例……但一直是"照着模板抄"。这一节把 error 的来龙去脉彻底讲清楚：它是什么、怎么造、怎么传、什么时候该用它的"暴躁兄弟" panic。

## 一、Go 的错误处理哲学：没有 try/catch

写过 Python/Java 的第一反应是找 try/catch。**Go 没有异常机制**，这是刻意的设计选择：

> **错误就是普通的值，像处理其他返回值一样处理它。**

对比一下两种世界观：

```python
# Python：异常可能从任何一行飞出来，不看文档不知道谁会炸
data = load_config(path)      # 会不会抛异常？抛什么异常？签名看不出来
```

```go
// Go：会失败的函数，签名里明晃晃写着 error
func loadConfig(path string) (Config, error)
//                                    ↑ 骗不了人：调我就得面对失败的可能
```

代价是代码啰嗦（`if err != nil` 会写一万遍），换来的是**每一处可能出错的地方都摆在明面上**，没有隐形炸弹。Go 团队认为这笔交易划算——习惯之后你大概率也会同意。

## 二、基本模式：if err != nil

模板长这样，闭着眼都要会写：

```go
result, err := doSomething()
if err != nil {
    // 处理错误：打印、返回、给默认值……
    return err
}
// 走到这里 = 没出错，放心用 result
```

真实例子——打开文件：

```go
package main

import (
    "fmt"
    "os"
)

func main() {
    f, err := os.Open("不存在的文件.txt")
    if err != nil {
        fmt.Println("打开失败：", err)
        return
    }
    defer f.Close()      // 2.5 的 defer：成功打开后立刻安排好关闭
    fmt.Println("打开成功")
}
```

输出：

```
打开失败： open 不存在的文件.txt: The system cannot find the file specified.
```

注意这套动作的节奏：**调用 → 判 err → 出错就提前 return → 主流程继续往下**。还有 2.4 学过的紧凑版，适合不需要 result 的场合：

```go
if err := save(data); err != nil {
    return err
}
```

## 三、error 的真身：一个单方法接口

上一节末尾剧透过，现在正式揭晓——`error` 就是个内置接口：

```go
type error interface {
    Error() string
}
```

翻译成人话：**任何有 `Error() string` 方法的类型，都能当错误用**。这解释了两件事：

- 为什么 `err != nil` 能判断"有没有错"：接口零值是 nil，没错误时函数返回 nil
- 为什么 `fmt.Println(err)` 能打出错误信息：fmt 调用了它的 `Error()` 方法

## 四、自己创建错误：两个函数

轮到你写"可能失败的函数"时，错误从哪来？

### errors.New：固定文本

```go
import "errors"

var ErrNotFound = errors.New("找不到该记录")

func find(id int) error {
    if id <= 0 {
        return ErrNotFound
    }
    return nil        // 没出错，返回 nil
}
```

> 💡 惯例：包级别的预定义错误用 `Err` 开头命名（`ErrNotFound`、`ErrPermission`），标准库全是这个风格（`os.ErrNotExist`、`io.EOF`）。定义成变量而不是每次现造，是为了让调用方能"认出"它——马上讲的 `errors.Is` 靠的就是同一个变量。

### fmt.Errorf：带动态信息

```go
func withdraw(balance, amount float64) error {
    if amount > balance {
        return fmt.Errorf("余额不足：余额 %.2f，取款 %.2f", balance, amount)
    }
    return nil
}
```

用法和 `fmt.Printf` 一样（2.2 的占位符全能用），只是结果不打印到屏幕，而是打包成一个 error 返回。

## 五、错误的传递与包装：%w

实际项目里，多数错误你**当场处理不了**——读文件失败，底层函数能怎么办？只能往上报。但直接 `return err` 会丢上下文：错误一路上传到顶层，只剩一句 `no such file or directory`，鬼知道是哪一步读哪个文件失败的。

正确姿势：**加上下文再上传**，用 `%w`（wrap，包装）：

```go
func loadConfig(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        return fmt.Errorf("读取配置文件 %s 失败: %w", path, err)
    }
    _ = data
    return nil
}
```

`%w` 和 `%v` 打印出来一模一样，区别在暗处：`%w` 把原错误**完整地包进新错误里**，形成错误链：

```
读取配置文件 app.conf 失败: open app.conf: no such file or directory
└── 外层（你加的上下文）      └── 内层（os.ReadFile 的原错误，还"活着"）
```

链条的价值：上层能用 `errors.Is` 检查**链里**有没有某个特定错误：

```go
err := loadConfig("app.conf")
if errors.Is(err, os.ErrNotExist) {      // 顺着链一层层比对
    fmt.Println("配置文件不存在，使用默认配置")
}
```

> ⚠️ **不报错的错**：用 `==` 比较包装过的错误永远是 false——`err == os.ErrNotExist` 比的是最外层，而外层是你 `fmt.Errorf` 新造的。**判断"是不是某个错误"，一律用 `errors.Is`，别用 `==`**。

新手阶段记两条就够：

- 传递错误：`fmt.Errorf("干什么失败: %w", err)`
- 判断错误：`errors.Is(err, 目标错误)`

## 六、panic：程序崩溃

error 是"预料之中的失败"，还有一类是"程序写错了"——这时 Go 会 **panic**：打印调用栈，整个程序退出。你其实早就见过它们：

- 下标越界：`s[100]`（3.1）
- 向 nil map 写入（3.2 的头号坑）
- 解引用 nil 指针（3.4 的第一大运行时错误）
- 整数除以 0
- 不带 ok 的类型断言失败（4.2）

也可以主动触发：

```go
if dbURL == "" {
    panic("数据库配置丢失，无法启动")    // 启动都启动不了，崩比带病运行好
}
```

### error 还是 panic？

| 情况 | 用什么 |
|------|-------|
| 文件不存在、网络超时、用户输入不合法……**预料之中**的失败 | error |
| 数组越界、nil 指针、启动缺关键配置……**程序有 bug 或没法继续** | panic |

**原则：能用 error 就用 error。** 新手业务代码里几乎不应该出现主动 panic——把 panic 当 throw 用是从异常语言带来的坏习惯。

## 七、recover：捕获 panic（了解即可）

panic 并非完全拦不住，`recover` 配合 defer 可以接住它：

```go
func safeCall() {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("捕获到 panic：", r)
        }
    }()
    panic("出大事了")
}

func main() {
    safeCall()
    fmt.Println("程序还活着")    // 会执行！
}
```

原理靠 2.5 的 defer 规则：panic 发生时，defer 依然会执行，`recover()` 在 defer 里被调用就能拦截崩溃。

实际用途基本只有一个：框架级兜底——Web 服务器用它保证"一个请求 panic 不拖垮整个服务"。**它不是 try/catch 的替代品**，业务代码里写 recover 十有八九是误用。

## 八、错误处理的好习惯

1. **不要用 `_` 吞错误**：`result, _ := f()` 编译器不拦（`_` 合法），但错误被静默丢弃，出问题时无迹可寻——这是 Go 里最危险的"不报错的错"
2. **错误信息小写开头、结尾不带标点**（官方规范）：因为它会被包装进长句，`读取失败: 文件不存在` 比 `读取失败: 文件不存在。` 顺眼
3. **要么处理，要么传递，别两个都做**：既打印又 `return err`，上层再打印，日志里同一个错误出现 N 遍
4. **提前返回，主流程靠左**：

```go
// ✅ 推荐：错误处理完立刻 return，主逻辑永远贴着左边不缩进
func process() error {
    data, err := load()
    if err != nil {
        return fmt.Errorf("加载失败: %w", err)
    }
    result, err := transform(data)
    if err != nil {
        return fmt.Errorf("转换失败: %w", err)
    }
    return save(result)
}
```

## 报错速查表

| 现象 | 人话 | 解决 |
|------|------|------|
| `err.Error is not a type` | 把 `err.Error()` 写成了 `err.Error` | 方法调用别忘括号 |
| `errors.Is` 一直返回 false | 包装时用了 `%v` 而不是 `%w`，链断了 | 包装错误必须用 `%w` |
| `panic: runtime error: ...` 后程序退出 | 运行时 panic（越界/nil 等） | 看调用栈第一行定位到自己的代码行 |
| 日志里同一错误打印 N 遍 | 每层都打印又都上传 | 只在最顶层打印一次 |

## 练习

**1. 动手**：写函数 `parseAge(s string) (int, error)`：
- 用 `strconv.Atoi` 转换，失败时用 `%w` 包装返回
- 转换成功但不在 0~150 范围时，返回 `fmt.Errorf("年龄 %d 超出合理范围", n)`
- 在 main 中分别用 `"18"`、`"abc"`、`"999"` 测试三条路径

**2. 猜输出**：先别运行，猜猜打印什么？

```go
var ErrEmpty = errors.New("输入为空")

func check(s string) error {
    if s == "" {
        return fmt.Errorf("校验失败: %w", ErrEmpty)
    }
    return nil
}

func main() {
    err := check("")
    fmt.Println(err == ErrEmpty)
    fmt.Println(errors.Is(err, ErrEmpty))
}
```

<details>
<summary>点击看答案</summary>

```
false
true
```

`err` 是 `fmt.Errorf` 新造的外层错误，和 `ErrEmpty` 不是同一个值，所以 `==` 是 false；但 `%w` 把 `ErrEmpty` 包在链里，`errors.Is` 顺着链能找到它。这题就是"判断错误必须用 errors.Is"的证据。

</details>

**3. 修 bug**：下面的代码"文件明明不存在，却打印了成功"，哪错了？

```go
func main() {
    f, _ := os.Open("ghost.txt")
    defer f.Close()
    fmt.Println("打开成功")
}
```

<details>
<summary>点击看答案</summary>

两个问题叠加：

1. `_` 把错误吞了——打开失败时 err 里明明有信息，却被丢弃，程序继续装作成功
2. 更糟的是打开失败时 `f` 是 nil，`f.Close()` 会 panic（nil 指针，3.4 的老朋友）

修复：老老实实判 err，失败就提前 return：

```go
f, err := os.Open("ghost.txt")
if err != nil {
    fmt.Println("打开失败：", err)
    return
}
defer f.Close()
fmt.Println("打开成功")
```

</details>

---

error 讲完，Go 日常开发的核心语法只剩最后一块：当"不同类型的相同逻辑"重复出现时怎么办？下一节：[4.4 泛型入门](04-generics.md)
