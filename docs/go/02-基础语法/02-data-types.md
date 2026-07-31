# 2.2 基本数据类型

> 本节目标：重点掌握 int、float64、string、bool 四个类型；理解 Go 的"显式类型转换"；会用 fmt 格式化打印。

上一节说过 Go 是静态类型——每个变量都有固定的类型。那到底有哪些类型？这一节把日常要用的全部讲清。

## 一、类型总览：只需要先掌握 4 个

翻开 Go 的类型清单会吓一跳：`int8/16/32/64`、`uint` 全家、`float32/64`、`byte`、`rune`、`complex`……别慌，**新手日常只用得到 4 个**：

| 常用类型 | 说明 | 例子 |
|---------|------|------|
| `int` | 整数 | `42`, `-7` |
| `float64` | 小数 | `3.14` |
| `string` | 字符串 | `"hello"` |
| `bool` | 布尔 | `true` / `false` |

其余类型见到能认识即可，需要时再查。为什么一门语言要搞这么多整数类型？因为 Go 常用来写网络协议、文件格式这种"每个字节都要抠"的程序——那是以后的事，现在**无脑用 int 和 float64**。

## 二、整数 int

```go
var a int = 100
b := -50            // := 声明的整数默认就是 int
```

- `int` 在 64 位系统上是 64 位，范围约 ±922 亿亿，日常完全够用
- 不要纠结 int32 还是 int64——**默认用 `int`**，只有文件格式、网络协议明确规定了字节数才用带位数的类型

**头号大坑：整数除法会丢小数**（向零截断）：

```go
fmt.Println(7 / 2)    // 3，不是 3.5！
fmt.Println(7 % 2)    // 1（% 取余数）
```

Go 的除法规则很直白：**两个整数相除，结果还是整数**，小数部分直接扔掉。想要 3.5，至少让一边是小数：

```go
fmt.Println(7.0 / 2)             // 3.5
fmt.Println(float64(7) / 2)      // 3.5（类型转换，本节第七部分讲）
```

`%` 取余数的经典用途先剧透一个：`n % 2 == 0` 判断偶数，下一节比较运算符里会用到。

## 三、浮点数 float64

```go
pi := 3.14159            // := 声明的小数默认是 float64
var half float64 = 0.5
```

**默认用 `float64`**（精度高），`float32` 基本不用。

浮点数有个所有语言都有的老毛病——**精度误差**：

```go
fmt.Println(0.1 + 0.2)   // 0.30000000000000004，惊不惊喜
```

原因：计算机用二进制存小数，0.1 在二进制里是无限循环小数（就像十进制里的 1/3），存不精确。两条纪律：

1. **不要用 `==` 直接比较浮点数**（判断差值是否足够小代替）
2. **不要用浮点数存钱**——金额用"分"为单位的整数存，`980` 分而不是 `9.8` 元

## 四、布尔 bool

```go
var isDone bool = false
ok := true
```

Go 的布尔非常严格，从 Python/C 转来的要特别注意：

- 只有 `true` / `false`，**不能**用 0 和 1 代替
- 条件判断必须是布尔值：`if 1 { }` 直接编译报错 `non-boolean condition`

Go 里没有"非零就是真"这种潜规则——想判断非零就老老实实写 `if n != 0`。

## 五、字符串 string

```go
name := "Go 语言"
```

### 三种引号，三种含义

这是新手第一个字符串大坑——Go 的三种引号**完全不通用**：

```go
s1 := "第一行\n第二行"      // 双引号：普通字符串，\n 会转义成换行
s2 := `原样输出，\n 不转义
可以直接换行`               // 反引号：原始字符串，写什么是什么，可跨行
c := 'A'                   // 单引号：这是"字符"（rune 类型），不是字符串！
```

> ⚠️ Python 里 `'abc'` 和 `"abc"` 等价，Go 里**单引号只能装单个字符**，`'abc'` 直接报错 `more than one character in rune literal`。写字符串一律用双引号，需要原样多行文本（如 JSON 模板、SQL）用反引号。

### 常用操作

```go
s := "hello"

// 拼接：+
greeting := s + ", world"        // "hello, world"

// 长度：len()
fmt.Println(len(s))              // 5
```

但 `len()` 一遇到中文就"翻车"：

```go
fmt.Println(len("你好"))          // 6？！
```

