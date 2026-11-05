# 2.4 流程控制

> 本节目标：掌握 if、for、switch。记住一个 Go 冷知识：循环只有 for 一种。

程序默认从上到下顺序执行。流程控制让程序会**选择**（if / switch）、会**重复**（for）。Go 在这里做了大量减法：没有 while、没有三元运算符、switch 不用 break。

## 一、if：让程序会"选择"

问题来了：score 是 85，该打印"及格"还是"优秀"？顺序执行的程序做不到"看情况办事"，if 就是干这个的。拆解：

```
if score >= 60 {
↑  ↑
关键字 —— "如果"
    条件 —— 一个 bool 值，直接写，不加括号
    fmt.Println("及格")    ← 条件为 true 时才执行
}
```

读作：**如果 score 大于等于 60，就执行大括号里的代码**。

```go
score := 85

if score >= 90 {
    fmt.Println("优秀")
} else if score >= 60 {
    fmt.Println("及格")
} else {
    fmt.Println("不及格")
}
```

### 初始化语句：if 的招牌变体

if 可以在条件前先执行一条语句。拆解：

```
if n := len(s); n > 10 {
   ↑            ↑
   初始化语句 —— 先执行它，声明的 n 只活在 if/else 块里
                 条件 —— 分号隔开两步，这一步才做判断
}
```

读作：**先算出长度存进 n，再判断 n 是否大于 10**。

初始化语句声明的变量只活在 if/else 块里，临时变量用完即扔，不污染外面：

```go
if n := len(s); n > 10 {
    fmt.Println("字符串很长，长度为", n)
} else {
    fmt.Println("字符串较短，长度为", n)
}
// 这里再访问 n → undefined: n（它的作用域只在上面）
```

初始化语句在**错误处理**里是绝对主力，第四章会大量使用，先认识这个模板：

```go
if err := doSomething(); err != nil {
    fmt.Println("出错了:", err)
}
```

### 三条硬规矩

1. 条件**不加括号**：`if (score >= 90)` 不报错，但 gofmt 保存时会帮你删掉
2. **大括号必须有**，哪怕只有一行——"省略大括号导致的 bug"在 Go 里不存在
3. **`else` 必须紧跟在 `}` 后面**，不能另起一行：

```go
// ❌ 编译报错
if x > 0 {
    fmt.Println("正数")
}
else {                    // syntax error: unexpected else
    fmt.Println("非正数")
}
```

第三条不是风格问题，是语法问题：Go 编译器会在每行行尾自动补分号，`}` 单独一行时后面被补了 `;`，else 就断开了。所以 Go 代码的大括号风格全世界统一。

## 二、for：Go 唯一的循环

别的语言有 while、do-while、for、foreach……Go 只留一个 `for`，靠四种形态覆盖所有场景：

| 形态 | 写法 | 用途 |
|------|------|------|
| 经典三段式 | `for i := 0; i < 5; i++` | 已知循环次数 |
| 只写条件 | `for n < 100` | 相当于别家的 while |
| 什么都不写 | `for { }` | 无限循环，配合 break |
| for range | `for i, v := range s` | 遍历（见 三） |

### 拆解最常用的三段式

```
for i := 0; i < 5; i++ {
    ↑       ↑      ↑
    初始化 —— 开跑前执行一次，声明计数变量 i
           继续条件 —— 每轮开始前检查，false 就停
                   每轮收尾 —— 一轮结束时执行，通常是 i++
}
```

读作：**i 从 0 开始；只要 i 小于 5 就继续；每轮跑完 i 加 1**——所以循环体一共执行 5 次，i 依次是 0、1、2、3、4。

```go
// 形态 1：经典三段式
for i := 0; i < 5; i++ {
    fmt.Println("第", i, "次循环")
}

// 形态 2：只写条件——不知道循环几次、只知道什么时候停
n := 1
for n < 100 {
    n *= 2
}
fmt.Println(n)   // 128

// 形态 3：无限循环——服务器"永远等待请求"、游戏"一直读玩家输入"都靠它
count := 0
for {
    count++
    if count >= 3 {
        break   // 跳出循环
    }
}
```

