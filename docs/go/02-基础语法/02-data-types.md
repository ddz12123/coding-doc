# 2.2 基本数据类型

> 本节目标：重点掌握 int、float64、string、bool 四个类型；理解 Go 的"显式类型转换"；会用 fmt 格式化打印。

## 一、类型总览：先掌握 4 个

Go 的完整类型清单较长（`int8/16/32/64`、`uint` 全家、`float32/64`、`byte`、`rune`、`complex`……）。日常开发先掌握 4 个：

| 常用类型 | 说明 | 例子 |
|---------|------|------|
| `int` | 整数 | `42`, `-7` |
| `float64` | 小数 | `3.14` |
| `string` | 字符串 | `"hello"` |
| `bool` | 布尔 | `true` / `false` |

其余类型见到能认识即可，需要时再查。Go 提供多种整数类型，是为了满足网络协议、文件格式这类对字节数有精确要求的场景；现阶段统一使用 `int` 和 `float64`。

## 二、整数 int：除法会截断

写法和 2.1 相同：`var a int = 100` 显式声明，`b := -50` 短声明（整数默认推断为 int）。重点是一个反直觉的现象：

```go
fmt.Println(7 / 2)    // 3   ← 两个整数相除，结果还是整数，小数直接截掉
fmt.Println(7 % 2)    // 1   ← % 取余数

fmt.Println(7.0 / 2)             // 3.5 ← 有浮点数参与，才是浮点除法
fmt.Println(float64(7) / 2)      // 3.5 ← 显式转换，见 七
```

`%` 取余的常用场景：`n % 2 == 0` 判断偶数，2.3 的比较运算符中会用到。

- ⚠️ **两个整数相除，结果还是整数**（向零截断）。想要 3.5，至少让一边是小数
- `int` 在 64 位系统上是 64 位，范围约 ±922 亿亿，日常够用；只有文件格式、网络协议明确规定了字节数，才用 `int32`/`int64` 这类带位数的类型

## 三、浮点数 float64：精度天生有误差

写法：`pi := 3.14159`（小数默认推断为 float64）、`var half float64 = 0.5`（显式声明）。

先看现象：

```go
fmt.Println(0.1 + 0.2)   // 0.30000000000000004
```

原因：计算机用二进制存小数，0.1 在二进制里是无限循环小数，存不精确。判断两个浮点数是否"相等"，用差值是否足够小代替（`math.Abs` 求绝对值，`1e-9` 是一个足够小的容差）：

```go
import "math"

a, b := 0.1+0.2, 0.3
fmt.Println(a == b)                  // false
fmt.Println(math.Abs(a-b) < 1e-9)    // true —— 浮点数比较的正确写法
```

三条规矩：

- **不要用 `==` 直接比较浮点数**，用差值判断代替
- **不要用浮点数存钱**：金额用"分"为单位的整数存，`980` 分而不是 `9.8` 元
- 默认用 `float64`（精度高），`float32` 基本不用

## 四、布尔 bool：只有 true 和 false

```go
var isDone bool = false
ok := true
```

- 只有 `true` / `false`，**不能**用 0 和 1 代替
- 条件判断必须是布尔值：`if 1 { }` 编译报错 `non-boolean condition`
- Go 没有"非零就是真"的规则，判断非零就写 `if n != 0`

## 五、字符串 string：三种引号不通用

| 引号 | 名称 | 行为 |
|------|------|------|
| `"…"` | 普通字符串 | `\n` 等转义生效 |
| `` `…` `` | 原始字符串 | 写什么是什么，可跨行 |
| `'…'` | 字符（rune） | 只能装**单个**字符，不是字符串 |

```go
s1 := "第一行\n第二行"      // 双引号：\n 转义成换行
s2 := `原样输出，\n 不转义
可以直接换行`               // 反引号：原始字符串，可跨行
c := 'A'                   // 单引号：字符（rune 类型），不是字符串
```

### 拼接与长度

```go
s := "hello"

greeting := s + ", world"        // 拼接："hello, world"
fmt.Println(len(s))              // 长度：5
```

⚠️ `len()` 数的是**字节数**，一个汉字在 UTF-8 编码里占 3 个字节：

```go
fmt.Println(len("你好"))          // 6（字节数）
fmt.Println(len([]rune("你好")))  // 2（字符数）
```

