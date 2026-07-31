# 03 错误处理

> 本节目标：掌握 Go 的错误处理哲学与惯用写法，分清 error 和 panic。

## 一、Go 的错误处理哲学

很多语言用 `try/catch` 异常机制。**Go 没有异常**，它的选择是：

> **错误就是普通的值，像处理其他返回值一样处理它。**

函数把错误作为最后一个返回值交给你，你**必须显式面对它**——处理或者明确忽略。这让 Go 代码的错误路径清清楚楚，没有"隐形炸弹"。

## 二、基本模式：if err != nil

这是你会写一万遍的模式：

```go
result, err := doSomething()
if err != nil {
    // 处理错误：打印、返回、重试……
    return err
}
// 到这里说明没出错，放心用 result
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
    defer f.Close()
    fmt.Println("打开成功")
}
```

输出：

```
打开失败： open 不存在的文件.txt: The system cannot find the file specified.
```

## 三、error 是什么？就是个接口

```go
type error interface {
    Error() string
}
```

任何有 `Error() string` 方法的类型都是 error。`err != nil` 表示"有错误"，`nil` 表示"一切正常"。

## 四、创建错误

### 方式 1：errors.New（固定文本）

```go
import "errors"

var ErrNotFound = errors.New("找不到该记录")

func find(id int) error {
    if id <= 0 {
        return ErrNotFound
    }
    return nil
}
```

### 方式 2：fmt.Errorf（带格式化信息）

```go
func withdraw(balance, amount float64) error {
    if amount > balance {
        return fmt.Errorf("余额不足：余额 %.2f，取款 %.2f", balance, amount)
    }
    return nil
}
```

## 五、错误的传递与包装

多数时候，底层函数出错，你处理不了，就**加上下文往上传**：

```go
func loadConfig(path string) error {
    data, err := os.ReadFile(path)
    if err != nil {
        // %w 包装原错误（wrap），保留错误链
        return fmt.Errorf("读取配置文件失败: %w", err)
    }
    _ = data
    return nil
}
```

注意 `%w`（不是 `%v`）：它把原错误"包"进新错误里，形成错误链，上层还能用 `errors.Is` 检查链条里有没有特定错误：

```go
err := loadConfig("app.conf")
if errors.Is(err, os.ErrNotExist) {
    fmt.Println("配置文件不存在，使用默认配置")
}
```

新手阶段记住两条：

- 传递错误时用 `fmt.Errorf("干什么失败: %w", err)` 加上下文
- 判断"是不是某个特定错误"用 `errors.Is(err, 目标错误)`

## 六、panic：程序崩溃

`panic` 表示**不可恢复的严重问题**，程序会打印调用栈然后退出：

```go
panic("数据库配置丢失，无法启动")
```

你更多是"遇到" panic 而不是"使用"它。这些操作会触发 panic：

- 下标越界：`s[100]`
- 解引用 nil 指针
- 向 nil map 写入
- 整数除以 0
- 失败的类型断言 `x.(int)`（不带 ok 的形式）

### error 还是 panic？

| 情况 | 用什么 |
|------|-------|
| 文件不存在、网络超时、输入不合法……**预料之中**的失败 | error |
| 程序写错了（bug）、启动时缺少关键配置……**不该发生**的情况 | panic |

**原则：能用 error 就用 error。** 新手代码里几乎不应该主动写 panic。

## 七、recover：捕获 panic（了解即可）

`recover` 配合 `defer` 可以拦住 panic，让程序不崩：

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
    fmt.Println("程序还活着")    // 会执行到这里
}
```

实际用途：Web 服务器用它保证"一个请求崩了不影响整个服务"。新手阶段**看懂即可，不要在业务代码里滥用**——它不是 try/catch 的替代品。

## 八、错误处理的好习惯

1. **不要忽略错误**：`result, _ := f()` 只在你确定不关心时使用，且想清楚了再写
2. **错误信息小写开头、不带标点结尾**（官方规范），因为它常被包装进更长的句子
3. **要么处理，要么传递，不要两个都做**：既打印了又 return err，上层再打印一次，日志里同一个错误出现 N 遍
4. **提前返回，让主流程靠左**：

```go
// ✅ 推荐：错误处理完就 return，主逻辑不缩进
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

---

## 练习

1. 写函数 `parseAge(s string) (int, error)`：用 `strconv.Atoi` 转换字符串，失败时用 `%w` 包装错误返回；成功但数值不在 0~150 范围时返回自定义错误。在 main 中分别用 `"18"`、`"abc"`、`"999"` 测试。
2. 定义 `var ErrUserNotFound = errors.New("用户不存在")`，写一个模拟查询函数，在 main 中用 `errors.Is` 判断错误类型并给出友好提示。
3. 运行 `s := []int{1}; fmt.Println(s[5])`，观察 panic 输出的样子，学会阅读调用栈信息。

下一节：[04 泛型入门](04-generics.md)