`len()` 数的是**字节数**，而一个汉字在 UTF-8 编码里占 3 个字节。想数"字符个数"：

```go
fmt.Println(len([]rune("你好")))  // 2 ✅
```

`rune` 就是"一个字符"的意思（不管中英文），`[]rune(s)` 把字符串拆成字符的序列。遍历字符串时用 `range`，它会自动按字符切：

```go
for _, ch := range "Go语言" {
    fmt.Printf("%c ", ch)        // G o 语 言
}
```

（`for range` 的完整语法 2.4 节讲，先眼熟。）

### 字符串不可变

```go
s := "hello"
s[0] = 'H'    // ❌ cannot assign to s[0]
```

想"修改"只能整个重新赋值：`s = "Hello"`。这一点和 Python 一样。

## 六、fmt 打印速查

前面例子里已经混用了 `Println` 和 `Printf`，正式区分一下：

```go
name, age, pi := "小明", 18, 3.14159

fmt.Println("你好", name)                       // 逗号分隔，自动加空格和换行
fmt.Printf("姓名：%s，年龄：%d\n", name, age)    // 按占位符格式化，换行要自己写 \n
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
| `%T` | 打印值的**类型**（调试神器：搞不清类型就 `%T` 一下） |
| `%c` | 单个字符 |

> 💡 占位符和值**数量、类型对不上**时，Go 不会崩溃，而是在输出里塞入 `%!d(string=abc)` 这样的怪东西——看到输出里有 `%!`，回头检查 Printf 的参数。`go vet` 也能查出这类错误。

## 七、类型转换：必须显式！

Go 和大多数语言的重大分歧点。别的语言里 `10 + 3.5` 天经地义，Go 里：

```go
var a int = 10
var b float64 = 3.5

fmt.Println(a + b)            // ❌ mismatched types int and float64
```

**Go 没有任何隐式类型转换**，int 和 float64 相加都不行，必须手动转：

```go
fmt.Println(float64(a) + b)   // ✅ 13.5
fmt.Println(a + int(b))       // ✅ 13（b 的小数被截断了！）
```

语法就是 `类型(值)`。看起来烦，换来的是：**任何精度丢失都发生在你亲手写的转换里**，不会有"int 悄悄变 float 又悄悄丢精度"的暗病。

### 数字和字符串互转：用 strconv 包

新手必踩的坑：

```go
s := string(65)     // ⚠️ 得到的是 "A"，不是 "65"！
```

`string(数字)` 的含义是"把这个数字当字符编码"（65 是字母 A 的编码）。数字和字符串互转要用标准库 `strconv`：

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

> `Itoa` = Integer to ASCII，`Atoi` = ASCII to Integer。第二个返回值 `err` 是 Go 错误处理的招牌设计，第四章专门讲，现在照着这个模板写就行。

## 本节报错/怪象速查表

| 现象 | 人话翻译 |
|------|----------|
| `mismatched types int and float64` | 不同类型不能直接运算，用 `float64(x)` 转换 |
| `non-boolean condition in if statement` | if 里塞了数字，Go 不认"非零为真" |
| `more than one character in rune literal` | 单引号里装了多个字符——字符串要用双引号 |
| `cannot assign to s[0]` | 字符串不可变 |
| `7 / 2` 得 3 | 整数除法截断小数，让一边变浮点数 |
| `len("你好")` 得 6 | len 数字节，中文一个字 3 字节，字符数用 `len([]rune(s))` |
| `string(65)` 得 "A" | 数字转字符串要用 `strconv.Itoa` |
| 输出里出现 `%!d(...)` | Printf 占位符和参数对不上 |

## 练习

**1. 动手**：声明一个 int 和一个 float64，把它们加起来打印（体会显式转换）；再用 `%.1f` 打印 `3.14159`。

**2. 猜输出**：先别运行，猜猜每行打印什么？

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

```go
// 4
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
- 整数除法截断小数；浮点数有精度误差，别用 `==` 比、别存钱
- bool 只有 true/false，Go 不认"非零为真"
- 双引号字符串、反引号原始字符串、单引号是字符——三种引号不通用
- `len()` 数字节不数字符，中文字符数用 `len([]rune(s))`
- **没有隐式类型转换**：`类型(值)` 手动转；数字↔字符串用 `strconv.Itoa` / `Atoi`

下一节：[2.3 运算符](03-operators.md)
