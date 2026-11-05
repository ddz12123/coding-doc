# 4.4 泛型入门

> 本节目标：看懂并会写基本的泛型代码。泛型是 Go 1.18（2022 年）才加入的特性，新手掌握基础、会用标准库即可。

## 一、引入：同一个函数抄了三遍

写"返回两数中较大者"，每种类型都得抄一遍：

```go
func maxInt(a, b int) int {
    if a > b {
        return a
    }
    return b
}

func maxFloat(a, b float64) float64 {    // 逻辑一个字没变，又抄一遍
    if a > b {
        return a
    }
    return b
}
// 后天要比 int64……函数越抄越多
```

用 any 不行：`func max(a, b any) any` 里的值不能直接 `>` 比较（4.2 讲过，装进 any 就"失忆"），得逐个类型断言，比抄函数还繁琐。

**泛型（generics）** 解决这个重复：**逻辑写一遍，类型留个空，用的时候再填**——把"类型"也变成参数。

## 二、泛型函数：把类型变成参数

```
func Max[T int | float64](a, b T) T {
         ↑               ↑        ↑
         类型参数声明 —— T 是"类型的占位符"；int | float64 是约束，限定 T 只能二选一
                         参数 (a, b T) —— 类型都写成 T，调用时才确定
                                 返回值 T —— 也是占位符，和参数是同一个类型
}
```

读作：**定义泛型函数 Max，T 是类型占位符，只能在 int 和 float64 里选；两个参数和返回值都是 T**。

```go
package main

import "fmt"

func Max[T int | float64](a, b T) T {
    if a > b {
        return a
    }
    return b
}

func main() {
    fmt.Println(Max(3, 5))         // 5   —— T 被推断为 int
    fmt.Println(Max(2.5, 1.8))     // 2.5 —— T 被推断为 float64
}
```

两个要点：

- **调用时不用写类型**：`Max(3, 5)` 里 Go 从实参自动**推断** T 是 int（也可以显式写 `Max[int](3, 5)`，很少需要）
- **T 一旦确定，所有 T 必须一致**：`Max(3, 2.5)` 报错 `default type float64 ... does not match`——a 推出 int、b 推出 float64，冲突了

## 三、类型约束：T 不能无法无天

方括号里 T 后面那部分叫**约束（constraint）**，规定 T 的取值范围——说人话：约束就是"T 的准入名单"。三种常用约束从松到紧：

| 约束 | 含义 | 函数体里 T 能干什么 |
|------|------|------|
| `any` | 任何类型都行 | 只能存取、返回——不知道类型，别的都干不了 |
| `comparable` | 内置约束，能用 `==` 和 `!=` 的类型 | 能比较相等 |
| 联合（union） | 自己列类型清单，如 `int \| int64 \| float64`，最精确 | 清单里所有类型都支持的操作 |

为什么必须有约束——反例：

```go
func Max[T any](a, b T) T {
    if a > b {        // ❌ 编译错误：T 可能是切片、结构体…… 它们不支持 >
        return a
    }
    return b
}
```

编译器的规则：**函数体里对 T 做的每个操作，约束里的所有类型都必须支持。**

```go
// 1. any：啥类型都行
func First[T any](s []T) T {
    return s[0]
}

// 2. comparable：能用 == 和 != 的类型
func Contains[T comparable](s []T, target T) bool {
    for _, v := range s {
        if v == target {     // 约束保证了 == 可用
            return true
        }
    }
    return false
}

// 3. 联合：自己列清单，最精确
func Sum[T int | int64 | float64](nums []T) T { ... }
```

类型清单写长了，可以定义成接口复用——**约束的本质就是接口**（接口的新玩法：不列方法，列类型）：

```go
type Number interface {
    int | int64 | float64      // 列类型，不列方法
}

func Sum[T Number](nums []T) T {
    var total T                // 类型参数的零值：var 声明即可
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

官方扩展库 `golang.org/x/exp/constraints` 提供现成约束，最常用的是 `constraints.Ordered`（一切能比大小的类型：全部整数、浮点数、字符串）。写 Max 这类函数直接用它，别自己列清单。

## 四、泛型类型：容器的最佳拍档

结构体也能带类型参数，最典型的应用是**容器**：

```
type Stack[T any] struct { ... }           ← 泛型类型：结构体名后面也带 [T]
func (s *Stack[T]) Push(item T) { ... }    ← 方法的接收者和参数都跟着带 [T]
```

读作：定义一个"缺一个类型"的 Stack，用的时候再填——`Stack[string]` 和 `Stack[int]` 是两种不同的类型。

写一个栈（后进先出）：

```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {          // 接收者也带 [T]
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {       // comma ok 模式
    if len(s.items) == 0 {
        var zero T                          // 空栈：返回 T 的零值 + false
        return zero, false
    }
    last := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]      // 切片截取（3.1 讲过）
    return last, true
}