同样不加括号、必须有大括号；无限循环是正经写法，配合 `break` 退出。

## 三、for range：遍历

range 用来"挨个取出"一个集合里的东西。拆解：

```
for i, v := range fruits {
    ↑  ↑          ↑
    每轮的索引 —— 第几个，从 0 开始
       每轮的值 —— 这一轮取到的元素
                  要遍历的东西 —— 字符串、数组、切片、map 都行
}
```

读作：**挨个取出 fruits 里的元素——i 记"第几个"，v 记"是什么"**。

四种写法：

| 写法 | 变量含义 |
|------|---------|
| `for i, v := range s` | i 是索引，v 是值 |
| `for _, v := range s` | 用 `_` 扔掉索引（空白标识符见 2.1） |
| `for i := range s` | **只写一个变量：拿到的是索引** |
| `for i := range 5` | Go 1.22+：直接 range 一个数字，i 为 0~4 |

遍历字符串、数组、切片、map 都是它（切片、map 下一章正式登场）：

```go
fruits := []string{"苹果", "香蕉", "橙子"}

// 两个变量：索引, 值
for i, fruit := range fruits {
    fmt.Println(i, fruit)      // 0 苹果 / 1 香蕉 / 2 橙子
}

// 不要索引：用 _ 扔掉
for _, fruit := range fruits {
    fmt.Println(fruit)
}

// 只写一个变量：拿到的是索引
for i := range fruits {
    fmt.Println(i)             // 0 1 2
}

// Go 1.22+：直接 range 一个数字
for i := range 5 {
    fmt.Println(i)             // 0 1 2 3 4
}
```

⚠️ **本节头号坑：`for x := range 切片` 里的 x 是索引不是值**：

```go
for fruit := range fruits {
    fmt.Println(fruit)       // 打印 0 1 2，不是苹果香蕉橙子
}
```

变量名起得再像"值"，只写一个时它就是索引，而且**这不报错**，只是结果不对。要值就写全两个：`for _, fruit := range`。

## 四、break 和 continue

| 关键字 | 作用 |
|-------|------|
| `break` | 整个循环到此为止 |
| `continue` | 本轮到此为止，直接进下一轮 |

```go
for i := 1; i <= 10; i++ {
    if i%2 == 0 {
        continue        // 偶数跳过本轮
    }
    if i > 7 {
        break           // 超过 7 结束整个循环
    }
    fmt.Println(i)      // 输出 1 3 5 7
}
```

## 五、switch：一串"等于什么"的判断

一长串 `else if` 判断"等于什么"时，switch 更清晰。拆解：

```
switch day {
case 1:
    fmt.Println("星期一")    ← day == 1 时执行，执行完自动结束
case 6, 7:                  ← 一个 case 可以匹配多个值
    fmt.Println("周末")
default:                    ← 前面全都不匹配时执行
    fmt.Println("其他日子")
}
```

读作：**拿着 day 的值，从上往下挨个和 case 对号，对上哪个执行哪个；都不对就走 default**。

```go
day := 3

switch day {
case 1:
    fmt.Println("星期一")
case 2:
    fmt.Println("星期二")
case 3:
    fmt.Println("星期三")
case 6, 7:                     // 一个 case 匹配多个值
    fmt.Println("周末")
default:
    fmt.Println("其他日子")
}
```

### 无表达式 switch：替代 if-else 链

每个 case 放一个条件，从上往下第一个为 true 的执行：

```go
score := 85

switch {
case score >= 90:
    fmt.Println("优秀")
case score >= 60:
    fmt.Println("及格")      // ← score=85 命中这条就结束
default:
    fmt.Println("不及格")
}
```

switch 也支持初始化语句，与 if 相同：

```go
// 需要 import "time"
switch hour := time.Now().Hour(); {
case hour < 12:
    fmt.Println("上午好")
case hour < 18:
    fmt.Println("下午好")
default:
    fmt.Println("晚上好")
}
```

