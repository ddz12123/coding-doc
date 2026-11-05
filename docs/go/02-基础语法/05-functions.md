# 2.5 函数

> 本节目标：掌握函数定义与调用、多返回值（Go 的招牌）、defer 延迟执行。

## 一、引入：为什么需要函数

程序里多个地方需要同一段逻辑时（比如"算两数中的较大值"），没有函数就得把同一段 if 抄多遍，改逻辑时改多处，漏一处就是 bug。**函数**：把一段逻辑打包起名，写一次到处用：

```go
package main

import "fmt"

// 计算两数之和
func add(a int, b int) int {
    return a + b
}

func main() {
    result := add(3, 5)
    fmt.Println(result)   // 8
}
```

前几章用过的 `main`、`fmt.Println` 都是函数，本节学的是**自己定义**。

## 二、函数定义：func

拆解：

```
func add(a int, b int) int {
↑    ↑  ↑              ↑
关键字 —— "我要定义一个函数"
     函数名 —— 别处调用时就用这个名字
        参数列表 —— 括号里写"名字 类型"，类型照样在名字后面
                       返回值类型 —— 计算结果是什么类型；没有就不写
}
```

读作：**定义一个叫 add 的函数：接收两个 int 参数，返回一个 int**。

常见变体：

| 写法 | 含义 |
|------|------|
| `func add(a, b int) int` | 连续参数同类型，类型只写一次 |
| `func sayHello(name string)` | 无返回值，返回值类型空着 |
| `func sayHi()` | 无参数 |

```go
func add(a, b int) int {
    return a + b
}

func sayHello(name string) {
    fmt.Println("你好，", name)
}

func sayHi() {
    fmt.Println("嗨")
}
```

⚠️ 有返回值类型的函数**必须保证每条路径都 return**，否则编译报错 `missing return`：

```go
func grade(score int) string {
    if score >= 60 {
        return "及格"
    }
    // ❌ missing return —— score < 60 时没有返回值
}
```

## 三、多返回值：Go 的招牌特性

返回值有两个及以上时，类型要**加括号**。拆解：

```
func divide(a, b int) (int, int) {
                      ↑     ↑
                      第一个返回值 —— 商；两个及以上要用括号包起来
                            第二个返回值 —— 余数
```

读作：**定义 divide，一次返回两个 int——商和余数**。调用侧必须用多变量接（正是 2.1 的多重赋值）：

| 接收写法 | 说明 |
|---------|------|
| `q, r := divide(17, 5)` | ✅ 全部接收 |
| `q, _ := divide(17, 5)` | ✅ 用 `_` 扔掉不要的 |
| `q := divide(17, 5)` | ❌ `assignment mismatch: 1 variable but divide returns 2 values` |

```go
// 同时返回商和余数
func divide(a, b int) (int, int) {
    return a / b, a % b
}

func main() {
    quotient, remainder := divide(17, 5)
    fmt.Println(quotient, remainder)   // 3 2
}
```

多返回值必须**全部接收**，不要的用 `_` 扔。

## 四、错误处理模式：(结果, error)

Go 的惯例：**函数可能失败时，最后一个返回值放 error**：

```go
func f() (T, error) {
    if 出错 {
        return 零值, fmt.Errorf("错误说明")   // 出错：结果给零值，错误说明白
    }
    return 结果, nil                          // 成功：nil 表示"没有错误"
}

result, err := f()
if err != nil {
    // 处理错误
}
```

调用侧拆解——一次接住"结果"和"错误"：

```
result, err := divide(10, 0)
↑       ↑
结果 —— 出错时按惯例给零值
        错误信息 —— 一切正常时是 nil（表示"没有错误"）
```

读作：**同时接住结果和错误，先检查 err，再用 result**。

2.2 的 `strconv.Atoi("456")` 返回两个值，就是这个设计：

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("除数不能为零")   // 出错：结果给零值，错误说明白
    }
    return a / b, nil                         // 成功：nil 表示"没有错误"
}

