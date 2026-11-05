# 2.1 变量与常量

> 本节目标：掌握 Go 声明变量的几种方式，知道什么时候用哪种；理解零值与静态类型；了解常量和 iota。

## 一、引入：为什么需要变量

程序需要**记住数据**：把数据存起来、起个名字，后面都用这个名字访问——这就是变量，本质是**给一块存数据的内存起个名字**。

先看没有变量的写法：

```go
package main

import "fmt"

func main() {
    fmt.Println("大家好，我是小明")
    fmt.Println("小明今年 18 岁")
    fmt.Println("请多关照小明")
}
```

"小明"出现 3 次，改名要改 3 处。改用变量后只需改一处：

```go
func main() {
    var name = "小明"

    fmt.Println("大家好，我是" + name)
    fmt.Println(name + "今年 18 岁")
    fmt.Println("请多关照" + name)
}
```

## 二、声明变量的四种写法

先记住一个和 C/Java 相反的规矩：**类型写在变量名后面**。四种写法，先拆最完整的一种：

### 拆解：var 声明

```
var age int
↑   ↑   ↑
关键字 —— 表示"我要声明一个变量"
    变量名 —— 以后都用这个名字访问这块内存
        类型 —— 这个变量装什么类型的数据
```

读作：**声明一个 int 类型的变量 age**。不赋值时自动是零值 0（见 五）。

### 拆解：短声明 :=（最常用的一种）

```
age := 18
↑   ↑  ↑
变量名 —— 必须是没声明过的新名字
    声明 + 赋值一步完成 —— 等价于 var age int，再 age = 18
       初始值 —— 18 是整数，age 的类型自动定为 int
```

读作：**声明变量 age 并赋值 18**。

### 四种写法对比

| 写法 | 含义 | 适用场景 |
|------|------|---------|
| `var age int` | 声明，值为零值 | 暂时没有初始值 |
| `var age = 18` | 声明并初始化，类型自动推断 | 包级别、有初始值 |
| `var name string = "小明"` | 声明并初始化，显式写类型 | 少用 |
| `age := 18` | 短声明，一步完成声明 + 赋值 | 函数内首选 |

```go
var age int        // 声明一个整数变量 age，此时值为 0
age = 18           // 赋值

var name = "小明"       // 自动推断为 string
var pi = 3.14          // 自动推断为 float64（带小数点默认是 float64）

city := "北京"          // 短声明：函数内连 var 都不写
```

短声明只能在**函数内部**使用，函数外（包级别）必须用 `var`：

```go
package main

import "fmt"

var global = "我是包级变量，只能用 var"   // 函数外不能用 :=

func main() {
    local := "我是局部变量，用 := 最方便"
    fmt.Println(global, local)
}
```

两个注意点：

- `:=` 左边至少要有一个**新**变量，同一个变量不能 `:=` 两次
- `var pi = 3.14` 推断为 `float64`，Go 的小数默认就是 `float64`

## 三、三种方式怎么选

| 场景 | 推荐写法 |
|------|---------|
| 函数内，有初始值 | `x := 10` |
| 函数内，暂时没有初始值 | `var x int` |
| 函数外（包级别） | `var x = 10` |

## 四、静态类型：类型定了就不能变

Go 中**每个变量的类型在声明时就固定了**，之后只能赋同类型的值：

```go
x := 10        // x 从此就是 int
x = 20         // ✅ 还是 int，没问题
x = "hello"    // ❌ cannot use "hello" (untyped string constant) as int value
```

两点说明：

- 从 Python/JavaScript 等动态语言转来的读者需特别注意：一个变量不能一会儿装数字、一会儿装字符串，这类写法在 Go 里编译不通过
- 类型用错在**编译期**就被抓住，而不是等程序运行才出错

## 五、零值：声明不赋值时的默认值

声明变量不赋值时，Go **自动给一个零值**，不存在"未初始化"的变量：

| 类型 | 零值 |
|------|-----|
| 数字类型 | `0` |
| 布尔 | `false` |
| 字符串 | `""` |
| 指针、切片、map 等 | `nil`（第三章见） |

```go
var i int       // 0
var f float64   // 0.0
var b bool      // false
var s string    // ""（空字符串）

fmt.Println(i, f, b, s)   // 输出：0 0 false（空字符串打印出来不可见，末尾像少了一个）
```

> 💡 **"零值可用"是 Go 的重要设计哲学**：声明即安全，永远不会读到垃圾数据，后面学切片、结构体时会反复见到。

