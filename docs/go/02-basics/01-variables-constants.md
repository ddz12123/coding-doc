# 01 变量与常量

> 本节目标：掌握 Go 声明变量的几种方式，知道什么时候用哪种；了解常量和 iota。

## 一、什么是变量？

变量就是**给一块存数据的内存起个名字**。比如你想在程序里记住用户的年龄，就声明一个叫 `age` 的变量存放它。

## 二、声明变量的三种方式

### 方式 1：var 关键字（完整写法）

```go
var age int        // 声明一个整数变量 age，此时值为 0
age = 18           // 赋值

var name string = "小明"   // 声明的同时赋值
```

注意：Go 的类型写在变量名**后面**（`var age int`），和 C/Java（`int age`）相反。刚开始不习惯，写几天就顺了。

### 方式 2：var + 类型推断

赋了初始值时，类型可以省略，Go 会自动推断：

```go
var age = 18          // 自动推断为 int
var name = "小明"      // 自动推断为 string
var pi = 3.14         // 自动推断为 float64
```

### 方式 3：短变量声明 `:=`（最常用！）

在**函数内部**，可以用 `:=` 一步完成"声明+赋值"：

```go
age := 18
name := "小明"
```

这是 Go 代码里最常见的写法。但有两个限制：

1. **只能在函数内部用**，函数外（包级别）必须用 `var`
2. `:=` 左边至少要有一个**新**变量

```go
package main

import "fmt"

var global = "我是包级变量，只能用 var"   // 函数外不能用 :=

func main() {
    local := "我是局部变量，用 := 最方便"
    fmt.Println(global, local)
}
```

### 三种方式怎么选？

| 场景 | 推荐写法 |
|------|---------|
| 函数内，有初始值 | `x := 10` |
| 函数内，暂时没有初始值 | `var x int` |
| 函数外（包级别） | `var x = 10` |

## 三、零值：Go 没有"未初始化"的变量

声明变量不赋值时，Go 自动给它一个**零值**（而不是像 C 那样是随机垃圾值）：

```go
var i int       // 0
var f float64   // 0.0
var b bool      // false
var s string    // ""（空字符串，不是 nil！）

fmt.Println(i, f, b, s)   // 输出：0 0 false
```

| 类型 | 零值 |
|------|-----|
| 数字类型 | `0` |
| 布尔 | `false` |
| 字符串 | `""` |
| 指针、切片、map 等 | `nil` |

## 四、一次声明多个变量

```go
var x, y int = 10, 20        // 同类型
a, b := 1, "hello"           // 不同类型也行

// 交换两个变量的值，Go 可以一行搞定：
a2, b2 := 1, 2
a2, b2 = b2, a2              // 现在 a2=2, b2=1
```

## 五、常量：不能改变的值

用 `const` 声明常量，声明后**不可修改**：

```go
const Pi = 3.14159
const AppName = "我的程序"

Pi = 3.14   // ❌ 编译报错：cannot assign to Pi
```

多个常量可以用括号批量声明：

```go
const (
    StatusOK       = 200
    StatusNotFound = 404
)
```

## 六、iota：自动递增的常量生成器

`iota` 在 const 块中从 0 开始，每行自动加 1，适合定义一组枚举值：

```go
const (
    Sunday    = iota   // 0
    Monday             // 1（自动延续上一行的表达式）
    Tuesday            // 2
    Wednesday          // 3
)
```

新手阶段知道"iota 用来偷懒定义递增常量"即可，见到能认识就行。

## 七、命名规范（重要！）

- 使用**驼峰命名**：`userName`、`maxRetryCount`（不用下划线 `user_name`）
- **首字母大小写有特殊含义**：大写开头 = 对其他包公开（public），小写开头 = 仅包内可见（private）。这是 Go 独特的设计，没有 `public/private` 关键字！

```go
var UserName = "对外公开"    // 其他包可以访问
var userAge  = 18           // 只有本包能访问
```

现在先记住这个规则，第六章讲包的时候会真正用到。

## 八、新手常见坑

### 坑 1：`:=` 用在了函数外面

```go
package main

x := 10   // ❌ syntax error: non-declaration statement outside function body
```

### 坑 2：变量声明了不用

```go
func main() {
    x := 10   // ❌ declared and not used: x
}
```

Go 强制要求声明的局部变量必须使用。临时想忽略某个值，用下划线 `_`（空白标识符）：

```go
result, _ := someFunction()   // 只要第一个返回值，第二个丢弃
```

### 坑 3：`:=` 与 `=` 混淆

- `:=` 声明**新**变量并赋值
- `=` 给**已存在**的变量赋值

```go
x := 10
x := 20   // ❌ no new variables on left side of :=
x = 20    // ✅
```

---

## 练习

1. 声明变量存放你的姓名（string）、年龄（int）、身高（float64）、是否是学生（bool），分别用三种声明方式各试一次，并打印出来。
2. 只声明不赋值一个 string 和一个 int，打印它们，验证零值。
3. 用一行代码交换两个变量的值。
4. 用 `const` + `iota` 定义四季（Spring=0, Summer=1, ...）。

下一节：[02 基本数据类型](02-data-types.md)
