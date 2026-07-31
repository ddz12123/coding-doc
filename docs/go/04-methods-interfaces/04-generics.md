# 04 泛型入门

> 本节目标：看懂并会写基本的泛型代码。泛型是 Go 1.18（2022 年）加入的特性，新手了解基础即可。

## 一、泛型解决什么问题？

想写一个"返回两数中较大者"的函数。没有泛型时：

```go
func maxInt(a, b int) int {
    if a > b { return a }
    return b
}

func maxFloat(a, b float64) float64 {
    if a > b { return a }
    return b
}

// 每种类型写一遍？？逻辑明明一模一样！
```

**泛型 = 让函数/类型可以对"类型"参数化**，一份代码适配多种类型。

## 二、第一个泛型函数

```go
package main

import "fmt"

// [T int | float64] 声明类型参数 T：T 可以是 int 或 float64
func Max[T int | float64](a, b T) T {
    if a > b {
        return a
    }
    return b
}

func main() {
    fmt.Println(Max(3, 5))         // 8 行的 int 版本 —— T 被推断为 int
    fmt.Println(Max(2.5, 1.8))     // float64 版本 —— T 被推断为 float64
    // fmt.Println(Max(3, 2.5))    // ❌ 报错：a、b 必须是同一类型
}
```

语法拆解：

- `[T int | float64]`：方括号里声明**类型参数** `T`，`int | float64` 是**类型约束**（T 只能是这两种之一）
- 调用时不用写类型，Go 自动**推断**（也可以显式写 `Max[int](3, 5)`）

## 三、类型约束

约束限定了 T 能是哪些类型。常用的几种写法：

```go
// 1. 联合：列举允许的类型
func Sum[T int | int64 | float64](nums []T) T { ... }

// 2. any：任何类型都行（但函数内不能对 T 做比较、运算）
func First[T any](s []T) T {
    return s[0]
}

// 3. comparable：内置约束，允许用 == 和 != 的类型
func Contains[T comparable](s []T, target T) bool {
    for _, v := range s {
        if v == target {      // 能用 ==，因为约束是 comparable
            return true
        }
    }
    return false
}
```

约束也可以定义成接口复用：

```go
type Number interface {
    int | int64 | float64
}

func Sum[T Number](nums []T) T {
    var total T
    for _, n := range nums {
        total += n
    }
    return total
}

func main() {
    fmt.Println(Sum([]int{1, 2, 3}))          // 6
    fmt.Println(Sum([]float64{1.5, 2.5}))     // 4
}
```

> 标准库 `golang.org/x/exp/constraints` 提供了现成的 `constraints.Ordered`（所有可比大小的类型）等约束，需要时可以引入。

## 四、泛型类型：容器最典型

结构体也可以有类型参数。经典例子——栈：

```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 {
        var zero T                   // 类型参数的零值这样写
        return zero, false
    }
    last := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return last, true
}

func main() {
    var s Stack[string]              // 使用时指定具体类型
    s.Push("a")
    s.Push("b")
    v, _ := s.Pop()
    fmt.Println(v)                   // b

    var nums Stack[int]              // 同一份代码，int 版的栈
    nums.Push(42)
}
```

## 五、你已经在用泛型了

第三章用过的 `slices` 包就是泛型实现的：

```go
import "slices"

slices.Sort([]int{3, 1, 2})           // 能排 int
slices.Sort([]string{"b", "a"})       // 也能排 string —— 因为它是泛型函数
slices.Contains([]int{1, 2, 3}, 2)    // true
slices.Index([]string{"a", "b"}, "b") // 1
```

标准库 `maps`、`slices`、`cmp` 包都是泛型的实际应用，日常直接用它们就好。

## 六、新手使用建议

1. **优先当"使用者"**：熟练使用 `slices`、`maps` 等泛型库，比自己写泛型更重要
2. **别急着到处泛型化**：只有当你真的复制粘贴了同一段逻辑给不同类型时，才考虑泛型
3. **具体类型能解决就用具体类型**：泛型是工具不是目标，Go 社区推崇简单直白

---

## 练习

1. 写泛型函数 `Reverse[T any](s []T) []T`，返回逆序的新切片，用 `[]int` 和 `[]string` 各测一次。
2. 写泛型函数 `Keys[K comparable, V any](m map[K]V) []K`，返回 map 的所有键。
3. 用本节的 `Stack[T]`，创建一个 `Stack[float64]` 并测试 Push/Pop，包括对空栈 Pop 的处理。

---

🎉 第四章完成！方法 + 接口 + 错误处理是 Go 编程范式的核心，你已经掌握了。

下一章进入 Go 最激动人心的部分——并发：[第五章 01 goroutine](../05-concurrency/01-goroutines.md)
