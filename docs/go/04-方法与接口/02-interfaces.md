# 4.2 接口

> 本节目标：理解 Go 接口的"隐式实现"，会用接口写出"一个函数处理多种类型"的代码。接口是 Go 设计中最精华的部分。

## 一、从一个问题开始：参数类型写什么

用上一节的方法写个动物园：

```go
type Dog struct{ Name string }
type Cat struct{ Name string }

func (d Dog) Speak() string { return d.Name + "：汪汪！" }
func (c Cat) Speak() string { return c.Name + "：喵~" }
```

想写一个"让动物叫"的函数，参数类型写什么？

```go
func makeSound(d Dog) { fmt.Println(d.Speak()) }   // 只能收狗
// 收猫只能再写 makeSoundCat，加一种动物加一个函数
```

Dog 和 Cat 明明**都会 `Speak()`**，但它们是两个类型，Go 的静态类型检查（2.1 讲的）不允许一个参数两头收。需要一种类型表达：**"参数是什么类型我不在乎，只要有 `Speak() string` 方法"**——这就是**接口（interface）**：只声明"要会哪些方法"的类型。

## 二、先看一个能跑的接口程序，再拆它的定义

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

一个函数收下两种类型，问题解决。回过头拆定义接口的那几行：

```
type Speaker interface {
     ↑       ↑
     接口名 —— 大写开头对外可见（2.1 讲过）
             interface —— 关键字，对比结构体的 struct

    Speak() string
    ↑
    方法签名 —— 只写"方法名(参数) 返回值"：没有 func、没有接收者、没有方法体
}
```

读作：**定义一个叫 Speaker 的接口，要求实现者必须有一个 Speak 方法、返回 string**。

- 结构体定义"有哪些**字段**"（长什么样），接口定义"有哪些**方法**"（会干什么）

## 三、隐式实现：Go 接口的灵魂

注意上面的代码里没有任何"我实现了 Speaker"的声明——**一个类型拥有接口要求的全部方法，它就自动实现了这个接口**。Go 没有 `implements` 关键字（对比 Java 要写 `class Dog implements Speaker`）。这叫**鸭子类型**：走起来像鸭子、叫起来像鸭子，那它就是鸭子——不需要出生时登记为鸭子。

隐式实现带来两个实际好处：

- **可以让别人的类型实现你的接口**：对方库代码一行不改，方法对得上就行
- **先写具体类型、后抽接口**：不用一开始设计继承树，代码自然演进

> ⚠️ **指针接收者的坑**：如果 `Speak()` 定义成 `func (d *Dog) Speak()`，那么只有 `*Dog` 实现了 Speaker，`Dog` 没有——`makeSound(Dog{...})` 会编译报错 `Dog does not implement Speaker`。**遇到 does not implement 报错，先试试把 `x` 换成 `&x`**。这也是上一节"同一类型接收者要统一"的真正原因。

## 四、接口变量：一个盒子，装各种实现者

接口也是类型，能声明变量；任何实现者都能装进去，还能换：

```
var s Speaker
    ↑ ↑
    ↑ Speaker —— 接口类型，"盒子规格"：装进来的东西必须会 Speak
    s —— 接口变量，一个盒子；零值是 nil（什么都没装）
```

读作：声明一个 Speaker 类型的变量 s，之后任何实现了 Speaker 的值都能赋给它。

```go
var s Speaker

s = Dog{Name: "旺财"}
fmt.Println(s.Speak())  // 旺财：汪汪！

s = Cat{Name: "咪咪"}    // 换装其他实现者，合法
fmt.Println(s.Speak())  // 咪咪：喵~
```

`s.Speak()` 调用的是**当前装的那个值**的方法：接口值内部记着 **(具体类型, 具体值)**，调用方法时按记录的类型去找。

最实用的形态是**接口切片**——3.1 讲过切片元素必须同类型，接口让"不同类型"统一成"同一个接口类型"：

```go
animals := []Speaker{
    Dog{Name: "旺财"},
    Cat{Name: "咪咪"},
}
for _, a := range animals {
    fmt.Println(a.Speak())     // 各叫各的
}
```

## 五、空接口 any：能装一切

一个方法都不要求的接口，所有类型都自动实现它——所以它能装任何值：

```
var x any       ← any 是 interface{} 的别名（Go 1.18+），推荐写 any
```

```go
var x any

x = 42
x = "hello"
x = []int{1, 2, 3}      // 都合法
```

`fmt.Println` 能打印任何东西，看签名就懂：`func Println(a ...any)`。

> ⚠️ 装进 any 的值会"失忆"：原类型的方法、运算全用不了。`x = 42` 之后 `x + 1` 编译报错 `invalid operation`——编译器只知道 x 是 any，不知道里面是 int。想用，先类型断言取出来（见 六）。

## 六、类型断言：从接口里取回具体类型

先拆解这个语法：

```
v, ok := x.(T)
↑  ↑     ↑  ↑
v —— 取出来的值，类型就是 T
   ok —— 猜对 true、猜错 false；不接收 ok，猜错直接 panic
         被断言的接口变量 —— 通常是个 any
            想取出的具体类型 —— "我确定 x 里装的就是 T"
```

