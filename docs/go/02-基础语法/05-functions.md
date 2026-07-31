# 2.5 函数

> 本节目标：掌握函数定义与调用、多返回值（Go 的招牌）、defer 延迟执行。

## 一、为什么需要函数

假设程序里三个地方都要"算两数中的较大值"，没有函数就得把同一段 if 抄三遍——改逻辑时改三处，漏一处就是 bug。**函数**把一段逻辑打包起名，写一次到处用：

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

其实你已经用了一章的函数了——`main` 是函数，`fmt.Println` 也是函数。这一节学的是**自己造**。

## 二、函数定义拆解

```
func  add (a int, b int)  int  {
  ↑    ↑        ↑           ↑
关键字 函数名   参数列表    返回值类型
              (名字 类型)  (没有就不写)
```

还是那个 Go 味儿的顺序：**类型在名字后面**。三个变体：

```go
// 连续参数同类型，类型只写最后一次
func add(a, b int) int {
    return a + b
}

// 没有返回值：返回值类型空着
func sayHello(name string) {
    fmt.Println("你好，", name)
}

// 没有参数
func sayHi() {
    fmt.Println("嗨！")
}
```

> ⚠️ 有返回值类型的函数**必须保证每条路径都 return**，否则编译报错 `missing return`：
>
> ```go
> func grade(score int) string {
>     if score >= 60 {
>         return "及格"
>     }
>     // ❌ missing return —— score < 60 时没有返回值
> }
> ```

## 三、多返回值：Go 的招牌特性

大多数语言函数只能返回一个值，Go 可以返回**多个**——这不是炫技，它支撑了 Go 整个错误处理体系。

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

注意返回值类型有两个时要**加括号** `(int, int)`。

### 多返回值最重要的应用：把错误交出来

回忆 2.2 的 `strconv.Atoi("456")` 返回两个值——现在你能看懂它的设计了。Go 的惯例是：**函数可能失败时，最后一个返回值放 error**：

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

`if err != nil` 是 Go 代码里出现频率最高的三个词，第四章专门深挖，现在把这个模板刻进手指。

### 接收规则

多返回值必须**全部接收**，不要的用 `_` 扔：

```go
q, r := divide(17, 5)      // ✅ 全接收
q, _ := divide(17, 5)      // ✅ 只要商
q := divide(17, 5)         // ❌ assignment mismatch: 1 variable but divide returns 2 values
```

## 四、命名返回值（认识即可）

返回值可以起名字，函数内直接当变量用，`return` 可以裸写：

```go
func divide(a, b int) (q, r int) {
    q = a / b
    r = a % b
    return          // 自动返回 q 和 r
}
```

短函数里偶尔见到。新手写代码**建议用普通返回值**，`return` 后面写清楚返回什么，更直观。

## 五、可变参数

参数类型前加 `...`，调用时想传几个传几个：

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
    fmt.Println(sum(s...))          // 6 —— 已有切片要加 ... 展开传入
}
```

你早就在用它了——`fmt.Println("a", 1, true)` 能塞任意个参数，就是可变参数。

## 六、Go 没有的两样东西（其他语言转来的注意）

| 其他语言有 | Go 的情况 |
|-----------|----------|
| 函数重载（同名不同参数） | ❌ 同一个包里函数名不能重复，`add` 完了就叫 `addFloat` |
| 默认参数 `f(x int = 10)` | ❌ 没有，要么多写一个函数，要么调用方老实传 |

还是那句话：Go 宁可笨一点，也要让"这个调用到底执行了哪个函数"毫无悬念。

## 七、函数是"一等公民"

函数在 Go 里和普通值一样：能赋给变量、能当参数传、能当返回值：

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

新手阶段能看懂就行，第五章并发编程里匿名函数会大量出场。

## 八、defer：延迟到最后执行

`defer` 是 Go 独有的好东西：它后面的调用**推迟到函数即将返回时**才执行：

```go
func main() {
    defer fmt.Println("我最后执行")
    fmt.Println("我先执行")
}
// 我先执行
// 我最后执行
```

### 它解决什么真实问题？——"忘了收尾"

打开的文件要关、加的锁要解、连接要断。这些收尾动作写在函数结尾的话，**中途任何一个 return 都会跳过它们**。defer 让你"打开"和"关闭"写在相邻两行，之后无论函数从哪条路 return，收尾都保证执行：

```go
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

**"拿到资源，下一行就 defer 释放"**——Go 的黄金习惯。

### 两条 defer 规则

**规则 1：多个 defer 后进先出**（像叠盘子）：

```go
func main() {
    defer fmt.Println(1)
    defer fmt.Println(2)
    defer fmt.Println(3)
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
// defer 看到的 x = 1     ← 不是 100！
```

defer 推迟的是**执行**，不推迟**参数求值**。这是面试高频题，也是实际 bug 来源。

## 九、作用域提醒

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

想改外层变量，内层用 `=` 别用 `:=`。

## 本节报错速查表

| 报错/现象 | 人话翻译 |
|------|----------|
| `missing return` | 有返回值类型的函数存在没 return 的路径 |
| `assignment mismatch: 1 variable but f returns 2 values` | 多返回值必须全接收，不要的用 `_` |
| `xxx redeclared in this block` | 同名函数写了两个——Go 没有重载 |
| `not enough arguments in call` | Go 没有默认参数，参数一个都不能少 |
| 内层改了变量外层没变 | `:=` 在内层块新建了同名变量，改用 `=` |
| defer 打印的是旧值 | defer 参数在声明时就定格了 |

## 练习

**1. 动手**：写函数 `max(a, b int) int` 返回较大值；再写 `minMax(nums []int) (int, int)` 同时返回最小值和最大值。

**2. 动手**：写函数 `safeDivide(a, b float64) (float64, error)`，除数为零时返回错误，在 main 里用 `if err != nil` 模板处理。

**3. 猜输出**：先别运行，猜猜打印顺序和内容：

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

```go
// 1
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

// 2
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

③ 逻辑问题（好习惯层面）：`grade(59)` 原本会因缺 return 编译不过——**Go 用编译器逼你把每条路都想清楚**，这正是它和动态语言最大的脾气差异。

</details>

## 本节小结

- `func 名(参数 类型) 返回值类型`，类型统统后置；每条路径都要 return
- **多返回值**是 Go 招牌：`(结果, error)` 模式 + `if err != nil` 模板，刻进肌肉
- 多返回值必须全接收，不要的用 `_`；没有重载、没有默认参数
- 可变参数 `...int`，传切片时 `s...` 展开
- **defer**：拿到资源下一行就 defer 释放；后进先出；参数声明时定格
- 小心内层 `:=` 遮蔽外层同名变量——不报错的错

🎉 第二章完成！下一章学真正实用的数据结构：[3.1 数组与切片](../03-复合数据类型/01-arrays-slices.md)