## 六、一次声明多个变量

```go
var x, y int = 10, 20    // 同类型批量声明
a, b := 1, "hello"       // 不同类型也行
```

多重赋值还有一个经典用法——一行交换两个变量。拆解：

```
a, b = b, a
↑      ↑
左边后赋值 —— 把算好的值同时写回 a 和 b
       右边先求值 —— b、a 的值同时算好，暂存起来
```

读作：**右边先全部算好，再同时赋给左边**——两个值不会互相覆盖，所以一行就完成交换。

```go
a2, b2 := 1, 2
a2, b2 = b2, a2              // 现在 a2=2, b2=1
```

多变量赋值还用于接收函数的**多个返回值**（2.5 的主题，此处先了解）：

```go
result, err := someFunction()
```

接收多个返回值时，不要的值用**空白标识符 `_`** 扔掉：

```go
result, _ := someFunction()   // 只要第一个返回值，第二个扔掉
```

## 七、常量：const

**常量**：声明时定死、以后永远不变的值。拆解：

```
const Pi = 3.14159
↑     ↑    ↑
关键字 —— "这个名字永远不变"
     常量名 —— 之后只能用，不能改
          值 —— 必须在编译时就确定
```

读作：**声明一个常量 Pi，值为 3.14159，之后不许修改**。

```go
const Pi = 3.14159
const AppName = "我的程序"

Pi = 3.14   // ❌ cannot assign to Pi
```

多个常量用括号批量声明：

```go
const (
    StatusOK       = 200
    StatusNotFound = 404
)
```

两个限制：

- 常量只能是简单类型（数字、字符串、布尔）
- 值必须在**编译时**确定，`const x = someFunc()` 编译报错

## 八、iota：自动递增的枚举

`iota` 在 const 块中从 0 开始、每行自动加 1；省略表达式时自动延续上一行：

```go
const (
    Sunday    = iota   // 0  ← iota 在 const 块第 0 行，值是 0
    Monday             // 1  ← 空着不写 = 延续上一行的表达式，行号自动 +1
    Tuesday            // 2
    Wednesday          // 3
)
```

读作：iota 是 const 块里的**行号计数器**，从 0 开始每行加 1；后面几行空着，等于把 `= iota` 复制了下来。

入门阶段记住"iota 生成递增枚举"、见到能认出来即可，花式用法工作中遇到再学。

## 九、命名规范

- 用**驼峰命名**：`userName`、`maxRetryCount`，不用下划线 `user_name`
- **首字母大小写决定可见性**：大写开头 = 对其他包公开（public），小写开头 = 仅本包可见（private）

```go
var UserName = "对外公开"    // 其他包可以访问
var userAge  = 18           // 只有本包能访问
```

Go 没有 `public` / `private` 关键字，全靠首字母大小写，这是 Go 最独特的设计之一。第六章讲包时会真正用到。

## 十、常用操作速查

| 需求 | 写法 |
|------|------|
| 函数内声明 | `x := 10` |
| 包级别声明 | `var x = 10` |
| 声明暂不赋值 | `var x int` |
| 批量声明 | `var x, y int = 10, 20` |
| 交换两个变量 | `a, b = b, a` |
| 只要第一个返回值 | `result, _ := f()` |
| 批量常量 | `const ( ... )` |
| 递增枚举 | `iota` |

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `syntax error: non-declaration statement outside function body` | `:=` 用在了函数外面 | 改用 `var` |
| `declared and not used: x` | 变量声明了没用。Go 把这当**错误**而不是警告 | 删掉它，或临时 `_ = x` |
| `no new variables on left side of :=` | 同一个变量 `:=` 了两次 | 第二次改用 `=` |
| `cannot use "..." as int value` | 给变量赋了不同类型的值，Go 是静态类型 | 保持类型一致或显式转换 |
| `cannot assign to Pi` | 试图修改常量 | 常量不可修改 |

## 练习

新建 `practice01` 项目（标准开局三步见第 1 章）完成：

**1. 动手**：声明变量存放你的姓名（string）、年龄（int）、身高（float64）、是否是学生（bool），三种声明方式各至少用一次，全部打印。

**2. 动手**：只声明不赋值一个 string 和一个 int，打印验证零值；再用一行代码交换两个变量的值。

**3. 猜输出**：先判断能否编译通过；能的话写出输出。

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

**5.**

```go
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