func main() {
    result, err := divide(10, 0)
    if err != nil {
        fmt.Println("出错了：", err)
        return
    }
    fmt.Println("结果：", result)
}
```

`if err != nil` 是 Go 代码里出现频率最高的模板，第四章专门深挖，现阶段按此模板使用。

## 五、命名返回值（了解即可）

返回值可以起名字，函数内直接当变量用，`return` 可以裸写：

```go
func divide(a, b int) (q, r int) {
    q = a / b
    r = a % b
    return          // 自动返回 q 和 r
}
```

短函数里偶尔见到。建议使用普通返回值，`return` 后面写清楚返回什么，更直观。

## 六、可变参数

参数个数不定的函数，用 `...` 声明。拆解：

```
func sum(nums ...int) int {
              ↑  ↑
              三个点 —— 数量不限，调用时传几个装几个
                 参数类型 —— nums 在函数内就是一个 int 切片（下一章的主角）
```

读作：**定义 sum，想传几个 int 都行**——参数在函数内装成一个切片。

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {   // nums 在函数内就是一个切片（下一章的主角）
        total += n
    }
    return total
}

func main() {
    fmt.Println(sum(1, 2))          // 3
    fmt.Println(sum(1, 2, 3, 4))    // 10

    s := []int{1, 2, 3}
    fmt.Println(sum(s...))          // 6 —— 切片加 ... 展开传入
}
```

`fmt.Println("a", 1, true)` 能接收任意个参数，就是可变参数；已有切片传入时加 `...` 展开（`f(s...)`）。

## 七、Go 没有的两样东西

| 其他语言有 | Go 的情况 |
|-----------|----------|
| 函数重载（同名不同参数） | ❌ 同一个包里函数名不能重复，`add` 之外只能另起名如 `addFloat` |
| 默认参数 `f(x int = 10)` | ❌ 没有，要么多写一个函数，要么调用方传全参数 |

目的是让"这个调用到底执行了哪个函数"毫无悬念。

## 八、函数是"一等公民"

函数和普通值一样：能赋给变量、能当参数传、能当返回值。

```go
// 赋值给变量（func 后没有名字 = 匿名函数）
double := func(x int) int {
    return x * 2
}
fmt.Println(double(5))   // 10

// 函数当参数：对切片每个元素做某种加工
func apply(nums []int, f func(int) int) []int {
    result := []int{}
    for _, n := range nums {
        result = append(result, f(n))
    }
    return result
}

fmt.Println(apply([]int{1, 2, 3}, double))   // [2 4 6]
```

入门阶段能看懂即可，第五章并发编程里匿名函数会大量出场。

## 九、defer：延迟到函数返回前

拆解：

```
defer fmt.Println("收尾工作")
↑
关键字 —— 这句现在只登记、不执行，函数即将返回时才执行
```

读作：**把这行登记到"离开前必办"清单上，函数 return 前才执行**。

```go
func main() {
    defer fmt.Println("我最后执行")
    fmt.Println("我先执行")
}
// 我先执行
// 我最后执行
```

**规则 1：多个 defer 后进先出**（像叠盘子，最后放上去的最先被拿走）：

```go
func main() {
    defer fmt.Println(1)   // 第 1 个登记 —— 最后执行
    defer fmt.Println(2)   // 第 2 个登记
    defer fmt.Println(3)   // 第 3 个登记 —— 最先执行
}
// 3 2 1
```

**规则 2：defer 的参数在声明那一刻就"拍照"定格**：

```go
func main() {
    x := 1
    defer fmt.Println("defer 看到的 x =", x)   // 此刻 x=1 被记下
    x = 100
    fmt.Println("现在 x =", x)
}
// 现在 x = 100
// defer 看到的 x = 1     ← 不是 100
```

defer 推迟的是**执行**，不推迟**参数求值**。这是常见的面试考点，也是实际 bug 来源。

### 为什么需要 defer

打开的文件要关、加的锁要解、连接要断。收尾动作写在函数结尾的话，**中途任何一个 return 都会跳过它们**；defer 把"打开"和"关闭"写在相邻两行，之后无论函数从哪条路 return，收尾都保证执行：

```go
// 需要 import "os"
func readFile() error {
    f, err := os.Open("data.txt")
    if err != nil {
        return err
    }
    defer f.Close()   // 打开成功后立刻 defer，永不忘关

    // ...中间随便怎么 return，文件都会被关掉...
    return nil
}
```

**"拿到资源，下一行就 defer 释放"**——Go 的推荐习惯。

## 十、作用域与变量遮蔽

- 函数内的变量只活在函数内；`{}` 块内的只活在块内
- 内层能读外层变量；**同名时内层遮蔽外层**——小心在 if/for 里用 `:=` 意外新建了同名变量：

```go
count := 0
if true {
    count := 10        // ⚠️ := 新建了一个内层 count，外层的没动！
    count++
}
fmt.Println(count)     // 0，不是 11 —— 不报错的错
```

想改外层变量，内层用 `=` 不要用 `:=`。

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `missing return` | 有返回值类型的函数存在没 return 的路径 | 每条路径都补返回值 |
| `assignment mismatch: 1 variable but f returns 2 values` | 多返回值必须全接收 | 不要的用 `_` |
| `xxx redeclared in this block` | 同名函数写了两个——Go 没有重载 | 换函数名 |
| `not enough arguments in call` | Go 没有默认参数，参数一个都不能少 | 调用时传全参数 |
| 内层改了变量外层没变 | `:=` 在内层块新建了同名变量 | 内层改用 `=` |
| defer 打印的是旧值 | defer 参数在声明时就定格了 | 需要最新值就不要依赖 defer 参数 |

## 练习

**1. 动手**：写函数 `max(a, b int) int` 返回较大值；再写 `minMax(nums []int) (int, int)` 同时返回最小值和最大值。

**2. 动手**：写函数 `safeDivide(a, b float64) (float64, error)`，除数为零时返回错误，在 main 里用 `if err != nil` 模板处理。

**3. 猜输出**：先别运行，写出打印顺序和内容。

```go
func main() {
    for i := 0; i < 3; i++ {
        defer fmt.Println(i)
    }
    fmt.Println("main 结束")
}
```

**4. 修 bug**：下面的代码有 2 处编译错误和 1 处逻辑问题：

```go
func grade(score int) string {
    if score >= 60 {
        return "及格"
    }
}

func main() {
    result := divide(10, 2)
    fmt.Println(grade(59), result)
}

func divide(a, b int) (int, int) {
    return a / b, a % b
}
```

<details>
<summary>点击查看答案</summary>

**1.**

```go
func max(a, b int) int {
    if a > b {
        return a
    }
    return b
}

func minMax(nums []int) (int, int) {
    min, max := nums[0], nums[0]
    for _, n := range nums {
        if n < min {
            min = n
        }
        if n > max {
            max = n
        }
    }
    return min, max
}
```

**2.**

```go
func safeDivide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("除数不能为零")
    }
    return a / b, nil
}

func main() {
    result, err := safeDivide(10, 0)
    if err != nil {
        fmt.Println("出错了：", err)
        return
    }
    fmt.Println(result)
}
```

**3. 输出：**

```
main 结束
2
1
0
```

defer 都攒到 main 返回前才执行，且后进先出；每个 defer 声明时的 i 值（0、1、2）被分别定格。

**4. 三处问题：**

```go
func grade(score int) string {
    if score >= 60 {
        return "及格"
    }
    return "不及格"          // ① missing return：补上 score < 60 的路径
}

func main() {
    result, r := divide(10, 2)   // ② divide 返回两个值，必须全接收（或用 _）
    fmt.Println(grade(59), result, r)
}
```

③ 逻辑问题（好习惯层面）：`grade(59)` 原本因缺 return 编译不过——编译器强制把每条路径都想清楚，这是 Go 与动态语言的重要差异。

</details>

## 本节小结

- `func 名(参数 类型) 返回值类型`，类型统统后置；每条路径都要 return
- **多返回值**是 Go 招牌：`(结果, error)` 模式 + `if err != nil` 模板，刻进肌肉
- 多返回值必须全接收，不要的用 `_`；没有重载、没有默认参数
- 可变参数 `...int`，传切片时 `s...` 展开
- **defer**：拿到资源下一行就 defer 释放；后进先出；参数声明时定格
- 小心内层 `:=` 遮蔽外层同名变量——不报错的错

第二章完成。下一章学真正实用的数据结构：[3.1 数组与切片](../03-复合数据类型/01-arrays-slices.md)
