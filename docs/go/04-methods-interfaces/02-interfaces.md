# 02 接口

> 本节目标：理解 Go 接口的"隐式实现"，会用接口写出灵活的代码。接口是 Go 设计中最精华的部分。

## 一、接口是什么？

**接口（interface）定义了一组方法的集合，只关心"能做什么"，不关心"是什么"。**

生活化的例子："会叫的东西"就是一个接口——狗会叫、猫会叫、闹钟也会叫。它们是完全不同的东西，但都满足"会叫"这个要求。

```go
type Speaker interface {
    Speak() string      // 只声明方法签名，没有实现
}
```

这个接口的意思是：**任何拥有 `Speak() string` 方法的类型，都算 Speaker**。

## 二、隐式实现：Go 接口的灵魂

其他语言（Java 等）需要显式声明 `implements Speaker`。**Go 不需要任何声明**——只要你的类型有接口要求的所有方法，就自动实现了该接口：

```go
package main

import "fmt"

type Speaker interface {
    Speak() string
}

type Dog struct{ Name string }
type Cat struct{ Name string }

// Dog 有 Speak 方法 → 自动成为 Speaker，无需任何声明
func (d Dog) Speak() string {
    return d.Name + "：汪汪！"
}

// Cat 也是
func (c Cat) Speak() string {
    return c.Name + "：喵~"
}

// 这个函数接受"任何会叫的东西"
func makeSound(s Speaker) {
    fmt.Println(s.Speak())
}

func main() {
    makeSound(Dog{Name: "旺财"})    // 旺财：汪汪！
    makeSound(Cat{Name: "咪咪"})    // 咪咪：喵~
}
```

这叫**鸭子类型**："如果它走起来像鸭子、叫起来像鸭子，那它就是鸭子。"

### 隐式实现的妙处

- 可以为**别人写的类型**实现**你定义的接口**（对方代码完全不用改）
- 先写实现、后抽接口也完全没问题，代码演进很自然

## 三、接口值可以装任何实现者

接口类型的变量，可以存放任何实现了它的值：

```go
var s Speaker           // 接口变量，零值是 nil

s = Dog{Name: "旺财"}   // 装一只狗
fmt.Println(s.Speak())

s = Cat{Name: "咪咪"}   // 换成猫
fmt.Println(s.Speak())

// 接口切片：不同类型放进同一个切片！
animals := []Speaker{
    Dog{Name: "旺财"},
    Cat{Name: "咪咪"},
}
for _, a := range animals {
    fmt.Println(a.Speak())
}
```

## 四、空接口 any：能装一切

不要求任何方法的接口 `interface{}`（别名 `any`），任何类型都自动实现它，所以它能装任何值：

```go
var x any               // any 是 interface{} 的别名（Go 1.18+）

x = 42
x = "hello"
x = []int{1, 2, 3}      // 都合法

// fmt.Println 能打印任何东西，就是因为参数是 ...any
```

⚠️ 装进 any 后，原类型的方法和运算都用不了了（比如不能直接 `x + 1`），需要"取出来"——见下面的类型断言。

## 五、类型断言：从接口里取出具体类型

```go
var x any = "hello"

// 不安全写法：断言失败直接 panic
s := x.(string)
fmt.Println(s)          // hello

// 安全写法（推荐）：comma ok
s, ok := x.(string)
if ok {
    fmt.Println("是字符串：", s)
}

n, ok := x.(int)        // 断言失败：n=0, ok=false，不 panic
fmt.Println(n, ok)      // 0 false
```

### type switch：多种类型分别处理

```go
func describe(x any) {
    switch v := x.(type) {      // 特殊语法，只能用在 switch 里
    case int:
        fmt.Println("整数，加倍是", v*2)
    case string:
        fmt.Println("字符串，长度是", len(v))
    case bool:
        fmt.Println("布尔值：", v)
    default:
        fmt.Printf("未知类型：%T\n", v)
    }
}
```

## 六、标准库中的著名接口

理解了接口，很多标准库的设计就通了：

### fmt.Stringer：自定义打印格式

```go
type Stringer interface {
    String() string
}
```

上一节的彩蛋揭晓：`fmt.Println` 打印一个值时，如果它实现了 `Stringer`，就调用它的 `String()` 方法。

### error：错误也是接口！

```go
type error interface {
    Error() string
}
```

任何有 `Error() string` 方法的类型都是 error。下一节详细讲。

### io.Reader / io.Writer：IO 的通用语言

```go
type Reader interface {
    Read(p []byte) (n int, err error)
}
type Writer interface {
    Write(p []byte) (n int, err error)
}
```

文件、网络连接、内存缓冲区、压缩流……全都实现了它们。所以一个处理 `io.Reader` 的函数，能处理任何数据来源。这是 Go 生态组合能力的基石（现阶段有个印象即可）。

## 七、接口设计的 Go 哲学

1. **接口要小**：Go 标准库大量接口只有 1~2 个方法。方法越少，实现者越多，越通用。
2. **先写具体类型，需要抽象时再提炼接口**：不要一上来就为每个东西设计接口。
3. **接受接口，返回结构体**：函数参数尽量用接口（灵活），返回值尽量用具体类型（明确）。

---

## 新手常见坑

1. **方法签名必须完全一致**才算实现接口：方法名、参数、返回值一个都不能差。指针接收者的方法集只属于指针——`*T` 实现了接口不代表 `T` 实现了（遇到 "does not implement" 报错时，试试传 `&x` 而不是 `x`）
2. **对 any 里的值直接运算**：要先用类型断言取出来
3. **不带 ok 的类型断言**：断言失败会 panic，永远用 `v, ok := x.(T)` 写法
4. **过度设计接口**：新手容易学了接口就到处用。记住：需要"多种类型统一处理"时才用接口

---

## 练习

1. 定义接口 `Shape`（含 `Area() float64` 方法），让 `Rectangle` 和 `Circle` 都实现它，写一个函数 `totalArea(shapes []Shape) float64` 计算总面积。
2. 给 `Rectangle` 实现 `String() string`，验证 `fmt.Println` 会用你的格式打印。
3. 写函数 `printType(x any)`，用 type switch 分别处理 int、string、[]int 和其他类型。
4. 思考题：`Speaker` 接口变量里装了 `Dog{}`，`s.Speak()` 是怎么知道要调 Dog 的方法而不是 Cat 的？（提示：接口值内部记着"类型+值"两个信息）

下一节：[03 错误处理](03-error-handling.md)