- Go 的 case **自动 break**：匹配到哪个执行完哪个就结束，忘写 break 导致"贯穿"的经典 bug 在 Go 里不存在（真想贯穿有 `fallthrough` 关键字，工作中极少见）
- 无表达式 switch 的 **case 顺序影响结果**，条件要从严到宽排。如果把 `score >= 60` 放第一个，90 分也只会打印"及格"

## 六、goto（知道存在即可）

Go 保留了 `goto`，但正式代码几乎不用，本教程不使用。

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `syntax error: unexpected else` | else 另起了一行 | `else` 跟在 `}` 后面 |
| `undefined: n` | if 初始化语句声明的变量出了 if/else 就没了 | 需要在外部使用就声明在外部 |
| `for x := range` 打印出 0 1 2 | 只写一个变量拿到的是索引 | 要值写 `for _, x :=` |
| switch 只执行了一个 case | 不是 bug，Go 自动 break | 这是特性 |
| `missing condition in if statement` | if 初始化语句后忘了写分号或条件 | 补全 `if 语句; 条件` |

## 练习

**1. 动手**：打印 1~100 中所有能被 3 整除的数（一行一个太长，用 `fmt.Print(i, " ")`）。

**2. 动手**：写一个 switch，根据月份（1-12）打印对应季节（提示：一个 case 可匹配多个值）。

**3. 猜输出**：先别运行，写出输出。

```go
sum := 0
for i := 1; i <= 5; i++ {
    if i == 3 {
        continue
    }
    sum += i
}
fmt.Println(sum)

nums := []int{10, 20, 30}
for n := range nums {
    fmt.Print(n, " ")
}
```

**4. 修 bug**：下面的代码有 2 处错误（1 处编译错误、1 处逻辑错误）：

```go
score := 95
switch {
case score >= 60:
    fmt.Println("及格")
case score >= 90:
    fmt.Println("优秀")
}
if score == 100 {
    fmt.Println("满分")
}
else {
    fmt.Println("不是满分")
}
```

**5. 挑战**：打印九九乘法表（提示：双重 for + `fmt.Printf("%d*%d=%d ", ...)`，外层控制行）。

<details>
<summary>点击查看答案</summary>

**1.**

```go
for i := 1; i <= 100; i++ {
    if i%3 == 0 {
        fmt.Print(i, " ")
    }
}
```

**2.**

```go
month := 4
switch month {
case 3, 4, 5:
    fmt.Println("春")
case 6, 7, 8:
    fmt.Println("夏")
case 9, 10, 11:
    fmt.Println("秋")
case 12, 1, 2:
    fmt.Println("冬")
default:
    fmt.Println("月份不合法")
}
```

**3. 输出：**

```
12       ← 1+2+4+5（i==3 被 continue 跳过）
0 1 2    ← range 只写一个变量拿到的是索引，不是 10 20 30
```

**4. 两处错误：**

```go
score := 95
switch {
case score >= 90:              // ① 逻辑错误：条件要从严到宽排，
    fmt.Println("优秀")         //    原来 95 会先命中 >=60 打印"及格"
case score >= 60:
    fmt.Println("及格")
}
if score == 100 {
    fmt.Println("满分")
} else {                       // ② 编译错误：else 必须跟在 } 后面
    fmt.Println("不是满分")
}
```

**5.**

```go
for i := 1; i <= 9; i++ {
    for j := 1; j <= i; j++ {
        fmt.Printf("%d*%d=%-2d ", j, i, i*j)
    }
    fmt.Println()
}
```

</details>

## 本节小结

- if / for / switch 一律**不加括号、必须大括号**；`else` 必须贴着 `}`
- if 和 switch 都支持**初始化语句**（`if err := f(); err != nil` 是 Go 的招牌姿势）
- 循环只有 for：三段式、只写条件（= while）、裸 for（无限）、for range（遍历）
- **range 只写一个变量拿到的是索引**——要值写 `for _, v := range`
- switch 自动 break；无表达式 switch 替代 else if 链，case 条件从严到宽排

下一节：[2.5 函数](05-functions.md)
