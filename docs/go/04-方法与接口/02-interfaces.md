# 4.2 接口

> 本节目标：理解 Go 接口的"隐式实现"，会用接口写出"一个函数处理多种类型"的代码。接口是 Go 设计中最精华的部分。

上一节结尾说方法是"面向对象"的三分之二，最后一块拼图就是接口。先看一个方法解决不了的问题。

## 一、为什么需要接口

用上一节的知识写个动物园：

```go
type Dog struct{ Name string }
type Cat struct{ Name string }

func (d Dog) Speak() string { return d.Name + "：汪汪！" }
func (c Cat) Speak() string { return c.Name + "：喵~" }
```

现在想写一个"让动物叫"的函数。参数类型写什么？

```go
func makeSound(d Dog) { fmt.Println(d.Speak()) }   // 只能收狗
// 猫呢？再写一个 makeSoundCat？加一种动物加一个函数？
```

Dog 和 Cat 明明**都会 `Speak()`**，但它们是两个类型，Go 的静态类型检查（2.1 讲的）不允许一个参数两头收。我们想对编译器说的其实是：

> "参数是什么类型我不在乎，**只要它有 `Speak() string` 方法**就行。"

这句话翻译成 Go 代码，就是**接口（interface）**：

```go
type Speaker interface {
    Speak() string      // 只写方法签名，没有方法体
}
```

拆解语法：

```
type  Speaker  interface {
 ↑       ↑         ↑
关键字  接口名   "接口"关键字（对比结构体的 struct）

    Speak() string    ← 方法签名：方法名 + 参数 + 返回值
}                        没有 func、没有接收者、没有大括号实现
```

结构体定义"有哪些**字段**"，接口定义"有哪些**方法**"。结构体描述"长什么样"，接口描述"**会干什么**"。

## 二、隐式实现：Go 接口的灵魂

关键问题：Dog 怎么"实现"Speaker？答案是——**什么都不用做，它已经实现了**：

```go
package main

import "fmt"

type Speaker interface {
    Speak() string
}

type Dog struct{ Name string }
type Cat struct{ Name string }

func (d Dog) Speak() string { return d.Name + "：汪汪！" }
func (c Cat) Speak() string { return c.Name + "：喵~" }

// 参数类型写接口：任何"会叫的"都能进来
func makeSound(s Speaker) {
    fmt.Println(s.Speak())
}

func main() {
    makeSound(Dog{Name: "旺财"})    // 旺财：汪汪！
    makeSound(Cat{Name: "咪咪"})    // 咪咪：喵~
}
```

Java/Python 出身的注意反差：Java 要写 `class Dog implements Speaker`，Go **没有 implements 关键字**。规则只有一条：

> **一个类型拥有接口要求的全部方法 → 它自动实现了这个接口。**

这叫**鸭子类型**："走起来像鸭子、叫起来像鸭子，那它就是鸭子"——不需要它出生时登记为鸭子。

隐式实现带来两个实际好处：

1. **可以让别人的类型实现你的接口**：对方的库代码一行不改，只要方法对得上
2. **先写具体类型、后抽接口**：不用一开始就设计好继承树，代码自然演进

## 三、接口变量：一个盒子，装各种实现者

接口也是类型，能声明变量。接口变量像个盒子，任何实现者都能装进去：

```go
var s Speaker           // 接口变量，零值是 nil

s = Dog{Name: "旺财"}   // 装狗
fmt.Println(s.Speak())  // 旺财：汪汪！

s = Cat{Name: "咪咪"}   // 换成猫，合法！
fmt.Println(s.Speak())  // 咪咪：喵~
```

`s.Speak()` 会调用**当前装的那个值**的方法——装狗时汪汪，装猫时喵。因为接口值内部记着两样东西：**(具体类型, 具体值)**，调用方法时按记录的类型去找。

最实用的形态是**接口切片**——3.1 说过切片元素必须同类型，接口让"不同类型"变成"同一个接口类型"：

```go
animals := []Speaker{
    Dog{Name: "旺财"},
    Cat{Name: "咪咪"},
}
for _, a := range animals {
    fmt.Println(a.Speak())     // 各叫各的
}
```

> ⚠️ **指针接收者的坑**（上一节"别混用"的雷在这爆）：如果 `Speak()` 定义成指针接收者 `func (d *Dog) Speak()`，那么只有 `*Dog` 实现了 Speaker，`Dog` 没有——`makeSound(Dog{...})` 会编译报错 `Dog does not implement Speaker`。**遇到 does not implement 报错，先试试把 `x` 换成 `&x`**。这也是"同一类型接收者要统一"的真正原因。

## 四、空接口 any：能装一切

一个方法都不要求的接口，所有类型都自动实现它——所以它能装任何值：

```go
var x any               // any 是 interface{} 的别名（Go 1.18+），推荐写 any

x = 42
x = "hello"
x = []int{1, 2, 3}      // 都合法
```

`fmt.Println` 为什么能打印任何东西？看它的签名就懂了：`func Println(a ...any)`。

> ⚠️ 装进 any 的值会"失忆"：原类型的方法、运算全用不了。`x = 42` 之后 `x + 1` 编译报错 `invalid operation`——编译器只知道 x 是 any，不知道里面是 int。想用，得先"取出来"。

## 五、类型断言：从接口里取回具体类型

```go
var x any = "hello"

s := x.(string)         // 断言：'我确定 x 里是 string，取出来'
fmt.Println(s + " world")
```

但如果断言错了：

