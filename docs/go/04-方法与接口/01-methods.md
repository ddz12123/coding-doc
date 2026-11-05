# 4.1 方法

> 本节目标：学会给类型定义方法，彻底分清值接收者和指针接收者——这是 Go 新手 bug 榜的第一名。

## 一、从一个问题开始：函数散落，名字越写越长

用第二章的函数操作结构体，是这样写的：

```go
func addBonusStudent(s *Student, bonus float64) { s.Score += bonus }
func printStudent(s *Student)                   { fmt.Printf("%+v\n", s) }
func printTeacher(t *Teacher)                   { fmt.Printf("%+v\n", t) }  // 函数名不能重复，只能加后缀区分
```

两个痛点：

1. **函数散落**：哪些函数操作 Student，全靠命名约定和肉眼扫
2. **名字冲突**：Go 不允许同名函数，`printStudent`、`printTeacher`、`printCourse` 越写越长

理想状态是 `stu.AddBonus(5)`、`stu.Print()`——**把函数挂到类型身上**，谁的操作跟谁走。这就是**方法（method）**：挂在某个类型上的函数，不同类型的同名方法互不冲突。

## 二、定义方法：func 和方法名之间的那对括号

方法和函数只差一处：`func` 和方法名之间多一对括号，声明**接收者（receiver）**——说人话：接收者就是"这个方法属于谁"。

```
func (s Student) Hello() {
      ↑ ↑        ↑
      接收者变量 —— 代表"调用方法的那个值"，方法体里直接用它
        接收者类型 —— 方法挂在这个类型身上，这里就是 Student
                 方法名 —— 调用时写 stu.Hello()
}
```

读作：**给 Student 类型定义一个 Hello 方法**，方法体里的 s 就是调用它的那个值。

```go
type Student struct {
    Name  string
    Score float64
}

func (s Student) Hello() {
    fmt.Println("大家好，我是", s.Name)
}

func main() {
    stu := Student{Name: "张三", Score: 85}
    stu.Hello()    // 大家好，我是 张三（此刻方法里的 s 是 stu 的拷贝）
}
```

三条惯例，一次记牢：

- 接收者名用类型首字母小写：`s`、`t`、`acc`。作用相当于 Python 的 `self`、Java 的 `this`，但 Go 要求**显式命名**
- 方法**不写在结构体大括号里**，独立定义在外，靠接收者关联；学过 Python/Java 的注意这个反差
- 不同类型可以有同名方法：`Student` 和 `Teacher` 各有各的 `Print()`，互不干扰

方法名的可见性和函数一致（2.1 讲过）：大写开头对外可见，小写仅限包内。

## 三、值接收者与指针接收者（本节核心）

先看一个"调了却没用"的方法：

```go
func (s Student) SetScoreBad(score float64) {
    s.Score = score      // 改的是拷贝！
}

stu := Student{Name: "张三", Score: 85}
stu.SetScoreBad(100)
fmt.Println(stu.Score)   // 85 —— 没变
```

问题出在接收者写法上。两种写法只差一颗 `*`：

```
func (s Student)  M()   ← 值接收者：s 是调用者的拷贝
func (s *Student) M()   ← 指针接收者：s 指向调用者的原件
        差别就是这颗 * —— 有了它，s 拿到的是地址，改 s.Score 改到的是原值
```

读作：`func (s *Student) M()` —— 给 *Student 定义方法 M。想修改调用者本人，接收者就带 `*`。

本质就是 3.3、3.4 反复讲的传值 vs 传指针，只是挪到了接收者的位置：

| 写法 | 方法内拿到的是 | 修改字段的影响 |
|------|------|------|
| `func (s Student) M()` | 调用者的**拷贝** | 不影响原值 |
| `func (s *Student) M()` | 调用者的**指针** | 影响原值 |

指针接收者改到原件（`s.Score` 自动解引用，3.4 讲过）：

```go
func (s *Student) SetScore(score float64) {
    s.Score = score      // 通过指针改到原件
}

stu := Student{Name: "张三", Score: 85}
stu.SetScore(100)
fmt.Println(stu.Score)   // 100 —— 变了
```

调用侧永远直接点号，`&` 和 `*` 的转换 Go 自动完成：

```go
p := &Student{Name: "李四"}
p.Hello()                // 值接收者方法，指针照样调用，自动解引用
```