`rune` 表示"一个字符"（不分中英文），`[]rune(s)` 把字符串拆成字符序列。用 `range` 遍历字符串时自动按字符切：

```go
for _, ch := range "Go语言" {
    fmt.Printf("%c ", ch)        // G o 语 言
}
```

（`for range` 的完整语法 2.4 节讲。）

### 字符串不可变

```go
s := "hello"
s[0] = 'H'    // ❌ cannot assign to s[0]
```

想"修改"只能整个重新赋值：`s = "Hello"`。这一点和 Python 一样。

两个提醒：

- Python 里 `'abc'` 和 `"abc"` 等价，Go 里**单引号只能装单个字符**，`'abc'` 报错 `more than one character in rune literal`
- 写字符串一律用双引号；需要原样多行文本（如 JSON 模板、SQL）用反引号

## 六、fmt 格式化打印：占位符填空

| 函数 | 行为 |
|------|------|
| `fmt.Println("你好", name)` | 逗号分隔参数，自动加空格和换行 |
| `fmt.Printf("姓名：%s\n", name)` | 按占位符格式化，换行要自己写 `\n` |

Printf 的核心是**占位符**——引号里写好模板，把值按顺序填进对应位置。拆解：

```
fmt.Printf("姓名：%s，年龄：%d\n", name, age)
               ↑     ↑
               %s 的位置填 name —— %s 是字符串占位符
                     %d 的位置填 age —— %d 是整数占位符
```

读作：**按引号里的模板打印——%s、%d 的位置依次用后面的值填上，`\n` 是自己写的换行**。

```go
name, age, pi := "小明", 18, 3.14159

fmt.Println("你好", name)                       // 自动加空格和换行
fmt.Printf("姓名：%s，年龄：%d\n", name, age)
fmt.Printf("圆周率：%.2f\n", pi)                // 保留两位小数：3.14
fmt.Printf("值是 %v，类型是 %T\n", age, age)     // 值是 18，类型是 int
```

常用占位符：

| 占位符 | 含义 |
|-------|------|
| `%v` | 万能，按默认格式打印任何值（不知道用啥就用它） |
| `%d` | 整数 |
| `%f` / `%.2f` | 浮点数 / 保留 2 位小数 |
| `%s` | 字符串 |
| `%t` | 布尔 |
| `%T` | 打印值的**类型**（调试时常用：搞不清类型就 `%T` 一下） |
| `%c` | 单个字符 |

⚠️ 占位符和值的**数量、类型对不上**时，Go 不会崩溃，而是在输出里写入 `%!d(string=abc)` 这类内容——看到输出里有 `%!`，回头检查 Printf 的参数。`go vet` 也能查出这类占位符错误。

## 七、类型转换：必须显式

Go **没有任何隐式类型转换**——想换个类型，必须亲手写。语法：把**类型名当函数用**。拆解：

```
float64(a)
↑       ↑
目标类型 —— 想变成什么类型，就把类型名写在前面
        要转换的值
```

读作：**把 a 转换成 float64 类型**。

int 和 float64 直接运算会编译报错：

```go
var a int = 10
var b float64 = 3.5

fmt.Println(a + b)            // ❌ mismatched types int and float64
fmt.Println(float64(a) + b)   // ✅ 13.5
fmt.Println(a + int(b))       // ✅ 13（b 的小数被截断了）
```

### 数字和字符串互转：strconv

⚠️ `string(数字)` 不是"数字转字符串"，而是"把数字当字符编码"：

```go
s := string(65)     // 得到的是 "A"，不是 "65"！（65 是字母 A 的编码）
```

互转用标准库 `strconv`。拆解：

```
n, err := strconv.Atoi("456")
   ↑              ↑    ↑
   err 接住失败原因 —— "abc" 转不成数字，所以要多带一个 err
                  Atoi = ASCII to Integer，"字符串转整数"
                       要转换的字符串
```

读作：**把字符串转成整数，结果给 n，成败信息给 err**——"abc" 这类转不成的，err 会说明原因。

```go
import "strconv"

// 数字 → 字符串
s := strconv.Itoa(123)          // "123"

// 字符串 → 数字（可能失败——"abc" 转不成数字，所以有两个返回值）
n, err := strconv.Atoi("456")   // n=456, err=nil
if err != nil {
    fmt.Println("转换失败：", err)
}
```

