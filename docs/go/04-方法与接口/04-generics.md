# 4.4 泛型入门

> 本节目标：看懂并会写基本的泛型代码。泛型是 Go 1.18（2022 年）才加入的特性，新手掌握基础、会用标准库即可。

上一节结尾的问题：**不同类型的相同逻辑重复出现怎么办**？这是 Go 社区吵了十年的话题，答案在 2022 年落地——泛型。

## 一、为什么需要泛型

写个"返回两数中较大者"的函数。int 版三分钟搞定：

```go
func maxInt(a, b int) int {
    if a > b {
        return a
    }
    return b
}
```

第二天要比 float64，静态类型不通融（2.1 讲的老规矩），只能再抄一遍：

```go
func maxFloat(a, b float64) float64 {
    if a > b {
        return a
    }
    return b
}
// 后天要比 int64…… 逻辑一个字没变，函数越抄越多
```

有人会想：用上一节的 any 呗？`func max(a, b any) any`——不行，any 里的值不能直接 `>` 比较（4.2 讲过，装进 any 就"失忆"），得类型断言拆开挨个处理，比抄函数还惨。

我们想要的是：**逻辑写一遍，类型留个空，用的时候再填**。这就是**泛型（generics）**——把"类型"也变成参数。

## 二、第一个泛型函数

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

拆解语法，和普通函数只差方括号那段：

```
func  Max [T int | float64] (a, b T)  T  {
       ↑        ↑                ↑     ↑
     函数名   类型参数声明       参数用 T  返回值也是 T
              T 是"类型的占位符"
              int | float64 是约束：T 只能是这两种之一
```

两个要点：

- **调用时不用写类型**：`Max(3, 5)` 里 Go 从实参自动**推断** T 是 int（也可以显式写 `Max[int](3, 5)`，很少需要）
- **T 一旦确定，所有 T 必须一致**：`Max(3, 2.5)` 报错 `default type float64 ... does not match`——a 推出 int、b 推出 float64，打架了

## 三、类型约束：T 不能无法无天

方括号里 T 后面那部分叫**约束（constraint）**，规定 T 的取值范围。为什么必须有约束？看这个反例：

```go
func Max[T any](a, b T) T {
    if a > b {        // ❌ 编译错误：T 可能是切片、结构体…… 它们不支持 >
        return a
    }
    return b
}
```

编译器的逻辑很硬：**函数体里对 T 做的每个操作，约束里的所有类型都必须支持**。想用 `>`，就得把 T 限制在能比大小的类型里。三种常用约束从松到紧：

```go
// 1. any：啥类型都行——代价是函数体里几乎啥也不能干（存取、返回可以）
func First[T any](s []T) T {
    return s[0]
}

// 2. comparable：内置约束，能用 == 和 != 的类型
func Contains[T comparable](s []T, target T) bool {
    for _, v := range s {
        if v == target {     // 约束保证了 == 可用
            return true
        }
    }
    return false
}

// 3. 联合（union）：自己列清单，最精确
func Sum[T int | int64 | float64](nums []T) T { ... }
```

### 约束就是接口

类型清单写长了碍眼，可以定义成接口复用——没错，**约束的本质就是接口**，上一节的知识无缝衔接：

```go
type Number interface {
    int | int64 | float64      // 接口的新玩法：不列方法，列类型
}

func Sum[T Number](nums []T) T {
    var total T                // 类型参数的零值：var 声明即可（零值哲学处处通用）
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

> 💡 官方扩展库 `golang.org/x/exp/constraints` 提供了现成约束，最常用的是 `constraints.Ordered`（一切能比大小的类型：全部整数、浮点数、字符串）。写 Max 这类函数直接用它，别自己列清单。

## 四、泛型类型：容器的最佳拍档

结构体也能带类型参数，最典型的应用是**容器**。写一个栈（后进先出，像摞盘子）：

```go
type Stack[T any] struct {
    items []T
}

