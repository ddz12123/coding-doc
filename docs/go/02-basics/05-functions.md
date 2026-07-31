# 05 函数

> 本节目标：掌握函数的定义与调用、多返回值（Go 特色）、defer 延迟执行。

## 一、函数的基本定义

```go
func 函数名(参数名 参数类型) 返回值类型 {
    // 函数体
    return 返回值
}
```

例子：

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

小技巧：连续多个参数类型相同时，可以只写一次类型：

```go
func add(a, b int) int {      // 等价于 (a int, b int)
    return a + b
}
```

没有返回值就不写返回值类型：

```go
func sayHello(name string) {
    fmt.Println("你好，", name)
}
```

## 二、多返回值：Go 的招牌特性

Go 函数可以返回**多个值**，这在很多语言里做不到：

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

### 多返回值最重要的应用：返回错误

Go 的惯例是**最后一个返回值放 error**，调用方检查它：

```go
func divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, fmt.Errorf("除数不能为零")
    }
    return a / b, nil    // nil 表示"没有错误"
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

`if err != nil` 是 Go 代码里出现频率最高的三个词，第四章会深入讲错误处理，现在先熟悉这个模式。

### 不需要的返回值用 `_` 丢弃

```go
quotient, _ := divide(17, 5)   // 只要商，不要余数
```

## 三、命名返回值（了解即可）

返回值可以起名字，函数内可以直接当变量用，`return` 可以不带参数：

```go
func divide(a, b int) (q, r int) {
    q = a / b
    r = a % b
    return          // 自动返回 q 和 r
}
```

短函数里偶尔见到，新手写代码时**建议还是用普通返回值**，更直观。

## 四、可变参数

参数类型前加 `...`，表示可以传任意个：

```go
func sum(nums ...int) int {
    total := 0
    for _, n := range nums {   // nums 在函数内就是一个切片
        total += n
    }
    return total
}

func main() {
    fmt.Println(sum(1, 2))          // 3
    fmt.Println(sum(1, 2, 3, 4))    // 10

    s := []int{1, 2, 3}
    fmt.Println(sum(s...))          // 切片展开传入：6
}
```

你早就用过它了——`fmt.Println` 就是可变参数函数。

## 五、函数是"一等公民"

函数可以赋值给变量、当参数传递、当返回值：

```go
// 把函数赋值给变量
double := func(x int) int {
    return x * 2
}
fmt.Println(double(5))   // 10

// 函数作为参数
func apply(nums []int, f func(int) int) []int {
    result := make([]int, 0, len(nums))
    for _, n := range nums {
        result = append(result, f(n))
    }
    return result
}

fmt.Println(apply([]int{1, 2, 3}, double))   // [2 4 6]
```

上面 `func(x int) int { ... }` 这种没有名字的函数叫**匿名函数**（闭包）。新手阶段能看懂即可，用多了自然就熟。

## 六、defer：延迟执行

`defer` 后面的语句会**推迟到函数即将返回时**才执行：

```go
func main() {
    defer fmt.Println("我最后执行")
    fmt.Println("我先执行")
}
// 输出：
// 我先执行
// 我最后执行
```

### defer 有什么用？——确保资源被释放

最典型场景：打开的文件一定要关闭。用 defer 把"打开"和"关闭"写在一起，永远不会忘：

```go
func readFile() error {
    f, err := os.Open("data.txt")
    if err != nil {
        return err
    }
    defer f.Close()   // 打开成功后立刻写 defer，函数无论从哪里 return 都会关闭文件

    // ...放心地读文件，不用惦记关闭的事...
    return nil
}
```

### 多个 defer：后进先出

```go
func main() {
    defer fmt.Println(1)
    defer fmt.Println(2)
    defer fmt.Println(3)
}
// 输出：3 2 1（像叠盘子，后放的先拿）
```

### defer 的参数在声明时就确定了

```go
func main() {
    x := 1
    defer fmt.Println("defer 看到的 x =", x)   // 此刻 x=1 被"拍照"记下
    x = 100
    fmt.Println("现在 x =", x)
}
// 输出：
// 现在 x = 100
// defer 看到的 x = 1     ← 不是 100！
```

## 七、作用域小知识

- 函数内声明的变量只在函数内有效
- `{}` 块内声明的变量只在块内有效
- 内层可以访问外层变量；同名时内层**遮蔽**外层（这是常见 bug 来源，注意别在 if 块里用 `:=` 意外新建了同名变量）

---

## 新手常见坑

1. **函数返回多个值时只接收一个** → 编译报错，要么全接收，要么用 `_` 占位
2. **忽略 error 返回值**：语法上允许 `result, _ := ...`，但请养成检查 err 的习惯
3. **Go 不支持函数重载**：同一个包里不能有两个同名函数（哪怕参数不同）
4. **Go 不支持默认参数**：没有 `func f(x int = 10)` 这种写法

---

## 练习

1. 写函数 `max(a, b int) int` 返回较大值。
2. 写函数 `minMax(nums []int) (int, int)` 同时返回切片中的最小值和最大值。
3. 写函数 `safeDivide(a, b float64) (float64, error)`，除数为零时返回错误，并在 main 里正确处理这个错误。
4. 猜测下面代码的输出，再运行验证：
   ```go
   func main() {
       for i := 0; i < 3; i++ {
           defer fmt.Println(i)
       }
   }
   ```

---

🎉 第二章完成！你已经掌握了 Go 的核心语法，能写出有逻辑的程序了。

下一章学习真正实用的数据结构：[第三章 01 数组与切片](../03-composite-types/01-arrays-slices.md)