三点说明：

- `Itoa` = Integer to ASCII，`Atoi` = ASCII to Integer
- 第二个返回值 `err` 是 Go 错误处理的标准设计，第四章专门讲，现阶段照此模板使用
- 显式转换的好处：任何精度丢失都发生在亲手写的转换里，不会出现类型悄悄变、精度悄悄丢的问题

## 八、常用操作速查

| 需求 | 写法 |
|------|------|
| 整数 → 字符串 | `strconv.Itoa(123)` |
| 字符串 → 整数 | `strconv.Atoi("456")` |
| 浮点数比较 | `math.Abs(a-b) < 1e-9` |
| 中文字符数 | `len([]rune(s))` |
| 保留 n 位小数 | `%.2f` |
| 查看类型 | `fmt.Printf("%T", x)` |

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `mismatched types int and float64` | 不同类型不能直接运算，Go 没有隐式转换 | 用 `float64(x)` 显式转换 |
| `non-boolean condition in if statement` | if 里塞了数字，Go 不认"非零为真" | 写成布尔表达式 `n != 0` |
| `more than one character in rune literal` | 单引号里装了多个字符 | 字符串用双引号 |
| `cannot assign to s[0]` | 字符串不可变 | 整个重新赋值 |
| `7 / 2` 得 3 | 整数除法截断小数 | 让一边变成浮点数，如 `7.0 / 2` |
| `len("你好")` 得 6 | len 数字节，中文一个字 3 字节 | 字符数用 `len([]rune(s))` |
| `string(65)` 得 "A" | string(数字) 是按编码取字符 | 数字转字符串用 `strconv.Itoa` |
| 输出里出现 `%!d(...)` | Printf 占位符和参数对不上 | 检查占位符的数量与类型 |

## 练习

**1. 动手**：声明一个 int 和一个 float64，把它们加起来打印（体会显式转换）；再用 `%.1f` 打印 `3.14159`。

**2. 猜输出**：先别运行，写出每行输出。

```go
fmt.Println(9 / 2)
fmt.Println(9.0 / 2)
fmt.Println(9 % 2)
fmt.Println(len("Go语言"))
```

**3. 修 bug**：下面的代码有 2 处编译错误，找出来修好：

```go
func main() {
    price := 19.9
    count := 3
    total := price * count
    fmt.Printf("总价：%d 元\n", total)
}
```

**4. 挑战**：把字符串 `"2024"` 转成整数加 1 后打印；再把整数 `100` 转成字符串和 `"分"` 拼接后打印。（提示：strconv）

<details>
<summary>点击查看答案</summary>

**2. 输出：**

```
4        ← 整数除法截断（9/2 = 4.5 → 4）
4.5      ← 一边是浮点数，结果就是浮点数
1        ← 9 除以 2 余 1
8        ← "Go" 2 字节 + "语言" 各 3 字节 = 8
```

**3. 两处错误：**

```go
func main() {
    price := 19.9
    count := 3
    total := price * float64(count)   // ① float64 和 int 不能直接相乘，显式转换
    fmt.Printf("总价：%.1f 元\n", total) // ② total 是浮点数，%d 是整数占位符，改 %f
}
```

**4.**

```go
import (
    "fmt"
    "strconv"
)

func main() {
    n, err := strconv.Atoi("2024")
    if err != nil {
        fmt.Println("转换失败：", err)
        return
    }
    fmt.Println(n + 1)                    // 2025

    s := strconv.Itoa(100) + "分"
    fmt.Println(s)                        // 100分
}
```

</details>

## 本节小结

- 日常四大类型：`int`、`float64`、`string`、`bool`，其他的需要时再查
- 整数除法截断小数；浮点数有精度误差，不要用 `==` 比、不要存钱
- bool 只有 true/false，Go 不认"非零为真"
- 双引号字符串、反引号原始字符串、单引号是字符——三种引号不通用
- `len()` 数字节不数字符，中文字符数用 `len([]rune(s))`
- **没有隐式类型转换**：`类型(值)` 手动转；数字↔字符串用 `strconv.Itoa` / `Atoi`

下一节：[2.3 运算符](03-operators.md)
