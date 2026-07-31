# 2.4 流程控制

> 本节目标：掌握 if、for、switch。记住一个 Go 冷知识：循环只有 for 一种。

前三节的程序都是从上到下一条道跑到黑。这一节给程序装上"方向盘"：让它会**选择**（if / switch）、会**重复**（for）。Go 在这里做了大量减法——没有 while、没有三元、switch 不用 break，学起来比别的语言还快。

## 一、if 条件判断

### 基本形式

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

和 C/Java/JS 相比，Go 的 if 有三条铁律：

1. 条件**不加括号**：`if (score >= 90)` 不报错，但 gofmt 保存时会帮你删掉
2. **大括号必须有**，哪怕只有一行——"省略大括号导致的 bug"在 Go 里绝迹了
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

> 💡 第三条不是风格问题，是语法问题。原因很有趣：Go 编译器会在每行行尾自动补分号，`}` 单独一行时后面被补了 `;`，else 就断篇了。所以 Go 代码的大括号风格全世界统一——**没得吵架，这就是 Go 的性格**。

### if 的初始化语句（Go 特色）

Go 允许在条件前先执行一条语句，用 `;` 隔开。这样声明的变量**只活在 if/else 块里**：

```go
if n := len(s); n > 10 {
    fmt.Println("字符串很长，长度为", n)
} else {
    fmt.Println("字符串较短，长度为", n)
}
// 这里再访问 n → undefined: n（它的作用域只在上面）
```

好处：临时变量用完即扔，不污染外面。这个写法在**错误处理**里是绝对主力，第四章你会一天写十遍，先混脸熟：

```go
if err := doSomething(); err != nil {
    fmt.Println("出错了:", err)
}
```

## 二、for：Go 唯一的循环

别的语言有 while、do-while、for、foreach……Go 全部砍掉，只留一个 `for`，靠四种形态覆盖所有场景。

### 形态 1：经典三段式

```go
for i := 0; i < 5; i++ {
    fmt.Println("第", i, "次循环")
}
```

拆解三段：

```
for  i := 0 ;  i < 5 ;  i++  {
      ↑          ↑        ↑
   初始化      继续条件   每轮收尾
  （跑一次） （false就停）（每轮末尾执行）
```

同样不加括号、必须有大括号。

### 形态 2：只写条件（就是别家的 while）

```go
n := 1
for n < 100 {
    n *= 2
}
fmt.Println(n)   // 128
```

"不知道要循环几次、只知道什么时候停"就用它。

### 形态 3：什么都不写（无限循环）

```go
for {
    // 永远跑下去，直到 break 或 Ctrl+C
}
```

看着吓人，其实是正经写法——服务器"永远等待请求"、游戏"一直读玩家输入"都靠它，配合 `break` 收场：

```go
count := 0
for {
    count++
    if count >= 3 {
        break   // 跳出循环
    }
}
```

### 形态 4：for range（遍历，出场率最高）

遍历字符串、数组、切片、map 都是它（后两个下一章正式登场）：

```go
fruits := []string{"苹果", "香蕉", "橙子"}

// 两个变量：索引, 值
for i, fruit := range fruits {
    fmt.Println(i, fruit)      // 0 苹果 / 1 香蕉 / 2 橙子
}

// 不要索引：用 _ 扔掉（还记得空白标识符吗）
for _, fruit := range fruits {
    fmt.Println(fruit)
}

// 只写一个变量：拿到的是索引！
for i := range fruits {
    fmt.Println(i)             // 0 1 2
}

// Go 1.22+：直接 range 一个数字
for i := range 5 {
    fmt.Println(i)             // 0 1 2 3 4
}
```

> ⚠️ **本节头号坑：`for x := range 切片` 里的 x 是索引不是值！**
>
> ```go
> for fruit := range fruits {
>     fmt.Println(fruit)       // 打印 0 1 2，不是苹果香蕉橙子！
> }
> ```
>
> 变量名起得再像"值"，只写一个时它就是索引。而且**这不报错**，只是结果莫名其妙——典型的"不报错的错"。要值就写全两个：`for _, fruit := range`。

## 三、break 和 continue

- `break`：整个循环到此为止
- `continue`：本轮到此为止，直接进下一轮

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

## 四、switch 分支

### 基本用法

一长串 `else if` 判断"等于什么"时，switch 更清爽：

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
    fmt.Println("周末！")
default:
    fmt.Println("其他日子")
}
```

**给 C/Java 转来的重大好消息**：Go 的 case **自动 break**！匹配到哪个执行完哪个就结束，忘写 break 导致"贯穿"的经典 bug 在 Go 里不存在。（真想贯穿有 `fallthrough` 关键字，工作中极少见。）

### 无表达式 switch：更漂亮的 if-else 链

switch 后面可以什么都不写，每个 case 放一个条件，**从上往下第一个为 true 的执行**：

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

注意 case 的**顺序有讲究**：条件从严到宽排。如果把 `score >= 60` 放第一个，90 分也只会打印"及格"。

### switch 也支持初始化语句

和 if 一样的套路：

```go
switch hour := time.Now().Hour(); {
case hour < 12:
    fmt.Println("上午好")
case hour < 18:
    fmt.Println("下午好")
default:
    fmt.Println("晚上好")
}
```

## 五、goto（知道存在即可）

Go 保留了 `goto`，但正经代码几乎不用。新手请当它不存在。

## 本节报错/怪象速查表

| 现象 | 人话翻译 |
|------|----------|
| `syntax error: unexpected else` | else 另起了一行，必须跟在 `}` 后面 |
| `undefined: n` | if 初始化语句声明的变量出了 if/else 就没了 |
| `for x := range` 打印出 0 1 2 | 只写一个变量拿到的是索引，值要写 `for _, x :=` |
| switch 只执行了一个 case | 不是 bug，Go 自动 break，这是特性 |
| `missing condition in if statement` | if 初始化语句后忘了写分号或条件 |

## 练习

**1. 动手**：打印 1~100 中所有能被 3 整除的数（一行一个打太长，试试 `fmt.Print(i, " ")`）。

**2. 动手**：写一个 switch，根据月份（1-12）打印对应季节（提示：一个 case 可匹配多个值）。

**3. 猜输出**：先别运行，猜猜打印什么？

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

```go
// 1
for i := 1; i <= 100; i++ {
    if i%3 == 0 {
        fmt.Print(i, " ")
    }
}

// 2
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

```go
// 5
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