> ⚠️ **不报错的错**：值接收者方法里修改字段，编译通过、运行不崩、就是不生效。发现"调了方法但字段没变"，第一反应：接收者是不是忘了加 `*`。

### 接收者怎么选

| 情况 | 选择 |
|------|------|
| 方法要**修改**接收者 | 必须指针接收者 |
| 结构体**很大** | 指针接收者（免拷贝） |
| 只读的小结构体 | 都行 |

黄金规则：**同一个类型的所有方法，接收者要么全值要么全指针，不要混用**。混用能编译，但下一节讲接口时会埋雷；拿不准就统一用指针接收者。

## 四、构造函数：NewXxx 模式

Go 没有构造函数语法，惯例是写一个 `New类型名` 的普通函数，返回结构体指针：

```
func NewAccount(owner string) *Account
     ↑                        ↑
     New + 类型名 —— 全社区统一的命名惯例，看到它就等于看到构造函数
                             返回指针 —— 调用方拿到的是共享的账户对象
```

读作：定义一个 NewAccount 函数，传入 owner，返回指向 Account 的指针。

```go
type Account struct {
    Owner   string
    Balance float64
}

// 构造函数：New + 类型名
func NewAccount(owner string) *Account {
    a := Account{
        Owner:   owner,
        Balance: 0,
    }
    return &a    // 返回局部变量的指针，完全安全（3.4 讲过）
}

func main() {
    acc := NewAccount("张三")
    fmt.Println(acc.Owner)    // 张三
}
```

- 返回局部变量的指针在 Go 里完全安全（3.4 结尾的伏笔在这里兑现）
- 实际代码常压缩成一行：`return &Account{Owner: owner}`
- 第三方库的 `client := redis.NewClient(...)` 就是这个模式——**看到 `NewXxx`，等于看到构造函数**

## 五、完整示例：银行账户

数据（结构体）+ 行为（方法）+ error（2.5 的多返回值模式），合起来就是一个完整的 Go "类"：

```go
package main

import "fmt"

type Account struct {
    Owner   string
    Balance float64
}

func NewAccount(owner string) *Account {
    return &Account{Owner: owner}
}

// 存款
func (a *Account) Deposit(amount float64) {
    a.Balance += amount
}

// 取款：可能失败，返回 error
func (a *Account) Withdraw(amount float64) error {
    if amount > a.Balance {
        return fmt.Errorf("余额不足：当前 %.2f，想取 %.2f", a.Balance, amount)
    }
    a.Balance -= amount
    return nil
}

func (a *Account) String() string {
    return fmt.Sprintf("%s 的账户，余额 %.2f 元", a.Owner, a.Balance)
}

func main() {
    acc := NewAccount("张三")
    acc.Deposit(150)
    fmt.Println(acc)          // 张三 的账户，余额 150.00 元

    if err := acc.Withdraw(1000); err != nil {
        fmt.Println("取款失败：", err)
    }
}
```

`fmt.Println(acc)` 打印的不是 `&{张三 150}` 而是自定义文本：定义了 `String() string` 方法的类型，fmt 会自动调用它。背后是**接口**在工作，下一节展开原理。

## 六、方法不是结构体的专利

任何用 `type` 定义的类型都能挂方法，包括基于基础类型自定义的类型：

```
type Celsius float64
     ↑       ↑
     新类型名 —— 从此它和 float64 是两种不同的类型，可以给它挂方法
             基础类型 —— Celsius 底下就是一个 float64
```

读作：基于 float64 定义一个新类型 Celsius。

```go
type Celsius float64      // 基于 float64 自定义"摄氏度"类型

func (c Celsius) ToFahrenheit() float64 {
    return float64(c)*9/5 + 32
}

func main() {
    temp := Celsius(36.6)
    fmt.Println(temp.ToFahrenheit())   // 97.88
}
```

> ⚠️ **只能给本包内定义的类型加方法**。想给 `int`、`string` 或别的包的类型加方法，先 `type MyInt int` 套一层自己的类型。

## 七、嵌入类型的方法提升

匿名嵌入的类型，其方法会和字段一样**提升到外层**（字段提升见 3.3）：

```go
type Dog struct {
    Animal          // 匿名嵌入：Dog 自动获得 Animal 的字段和方法
}
```

