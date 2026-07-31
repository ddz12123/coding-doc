# 04 流程控制

> 本节目标：掌握 if、for、switch 的用法。记住一个知识点：Go 的循环只有 for 一种。

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

注意三点：

1. 条件**不用加括号**（加了也不报错，但 gofmt 会帮你删掉）
2. 大括号**必须有**，哪怕只有一行代码
3. `else` 必须和上一个 `}` 在同一行

```go
// ❌ 编译报错：else 不能另起一行
if x > 0 {
    fmt.Println("正数")
}
else {
    fmt.Println("非正数")
}
```

### if 的初始化语句（Go 特色）

可以在条件前先执行一条语句，用 `;` 分隔。这样声明的变量**只在 if/else 块内有效**：

```go
if n := len(s); n > 10 {
    fmt.Println("字符串很长，长度为", n)
} else {
    fmt.Println("字符串较短，长度为", n)
}
// 这里访问 n 会报错——它的作用域只在上面的 if/else 里
```

这个写法在错误处理时极其常用，先混个脸熟：

```go
if err := doSomething(); err != nil {
    fmt.Println("出错了:", err)
}
```

## 二、for 循环：Go 唯一的循环

Go 没有 while、没有 do-while，**一个 for 走天下**。它有四种形态：

### 形态 1：经典三段式

```go
for i := 0; i < 5; i++ {
    fmt.Println("第", i, "次循环")
}
```

同样：不用括号，必须有大括号。

### 形态 2：只有条件（相当于 while）

```go
n := 1
for n < 100 {
    n *= 2
}
fmt.Println(n)   // 128
```

### 形态 3：无限循环

```go
for {
    fmt.Println("停不下来！按 Ctrl+C 终止程序")
}
```

通常配合 `break` 使用：

```go
count := 0
for {
    count++
    if count >= 3 {
        break   // 跳出循环
    }
}
```

### 形态 4：for range（遍历，最常用）

用来遍历字符串、数组、切片、map、channel：

```go
// 遍历切片：返回 索引, 值
fruits := []string{"苹果", "香蕉", "橙子"}
for i, fruit := range fruits {
    fmt.Println(i, fruit)
}

// 不需要索引就用 _ 忽略
for _, fruit := range fruits {
    fmt.Println(fruit)
}

// 只要索引可以只写一个变量
for i := range fruits {
    fmt.Println(i)
}

// Go 1.22+ 还能直接 range 一个数字
for i := range 5 {
    fmt.Println(i)   // 0 1 2 3 4
}
```

## 三、break 和 continue

```go
for i := 1; i <= 10; i++ {
    if i%2 == 0 {
        continue        // 跳过本次，进入下一次循环
    }
    if i > 7 {
        break           // 直接结束整个循环
    }
    fmt.Println(i)      // 输出 1 3 5 7
}
```

## 四、switch 分支

### 基本用法

```go
day := 3

switch day {
case 1:
    fmt.Println("星期一")
case 2:
    fmt.Println("星期二")
case 3:
    fmt.Println("星期三")
case 6, 7:                     // 一个 case 可以匹配多个值
    fmt.Println("周末！")
default:
    fmt.Println("其他日子")
}
```

**重大好消息**：Go 的 case **自动 break**！匹配到一个 case 执行完就结束，不会像 C/Java 那样"贯穿"到下一个 case。（真想贯穿有 `fallthrough` 关键字，但极少用。）

### 无表达式 switch：更优雅的 if-else 链

switch 后面可以不写变量，每个 case 写条件——比一长串 else if 好看：

```go
score := 85

switch {
case score >= 90:
    fmt.Println("优秀")
case score >= 60:
    fmt.Println("及格")
default:
    fmt.Println("不及格")
}
```

### switch 也支持初始化语句

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

Go 保留了 `goto`，但实际开发中几乎不用，看到能认识就行。新手请当它不存在。

---

## 新手常见坑

1. **`else` / `else if` 另起一行** → 编译报错，必须跟在 `}` 后面
2. **给 for 的条件加括号** → 不报错但不地道，gofmt 会删掉
3. **以为 switch 要写 break** → 不用，Go 自动 break
4. **range 遍历时用错返回值**：`for i, v := range` 第一个是索引，第二个才是值。只写一个变量时拿到的是**索引**，这是高频踩坑点！

---

## 练习

1. 打印 1~100 中所有能被 3 整除的数。
2. 用 for 实现"猜数字"：设定答案为 42，用循环从 1 试到 100，找到时打印"猜到了"并 break。
3. 写一个 switch，根据月份（1-12）打印对应季节。
4. 打印九九乘法表（提示：双重 for 循环 + `fmt.Printf`）。

下一节：[05 函数](05-functions.md)
