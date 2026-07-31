# 2.1 变量与常量

> 本节目标：掌握 Go 声明变量的几种方式，知道什么时候用哪种；理解零值与静态类型；了解常量和 iota。

从这一节开始正式学语法。上一章的 Hello World 里只会打印写死的文字，这一节让程序能**记住数据**。

## 一、为什么需要变量

假设要打印一段自我介绍：

```go
package main

import "fmt"

func main() {
    fmt.Println("大家好，我是小明")
    fmt.Println("小明今年 18 岁")
    fmt.Println("请多关照小明")
}
```

"小明"出现了 3 次，改名要改 3 处。**把数据先存起来、起个名字、后面都用名字**，就只需要改一处——这就是变量：

```go
func main() {
    var name = "小明"

    fmt.Println("大家好，我是" + name)
    fmt.Println(name + "今年 18 岁")
    fmt.Println("请多关照" + name)
}
```

变量就是**给一块存数据的内存起个名字**。下面看 Go 声明变量的三种方式——别慌，三种各有各的场合，最后有选择表。

## 二、方式 1：var 完整写法

```go
var age int        // 声明一个整数变量 age，此时值为 0
age = 18           // 赋值
```

拆开看第一行：

```
var   age   int
 ↑     ↑     ↑
关键字 变量名  类型
```

注意一个和 C/Java 相反的设计：**Go 的类型写在变量名后面**。这样读起来更像英语——"age 是 int"。刚开始不习惯，写几天就顺了。

声明的同时也可以直接赋值：

```go
var name string = "小明"
```

## 三、方式 2：var + 类型推断

上面 `var name string = "小明"` 其实有点啰嗦——值都是 `"小明"` 了，还用你说是 string？Go 也这么想，所以**给了初始值时类型可以省略**，编译器自动推断：

```go
var age = 18          // 自动推断为 int
var name = "小明"      // 自动推断为 string
var pi = 3.14         // 自动推断为 float64（注意：带小数点默认是 float64）
```

## 四、方式 3：短声明 `:=`（最常用）

在**函数内部**，还能更省——连 `var` 都不写，用 `:=` 一步完成"声明 + 赋值"：

```go
age := 18
name := "小明"
```

这是 Go 代码里出场率最高的写法，但有两条限制：

1. **只能在函数内部用**。函数外（包级别）必须用 `var`：

```go
package main

import "fmt"

var global = "我是包级变量，只能用 var"   // 函数外不能用 :=

func main() {
    local := "我是局部变量，用 := 最方便"
    fmt.Println(global, local)
}
```

2. `:=` 左边至少要有一个**新**变量（同一个变量不能 `:=` 两次，下面坑里细说）。

### 三种方式怎么选

| 场景 | 推荐写法 |
|------|---------|
| 函数内，有初始值 | `x := 10` |
| 函数内，暂时没有初始值 | `var x int` |
| 函数外（包级别） | `var x = 10` |

记不住就先记一条：**函数里无脑用 `:=`，报错了再换 var**。

## 五、Go 是静态类型：变量的类型定了就不能变

这是从 Python/JavaScript 转过来的人最容易撞的墙。Go 里**每个变量的类型在声明时就固定了**，之后只能装同类型的值：

```go
x := 10        // x 从此就是 int
x = 20         // ✅ 还是 int，没问题
x = "hello"    // ❌ cannot use "hello" (untyped string constant) as int value
```

动态语言里"一个变量一会儿装数字一会儿装字符串"的写法，在 Go 里编译都过不了。看起来死板，其实是保护：**类型用错在编译期就被抓住，而不是等到程序跑起来才炸**。

## 六、零值：Go 没有"未初始化"的变量

声明变量不赋值，它是什么？C 语言里是随机垃圾值，Python 里压根不允许——Go 的答案是：**自动给一个"零值"**：

```go
var i int       // 0
var f float64   // 0.0
var b bool      // false
var s string    // ""（空字符串）

fmt.Println(i, f, b, s)   // 输出：0 0 false
```

（最后的空字符串打印出来看不见，所以输出末尾像少了一个。）

| 类型 | 零值 |
|------|-----|
| 数字类型 | `0` |
| 布尔 | `false` |
| 字符串 | `""` |
| 指针、切片、map 等 | `nil`（第三章见） |

**"零值可用"是 Go 的重要设计哲学**——声明即安全，永远不会读到垃圾数据。后面学切片、结构体时你会反复见到它。

## 七、一次声明多个变量

```go
var x, y int = 10, 20        // 同类型
a, b := 1, "hello"           // 不同类型也行
```

一个经典应用——**交换两个变量**，别的语言要借助临时变量，Go 一行：

```go
a2, b2 := 1, 2
a2, b2 = b2, a2              // 现在 a2=2, b2=1
```

多变量赋值还有个更重要的用途：接收函数的**多个返回值**（2.5 节的重头戏，先混个眼熟）：