```go
type Animal struct{ Name string }

func (a Animal) Eat() {
    fmt.Println(a.Name, "在吃东西")
}

type Dog struct {
    Animal
}

func main() {
    d := Dog{Animal{Name: "旺财"}}
    d.Eat()         // 旺财 在吃东西 —— Dog 没写一行方法，直接用 Animal 的
}
```

- 想复用能力，把有这个能力的类型嵌进来即可，这就是**组合**
- Dog 可以定义自己的 `Eat()` 覆盖 Animal 的版本（**外层优先**），效果类似其他语言的重写，机制就是就近查找

## 八、常用写法速查

| 需求 | 写法 |
|------|------|
| 定义方法 | `func (s Student) Hello() {}` |
| 修改接收者 | `func (s *Student) SetScore(v float64) {}` |
| 构造函数 | `func NewAccount(owner string) *Account` |
| 给内置类型挂方法 | `type MyInt int` 后再定义方法 |
| 自定义打印格式 | `func (a Account) String() string` |

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `cannot define new methods on non-local type int` | 想给内置类型或别的包的类型加方法 | 先 `type MyInt int` 自定义类型 |
| `stu.SetScore undefined` | 方法名拼错，或方法是小写开头却在包外调用 | 检查拼写和首字母大小写 |
| `invalid receiver type *[]int` | 接收者不能是指针的指针、切片等 | 接收者只能是本包的具名类型或其指针 |
| 调了方法但字段没变（不报错） | 值接收者拿的是拷贝 | 接收者加 `*` |

## 练习

**1. 动手**：定义 `Rectangle` 结构体（Width、Height float64），完成：

- 值接收者方法 `Area() float64` 求面积
- 指针接收者方法 `Scale(factor float64)` 把长宽放大 factor 倍
- 构造函数 `NewRectangle(w, h float64) *Rectangle`
- `String() string` 方法，返回 `"矩形 3x4，面积 12"` 格式，用 `fmt.Println` 验证自动调用

**2. 猜输出**：先别运行，判断打印结果。

```go
type Counter struct{ n int }

func (c Counter) IncBad()   { c.n++ }
func (c *Counter) IncGood() { c.n++ }

func main() {
    c := Counter{}
    c.IncBad()
    c.IncBad()
    c.IncGood()
    fmt.Println(c.n)
}
```

<details>
<summary>点击查看答案</summary>

输出 `1`。两次 `IncBad()` 是值接收者，改的都是拷贝，白改；只有 `IncGood()` 是指针接收者，真正把 n 从 0 改成 1。这题浓缩了本节最重要的坑。

</details>

**3. 修 bug**：下面的购物车"添加商品后总数还是 0"，找出问题并修复：

```go
type Cart struct {
    Items []string
}

func (c Cart) Add(item string) {
    c.Items = append(c.Items, item)
}

func main() {
    cart := Cart{}
    cart.Add("键盘")
    cart.Add("鼠标")
    fmt.Println(len(cart.Items))   // 0
}
```

<details>
<summary>点击查看答案</summary>

`Add` 是**值接收者**，方法里的 `c` 是 cart 的拷贝，`append` 的结果赋给了拷贝的 `Items` 字段，方法一结束就丢了。改成指针接收者：

```go
func (c *Cart) Add(item string) {
    c.Items = append(c.Items, item)
}
```

补充：3.1 讲过切片赋值共享底层数组，但共享的只是**已有的元素**；`append` 可能搬去新数组，而且 `c.Items = ...` 这个**赋值本身**落在拷贝的字段上——想让赋值生效，必须拿到原件，还是得指针接收者。

</details>

## 本节小结

- 方法 = 函数 + 接收者：`func (s Student) Hello()`，把函数挂到类型上，不同类型的同名方法互不冲突
- **值接收者拿拷贝、改不动原值；指针接收者改到原件**；调用侧永远直接点号，`&`/`*` 的选择只发生在定义时
- 要修改接收者就用指针接收者；同一类型的方法接收者要统一，不要混用
- 构造函数惯例：`New类型名` 函数返回结构体指针
- 任何 `type` 定义的类型都能挂方法，但只能给本包类型加；嵌入类型的字段和方法都会提升，外层优先

下一节：[4.2 接口](02-interfaces.md)