func main() {
    var s Stack[string]           // 使用泛型类型必须写明具体类型
    s.Push("a")
    s.Push("b")
    v, _ := s.Pop()
    fmt.Println(v)                // b —— 后进先出

    var nums Stack[int]           // 同一份代码，int 版的栈
    nums.Push(42)
}
```

注意一处不同：泛型函数调用能推断类型，**泛型类型声明变量时必须显式写** `Stack[string]`——没有实参可供推断。

## 五、标准库中的泛型

第三章用过的 `slices` 包，全是泛型实现的：

```go
import "slices"

slices.Sort([]int{3, 1, 2})           // 能排 int
slices.Sort([]string{"b", "a"})       // 也能排 string —— 一份代码
slices.Contains([]int{1, 2, 3}, 2)    // true
slices.Index([]string{"a", "b"}, "b") // 1
```

`slices.Contains` 的真实签名，和本节手写的几乎一样：

```go
func Contains[S ~[]E, E comparable](s S, v E) bool
```

这里有两个类型参数：E 是元素类型，S 是"底层为 E 切片"的类型（`~[]E` 的 `~` 表示"底层类型是 []E 的都算"）。标准库的 `slices`、`maps`、`cmp` 包都是泛型的工业级应用——**日常开发中，用泛型库的时间远多于写泛型代码的时间**。

## 六、新手使用建议

1. **优先当使用者**：熟练用 `slices`、`maps`，比自己写泛型重要十倍
2. **复制粘贴两次以上再考虑泛型**：真的把同一段逻辑抄给了第二种类型，才是泛型出场的信号
3. **具体类型能解决就用具体类型**：`func Sum(nums []int) int` 如果项目里只有 int，就别泛型化——Go 社区推崇简单直白，泛型是工具不是炫技

## 七、常用写法速查

| 需求 | 写法 |
|------|------|
| 泛型函数 | `func Max[T int \| float64](a, b T) T` |
| 多个类型参数 | `func Keys[K comparable, V any](m map[K]V) []K` |
| 任意类型约束 | `[T any]` |
| 可比较约束 | `[T comparable]` |
| 自定义约束接口 | `type Number interface { int \| int64 \| float64 }` |
| 泛型类型 | `type Stack[T any] struct { items []T }` |

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `invalid operation: a > b (type parameter T is not comparable with >)` | 约束太松（如 any），撑不起函数体里的操作 | 收紧约束：用联合类型或 `constraints.Ordered` |
| `default type float64 of 2.5 does not match inferred type int for T` | 同一个 T 推断出了两种类型 | 实参类型统一，或显式转换 `Max(float64(3), 2.5)` |
| `cannot use generic type Stack[T any] without instantiation` | 声明泛型类型变量时没写具体类型 | `var s Stack[int]`，别只写 `Stack` |
| `int does not satisfy comparable` 之类 satisfy 报错 | 实参类型不在约束清单里 | 检查约束是否漏了这个类型 |

## 练习

**1. 动手**：写泛型函数 `Reverse[T any](s []T) []T`，返回逆序的**新**切片（提示：make 一个同长切片，倒着填），用 `[]int` 和 `[]string` 各测一次。

**2. 动手**：写泛型函数 `Keys[K comparable, V any](m map[K]V) []K`，返回 map 的所有键——这是 3.2 "收集键"套路的泛型版。为什么 K 的约束必须是 comparable 而不能是 any？

<details>
<summary>点击查看答案</summary>

3.2 讲过：**map 的键必须是可比较类型**。如果 K 约束成 any，就允许传进"键为切片的 map"这种不存在的东西，编译器不答应。`comparable` 正好和 map 对键的要求严丝合缝——事实上它就是为这类场景设计的。

</details>

**3. 猜输出**：先别运行，判断结果。

```go
func Double[T int | string](v T) T {
    return v + v
}

func main() {
    fmt.Println(Double(3))
    fmt.Println(Double("go"))
}
```

<details>
<summary>点击查看答案</summary>

```
6
gogo
```

能编译！因为约束里的 int 和 string **都支持 `+`**（int 相加、string 拼接），函数体合法。T 是 int 时 `3+3=6`，是 string 时 `"go"+"go"="gogo"`——同一份代码，两种语义。如果约束里混进 `bool`（不支持 `+`），整个函数直接编译失败。

</details>

## 本节小结

- 泛型 = **把类型变成参数**：`func Max[T int | float64](a, b T) T`，逻辑写一遍，类型用的时候再填
- 约束限定 T 的能力：`any`、`comparable`、联合类型；**约束的本质是接口**，类型清单可用接口复用
- 泛型类型用于容器：`type Stack[T any] struct`，声明变量时必须写明具体类型
- 优先用标准库泛型包（`slices`、`maps`、`cmp`）；复制粘贴两次以上再考虑自己写泛型

第四章完成：结构体存数据、方法绑行为、接口做抽象、error 管失败、泛型消重复——Go 的核心编程范式全部到手。

下一章：[5.1 goroutine：轻量级并发](../05-并发编程/01-goroutines.md)