读作：**从 x 里取出 T 类型的值，用 ok 告诉我猜没猜对**。

三种写法：

| 写法 | 含义 |
|------|------|
| `v := x.(T)` | 断言"我确定 x 里是 T"并取出；猜错则 **panic** |
| `v, ok := x.(T)` | comma ok 写法；猜错不 panic，ok 为 false（3.2 map 的同一模式） |
| `switch v := x.(type)` | 类型分支，一次分派多种类型；`x.(type)` 只能出现在 switch 里 |

断言成功与失败：

```go
var x any = "hello"

s := x.(string)         // 断言：x 里是 string，取出来
fmt.Println(s + " world")

n := x.(int)            // ❌ panic: interface conversion:
                        //    interface {} is string, not int
```

实际代码一律用 comma ok 写法：

```go
if n, ok := x.(int); ok {
    fmt.Println("是整数：", n)
} else {
    fmt.Println("不是整数")    // 走这里，n 是零值 0，不 panic
}
```

多种类型分别处理，用 type switch：

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

## 七、标准库中的著名接口

**fmt.Stringer**——`Println` 打印出人话的秘密：

```go
type Stringer interface {
    String() string
}
```

上一节银行账户的 `fmt.Println(acc)` 打印自定义文本，就是因为 fmt 内部做了类型断言：实现了 Stringer 就调用 `String()`。

**error**——错误竟然也是接口：

```go
type error interface {
    Error() string
}
```

从 2.5 用到现在的 `error`，真身就是个单方法接口——任何有 `Error() string` 方法的类型都能当错误用。下一节整节展开。

**io.Reader / io.Writer**——IO 世界的通用插座：

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}
```

文件、网络连接、内存缓冲区、压缩流……全都实现了 Reader。接收 `io.Reader` 的函数能处理**任何数据来源**——这是 Go 生态"万物皆可组合"的基石，现阶段了解即可。

## 八、接口设计的 Go 哲学

1. **接口要小**：标准库大量接口只有 1~2 个方法。方法越少，实现者越多，越通用
2. **先写具体类型，需要抽象时再提炼接口**：别一上来就为每个东西设计接口
3. **接受接口，返回结构体**：参数尽量收接口（灵活），返回值尽量给具体类型（明确）

新手判断标准就一条：**出现"多种类型要统一处理"的需求时才引入接口**，否则就是过度设计。

## 九、常用写法速查

| 需求 | 写法 |
|------|------|
| 定义接口 | `type Speaker interface { Speak() string }` |
| 声明接口变量 | `var s Speaker` |
| 装任何值 | `var x any` |
| 取回具体类型 | `v, ok := x.(T)` |
| 多类型分支 | `switch v := x.(type)` |

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `Dog does not implement Speaker (missing method Speak)` | 方法没写全，或签名（参数/返回值）对不上 | 对照接口逐字检查方法签名 |
| `Dog does not implement Speaker (method Speak has pointer receiver)` | 方法是指针接收者，你传的是值 | 传 `&dog` 而不是 `dog` |
| `invalid operation: x + 1 (mismatched types any and int)` | any 里的值没取出来就运算 | 先类型断言 `x.(int)` |
| `panic: interface conversion: interface {} is string, not int` | 不带 ok 的断言猜错了类型 | 改用 `v, ok := x.(T)` |
| `use of .(type) outside type switch` | `x.(type)` 写在了 switch 外面 | 它只能配合 `switch` 使用 |

## 练习

**1. 动手**：定义接口 `Shape`（含 `Area() float64`），让上一节的 `Rectangle` 和新写的 `Circle`（字段 Radius，面积 3.14159×R²）都实现它；再写 `totalArea(shapes []Shape) float64` 计算总面积，用一个装了两种形状的切片验证。

**2. 猜输出**：先别运行，判断结果。

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
<summary>点击查看答案</summary>

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
<summary>点击查看答案</summary>

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
<summary>点击查看答案</summary>

接口值内部存着一对信息：**(具体类型, 具体值)**。装 Dog 时是 `(Dog, Dog{...})`，装 Cat 后变成 `(Cat, Cat{...})`。调用 `s.Speak()` 时，Go 按记录的具体类型去找对应的方法——这个"运行时才决定调谁"的机制，就是其他语言说的"多态"。

</details>

## 本节小结

- 接口 = 方法签名的集合：结构体描述"长什么样"，接口描述"会干什么"
- **隐式实现**：拥有接口要求的全部方法即自动实现，无需 implements（鸭子类型）
- 接口变量内部存 **(具体类型, 具体值)**，装谁就调谁的方法（多态）
- 空接口 `any` 能装一切值，但装进去就"失忆"；取回具体类型用 **comma ok 断言** `v, ok := x.(T)`，多类型分支用 type switch
- 接口要小；先具体后抽象；接受接口、返回结构体

下一节：[4.3 错误处理](03-error-handling.md)