```go
n := x.(int)            // ❌ panic: interface conversion:
                        //    interface {} is string, not int
```

所以永远用 **comma ok** 写法（3.2 map 的老朋友，同一个模式）：

```go
if n, ok := x.(int); ok {
    fmt.Println("是整数：", n)
} else {
    fmt.Println("不是整数")    // 走这里，n 是零值 0，不 panic
}
```

### type switch：多种类型分别处理

要挨个判断很多种类型时，有专用语法 `x.(type)`（只能出现在 switch 里）：

```go
func describe(x any) {
    switch v := x.(type) {
    case int:
        fmt.Println("整数，加倍是", v*2)      // 这个分支里 v 就是 int
    case string:
        fmt.Println("字符串，长度是", len(v))  // 这个分支里 v 是 string
    case []int:
        fmt.Println("int 切片，元素数", len(v))
    default:
        fmt.Printf("没见过的类型：%T\n", v)
    }
}
```

每个 case 分支里，`v` 自动变成对应的具体类型，直接用，不用再断言。

## 六、标准库中的著名接口

学会接口后，之前埋的几个"彩蛋"可以集中揭晓了：

### fmt.Stringer：Println 的秘密

```go
type Stringer interface {
    String() string
}
```

上一节银行账户的 `fmt.Println(acc)` 打印出人话，就是因为 fmt 内部做了类型断言："你实现 Stringer 了吗？实现了我就调你的 `String()`"。

### error：错误竟然也是接口

```go
type error interface {
    Error() string
}
```

从 2.5 用到现在的 `error`，真身就是个单方法接口——任何有 `Error() string` 方法的类型都能当错误用。下一节整节展开。

### io.Reader / io.Writer：IO 世界的通用插座

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}
```

文件、网络连接、内存缓冲区、压缩流……全都实现了 Reader。所以一个接收 `io.Reader` 的函数能处理**任何数据来源**——这是 Go 生态"万物皆可组合"的基石，现阶段混个脸熟即可。

## 七、接口设计的 Go 哲学

1. **接口要小**：标准库大量接口只有 1~2 个方法。方法越少，实现者越多，越通用
2. **先写具体类型，需要抽象时再提炼接口**：别一上来就为每个东西设计接口
3. **接受接口，返回结构体**：参数尽量收接口（灵活），返回值尽量给具体类型（明确）

新手判断标准就一条：**出现"多种类型要统一处理"的需求时才引入接口**，否则就是过度设计。

## 报错速查表

| 报错 | 人话 | 解决 |
|------|------|------|
| `Dog does not implement Speaker (missing method Speak)` | 方法没写全，或签名（参数/返回值）对不上 | 对照接口逐字检查方法签名 |
| `Dog does not implement Speaker (method Speak has pointer receiver)` | 方法是指针接收者，你传的是值 | 传 `&dog` 而不是 `dog` |
| `invalid operation: x + 1 (mismatched types any and int)` | any 里的值没取出来就运算 | 先类型断言 `x.(int)` |
| `panic: interface conversion: interface {} is string, not int` | 不带 ok 的断言猜错了类型 | 改用 `v, ok := x.(T)` |
| `use of .(type) outside type switch` | `x.(type)` 写在了 switch 外面 | 它只能配合 `switch` 使用 |

## 练习

**1. 动手**：定义接口 `Shape`（含 `Area() float64`），让上一节的 `Rectangle` 和新写的 `Circle`（字段 Radius，面积 3.14159×R²）都实现它；再写 `totalArea(shapes []Shape) float64` 计算总面积，用一个装了两种形状的切片验证。

**2. 猜输出**：先别运行，猜猜结果？

```go
type Speaker interface{ Speak() string }

type Robot struct{}

func (r *Robot) Speak() string { return "哔哔" }

func main() {
    var s Speaker = Robot{}
    fmt.Println(s.Speak())
}
```

<details>
<summary>点击看答案</summary>

**编译报错**：`Robot does not implement Speaker (method Speak has pointer receiver)`。

`Speak` 是指针接收者，所以只有 `*Robot` 实现了接口，值类型 `Robot` 没有。改成 `var s Speaker = &Robot{}` 就能通过，输出 `哔哔`。

</details>

**3. 修 bug**：下面的代码想统计 any 切片里所有整数之和，但编译不过：

```go
func sumInts(items []any) int {
    total := 0
    for _, item := range items {
        total += item        // ❌ 编译错误
    }
    return total
}
```

<details>
<summary>点击看答案</summary>

`item` 的类型是 any，不能直接参与 int 运算。要用 comma ok 断言取出，顺便跳过不是 int 的元素：

```go
func sumInts(items []any) int {
    total := 0
    for _, item := range items {
        if n, ok := item.(int); ok {
            total += n
        }
    }
    return total
}
```

</details>

**4. 思考题**：`var s Speaker = Dog{}` 之后又 `s = Cat{}`，`s.Speak()` 怎么知道该调谁的方法？

<details>
<summary>点击看答案</summary>

接口值内部存着一对信息：**(具体类型, 具体值)**。装 Dog 时是 `(Dog, Dog{...})`，装 Cat 后变成 `(Cat, Cat{...})`。调用 `s.Speak()` 时，Go 按记录的具体类型去找对应的方法——这个"运行时才决定调谁"的机制，就是其他语言说的"多态"。

</details>

---

接口三大件（隐式实现、类型断言、小接口哲学）到手。接下来兑现从 2.5 拖到现在的欠账——`error` 到底怎么用：[4.3 错误处理](03-error-handling.md)
