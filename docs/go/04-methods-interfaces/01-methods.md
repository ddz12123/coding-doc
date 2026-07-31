# 01 方法

> 本节目标：学会给类型定义方法，理解值接收者和指针接收者的区别。

## 一、方法是什么？

**方法 = 绑定在某个类型上的函数。**

之前我们这样写：

```go
func addBonus(s *Student, bonus float64) { ... }   // 普通函数
addBonus(&stu, 5)                                   // 调用
```

用方法可以写成：

```go
stu.AddBonus(5)    // "让学生自己加分" —— 更符合直觉
```

## 二、定义方法

在 `func` 和方法名之间加一个**接收者**（receiver）声明：

```go
type Student struct {
    Name  string
    Score float64
}

//   ↓ 接收者：表示这个方法属于 Student 类型
func (s Student) Hello() {
    fmt.Println("大家好，我是", s.Name)
}

func main() {
    stu := Student{Name: "张三", Score: 85}
    stu.Hello()      // 大家好，我是 张三
}
```

- `(s Student)` 就是接收者，`s` 相当于其他语言里的 `this`/`self`，但需要显式命名（Go 惯例用类型首字母小写，如 `s`）
- 调用方式：`实例.方法名()`

## 三、值接收者 vs 指针接收者（本节核心！）

接收者可以是值，也可以是指针，区别和函数传参完全一样：

### 值接收者：拿到拷贝，改不了原件

```go
func (s Student) SetScoreBad(score float64) {
    s.Score = score          // 改的是拷贝！
}

stu := Student{Name: "张三", Score: 85}
stu.SetScoreBad(100)
fmt.Println(stu.Score)       // 85 —— 没变
```

### 指针接收者：能修改原件

```go
func (s *Student) SetScore(score float64) {
    s.Score = score          // 通过指针修改原结构体
}

stu := Student{Name: "张三", Score: 85}
stu.SetScore(100)            // 注意：不用写 (&stu).SetScore，Go 自动取地址
fmt.Println(stu.Score)       // 100 —— 变了！
```

**Go 的贴心之处**：值调用指针方法、指针调用值方法，编译器都会自动转换，写代码时不用操心 `&` 和 `*`。

### 怎么选？

| 情况 | 选择 |
|------|------|
| 方法需要修改接收者 | 必须指针接收者 |
| 结构体较大 | 指针接收者（避免拷贝） |
| 其他情况 | 都可以，但**保持一致** |

**实用建议**：同一个类型的所有方法，要么全用值接收者，要么全用指针接收者，不要混用。拿不准就**统一用指针接收者**，不会出错。

## 四、完整示例：银行账户

```go
package main

import (
    "fmt"
)

type Account struct {
    Owner   string
    Balance float64
}

// 存款
func (a *Account) Deposit(amount float64) {
    a.Balance += amount
}

// 取款（可能失败，返回 error）
func (a *Account) Withdraw(amount float64) error {
    if amount > a.Balance {
        return fmt.Errorf("余额不足：当前 %.2f，想取 %.2f", a.Balance, amount)
    }
    a.Balance -= amount
    return nil
}

// 查询（只读，值接收者也行，这里为了统一用指针）
func (a *Account) String() string {
    return fmt.Sprintf("%s 的账户，余额 %.2f 元", a.Owner, a.Balance)
}

func main() {
    acc := &Account{Owner: "张三", Balance: 100}

    acc.Deposit(50)
    fmt.Println(acc)          // 张三 的账户，余额 150.00 元

    if err := acc.Withdraw(1000); err != nil {
        fmt.Println("取款失败：", err)
    }
}
```

> 彩蛋：定义了 `String() string` 方法的类型，`fmt.Println` 会自动调用它来打印——这其实是接口的功劳，下一节揭晓。

## 五、方法可以定义在任何自定义类型上

不只是结构体，任何 `type` 定义的类型都能有方法：

```go
type Celsius float64      // 基于 float64 自定义一个"摄氏度"类型

func (c Celsius) ToFahrenheit() float64 {
    return float64(c)*9/5 + 32
}

func main() {
    temp := Celsius(36.6)
    fmt.Println(temp.ToFahrenheit())   // 97.88
}
```

限制：只能给**本包内定义的类型**加方法，不能给 `int`、`string` 或别的包的类型直接加。

## 六、嵌入结构体的方法提升

上一章讲的匿名嵌入，方法也会被"提升"：

```go
type Animal struct {
    Name string
}

func (a Animal) Eat() {
    fmt.Println(a.Name, "在吃东西")
}

type Dog struct {
    Animal          // 嵌入
}

func main() {
    d := Dog{Animal{Name: "旺财"}}
    d.Eat()         // 旺财 在吃东西 —— Dog 直接拥有了 Animal 的方法
}
```

这就是 Go 的"组合"：不需要继承，把已有类型嵌进来就获得它的全部能力。

---

## 新手常见坑

1. **用值接收者却期望修改生效**：改不了！要修改必须指针接收者。这是 Go 新手 bug 榜第一名
2. **同类型方法混用值/指针接收者**：能编译，但容易出 bug 且不规范，统一成一种
3. **想给 int、string 加方法**：不行，先 `type MyInt int` 自定义类型

---

## 练习

1. 定义 `Rectangle` 结构体（Width、Height），添加方法 `Area()` 和 `Perimeter()` 计算面积和周长。
2. 给 `Rectangle` 添加指针接收者方法 `Scale(factor float64)`，把长宽都放大 factor 倍，验证原结构体确实被修改。
3. 定义 `type MyInt int`，给它加一个 `IsEven() bool` 方法判断是否为偶数。
4. 给第 4 题的 `Rectangle` 添加 `String() string` 方法，返回 `"矩形 3x4，面积 12"` 这样的描述，然后直接 `fmt.Println(rect)` 看效果。

下一节：[02 接口](02-interfaces.md)