func (s *Stack[T]) Push(item T) {          // 接收者也带 [T]
    s.items = append(s.items, item)
}

func (s *Stack[T]) Pop() (T, bool) {       // comma ok 模式又来了
    if len(s.items) == 0 {
        var zero T                          // 空栈：返回 T 的零值 + false
        return zero, false
    }
    last := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]      // 3.1 的切片截取
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

注意和泛型函数的区别：函数调用能推断类型，**泛型类型声明变量时必须显式写** `Stack[string]`——没有实参可供推断。

## 五、惊喜：你早就在用泛型了

第三章用过的 `slices` 包，全是泛型实现的：

```go
import "slices"

slices.Sort([]int{3, 1, 2})           // 能排 int
slices.Sort([]string{"b", "a"})       // 也能排 string —— 一份代码
slices.Contains([]int{1, 2, 3}, 2)    // true
slices.Index([]string{"a", "b"}, "b") // 1
```

看下 `slices.Contains` 的真实签名，和本节手写的几乎一样：

```go
func Contains[S ~[]E, E comparable](s S, v E) bool
```

标准库的 `slices`、`maps`、`cmp` 包都是泛型的工业级应用——**日常开发中，你用泛型库的时间远多于写泛型代码的时间**。

## 六、新手使用建议

1. **优先当使用者**：熟练用 `slices`、`maps`，比自己写泛型重要十倍
2. **复制粘贴两次以上再考虑泛型**：真的把同一段逻辑抄给了第二种类型，才是泛型出场的信号
3. **具体类型能解决就用具体类型**：`func Sum(nums []int) int` 如果项目里只有 int，就别泛型化——Go 社区推崇简单直白，泛型是工具不是炫技

## 报错速查表

| 报错 | 人话 | 解决 |
|------|------|------|
| `invalid operation: a > b (type parameter T is not comparable with >)` | 约束太松（如 any），撑不起函数体里的操作 | 收紧约束：用联合类型或 `constraints.Ordered` |
| `default type float64 of 2.5 does not match inferred type int for T` | 同一个 T 推断出了两种类型 | 实参类型统一，或显式转换 `Max(float64(3), 2.5)` |
| `cannot use generic type Stack[T any] without instantiation` | 声明泛型类型变量时没写具体类型 | `var s Stack[int]`，别只写 `Stack` |
| `int does not satisfy comparable` 之类 satisfy 报错 | 实参类型不在约束清单里 | 检查约束是否漏了这个类型 |

## 练习

**1. 动手**：写泛型函数 `Reverse[T any](s []T) []T`，返回逆序的**新**切片（提示：make 一个同长切片，倒着填），用 `[]int` 和 `[]string` 各测一次。

**2. 动手**：写泛型函数 `Keys[K comparable, V any](m map[K]V) []K`，返回 map 的所有键——这正是 3.2 "收集键"套路的泛型版。为什么 K 的约束必须是 comparable 而不能是 any？

<details>
<summary>点击看第二问答案</summary>

3.2 讲过：**map 的键必须是可比较类型**。如果 K 约束成 any，就允许传进"键为切片的 map"这种不存在的东西，编译器不干。`comparable` 正好和 map 对键的要求严丝合缝——事实上它就是为这类场景设计的。

</details>

**3. 猜输出**：先别运行，猜猜结果？

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
<summary>点击看答案</summary>

```
6
gogo
```

能编译！因为约束里的 int 和 string **都支持 `+`**（int 相加、string 拼接），函数体合法。T 是 int 时 `3+3=6`，是 string 时 `"go"+"go"="gogo"`——同一份代码，两种语义。如果约束里混进 `bool`（不支持 `+`），整个函数直接编译失败。

</details>

---

🎉 第四章完成！结构体存数据、方法绑行为、接口做抽象、error 管失败、泛型消重复——Go 的核心编程范式全部到手。

下一章进入 Go 最激动人心的招牌能力——并发：[5.1 goroutine：轻量级并发](../05-并发编程/01-goroutines.md)