```go
result, err := someFunction()
```

## 八、常量：不许改的值

有些值天生不该变：圆周率、一天的小时数、程序名。用 `const` 声明，改它直接编译报错：

```go
const Pi = 3.14159
const AppName = "我的程序"

Pi = 3.14   // ❌ cannot assign to Pi
```

常量的两个特点：

- 只能是简单类型（数字、字符串、布尔），且值必须在**编译时**就确定——`const x = someFunc()` 不行
- 多个常量用括号批量声明：

```go
const (
    StatusOK       = 200
    StatusNotFound = 404
)
```

## 九、iota：递增常量的偷懒神器

定义一组"状态码"式的枚举常量时，手写 0、1、2、3 很蠢。`iota` 在 const 块中从 0 开始、每行自动加 1：

```go
const (
    Sunday    = iota   // 0
    Monday             // 1（空着不写 = 自动延续上一行的表达式）
    Tuesday            // 2
    Wednesday          // 3
)
```

新手阶段记住"iota = 自动递增的枚举生成器"、见到能认出来就够了，花式用法工作中遇到再学。

## 十、命名规范：大小写是有含义的！

- 用**驼峰命名**：`userName`、`maxRetryCount`，不用下划线 `user_name`
- **首字母大小写决定可见性**：大写开头 = 对其他包公开（public），小写开头 = 仅本包可见（private）

```go
var UserName = "对外公开"    // 其他包可以访问
var userAge  = 18           // 只有本包能访问
```

Go 没有 `public` / `private` 关键字，**全靠首字母大小写**——这是 Go 最独特的设计之一。现在先把规则记住，第六章讲包时会真正用到。

## 本节报错速查表

每个报错都值得亲手触发一次：

| 报错 | 人话翻译 |
|------|----------|
| `syntax error: non-declaration statement outside function body` | `:=` 用在了函数外面，改用 `var` |
| `declared and not used: x` | 变量声明了没用。Go 把这当**错误**而不是警告——删掉它，或临时用 `_ = x` |
| `no new variables on left side of :=` | 同一个变量 `:=` 了两次，第二次改用 `=` |
| `cannot use "..." as int value` | 给变量赋了不同类型的值，Go 是静态类型 |
| `cannot assign to Pi` | 试图修改常量 |

关于第二条多说一句：Go 强制"声明必用"，连 import 了不用的包也报错。临时想丢弃某个值，用**空白标识符 `_`**：

```go
result, _ := someFunction()   // 只要第一个返回值，第二个扔掉
```

## 练习

新建 `practice01` 项目（还记得标准开局三步吗）完成：

**1. 动手**：声明变量存放你的姓名（string）、年龄（int）、身高（float64）、是否是学生（bool），三种声明方式各至少用一次，全部打印。

**2. 动手**：只声明不赋值一个 string 和一个 int，打印验证零值；再用一行代码交换两个变量的值。

**3. 猜输出**：先别运行，下面能编译通过吗？能的话输出什么？

```go
func main() {
    x := 5
    x = x + 1
    var y int
    fmt.Println(x, y)
}
```

**4. 修 bug**：下面的代码有 3 处编译错误，全部找出来修好：

```go
package main

import "fmt"

count := 0

func main() {
    count = 10
    name := "Go"
    name := "Golang"
    fmt.Println(count)
}
```

**5. 挑战**：用 `const` + `iota` 定义四季（Spring=0, Summer=1, Autumn=2, Winter=3）并打印。

<details>
<summary>点击查看答案</summary>

**3. 输出 `6 0`**。`x = x + 1`：先算右边 5+1，再存回 x；y 声明未赋值，是零值 0。

**4. 三处错误：**

```go
package main

import "fmt"

var count = 0            // ① 函数外不能用 :=，改成 var

func main() {
    count = 10
    name := "Go"
    name = "Golang"      // ② 第二次不能再 :=，改成 =
    fmt.Println(count, name)   // ③ name 声明了必须用上（否则 declared and not used）
}
```

```go
// 5
const (
    Spring = iota
    Summer
    Autumn
    Winter
)

func main() {
    fmt.Println(Spring, Summer, Autumn, Winter)   // 0 1 2 3
}
```

</details>

## 本节小结

- 三种声明：`var x int`（无初始值）、`var x = 10`（包级别）、`x := 10`（函数内首选）
- Go 是**静态类型**：变量类型定了就不能换，编译期抓错
- 不赋值自动给**零值**（0 / false / ""），没有垃圾值
- `const` 声明常量，`iota` 生成递增枚举
- **首字母大写 = 公开，小写 = 包内私有**，Go 没有 public/private 关键字
- 变量声明了必须用，这在 Go 是报错不是警告；不要的值用 `_` 扔掉

下一节：[2.2 基本数据类型](02-data-types.md)
