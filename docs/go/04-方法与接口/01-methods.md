# 4.1 方法

> 本节目标：学会给类型定义方法，彻底搞懂值接收者和指针接收者的区别——这是 Go 新手 bug 榜的第一名。

第三章结束时，我们手里有了结构体（存数据）和指针（让函数改到原件）。但代码写多了会发现一个别扭的地方，这一节就来解决它。

## 一、为什么需要方法

用第三章的知识给学生写几个操作函数：

```go
type Student struct {
    Name  string
    Score float64
}

func addBonusStudent(s *Student, bonus float64) { s.Score += bonus }
func printStudent(s *Student)                   { fmt.Printf("%+v\n", s) }

// 后来又有了老师……
type Teacher struct{ Name string }

func printTeacher(t *Teacher) { fmt.Printf("%+v\n", t) }
// 函数名不能重复，只好 printStudent、printTeacher、printCourse……
```

两个痛点：

1. **函数散落一地**：哪些函数是操作 Student 的？全靠命名约定和肉眼扫
2. **名字打架**：Go 不允许同名函数，`print` 这种通用动词只能加后缀区分，越写越长

我们想要的是：**把函数"挂"到类型身上**——`stu.AddBonus(5)`、`stu.Print()`，谁的操作跟谁走，不同类型的同名方法互不冲突。这就是**方法（method）**。

## 二、定义方法：接收者

方法和函数只差一个东西：在 `func` 和函数名之间多一对括号，声明**接收者（receiver）**：

```go
func (s Student) Hello() {
    fmt.Println("大家好，我是", s.Name)
}
```

拆解语法：

```
func  (s Student)  Hello()  {
 ↑        ↑           ↑
关键字   接收者      方法名
        "这个方法属于 Student 类型，
         方法体里用 s 代表调用它的那个学生"
```

调用时用点号，和访问字段一个姿势：

```go
func main() {
    stu := Student{Name: "张三", Score: 85}
    stu.Hello()      // 大家好，我是 张三
                     // 这一刻，方法里的 s 就是 stu（的拷贝）
}
```

几个约定：

- `s` 相当于 Python 的 `self`、Java 的 `this`，但 Go 要求**显式命名**，惯例用类型首字母小写（`s`、`t`、`acc`）
- 方法名一样遵循大小写规则：大写开头对外可见，小写只能包内用（2.1 讲过）
- 不同类型可以有同名方法：`Student` 和 `Teacher` 各有各的 `Print()`，互不干扰——痛点 2 解决

> 💡 学过 Python/Java 的注意：方法**不写在结构体大括号里面**，而是独立定义在外面，靠接收者关联。结构体只管数据，方法只管行为，物理上分开、逻辑上绑定。

## 三、值接收者 vs 指针接收者（本节核心）

接收者括号里可以写 `s Student`，也可以写 `s *Student`。这不是风格差异，**行为完全不同**——其实就是 3.3、3.4 反复讲的传值 vs 传指针，换了个位置重演：

### 值接收者：拿到的是拷贝

```go
func (s Student) SetScoreBad(score float64) {
    s.Score = score      // 改的是拷贝！
}

stu := Student{Name: "张三", Score: 85}
stu.SetScoreBad(100)
fmt.Println(stu.Score)   // 85 —— 没变
```

> ⚠️ **不报错的错，Go 新手 bug 榜第一名**：值接收者的方法里修改字段，编译通过、运行不崩、就是不生效。以后发现"调了方法但字段没变"，第一反应：看接收者是不是忘了加 `*`。

### 指针接收者：改到原件

```go
func (s *Student) SetScore(score float64) {
    s.Score = score      // 通过指针改到原件（3.4 讲过：s.Score 自动解引用）
}

stu := Student{Name: "张三", Score: 85}
stu.SetScore(100)
fmt.Println(stu.Score)   // 100 —— 变了！
```

### 调用时不用操心 & 和 *

按 3.4 的逻辑，指针接收者的方法似乎该这么调：`(&stu).SetScore(100)`。但上面直接写 `stu.SetScore(100)` 也过了——**Go 编译器自动帮你取地址**。反过来，指针调用值接收者的方法也会自动解引用：

```go
p := &Student{Name: "李四"}
p.Hello()                // 值接收者方法，指针照样调，自动 *p
```

所以**调用侧永远无脑点号**，`&`/`*` 的选择只发生在**定义方法时**。

### 怎么选？决策表

| 情况 | 选择 |
|------|------|
| 方法要**修改**接收者 | 必须指针接收者 |
| 结构体**很大** | 指针接收者（免拷贝） |
| 只读的小结构体 | 都行 |

外加一条黄金规则：**同一个类型的所有方法，接收者要么全值要么全指针，不要混用**（混用能编译，但下一节讲接口时会埋雷）。拿不准就统一用指针接收者，错不到哪去。

## 四、构造函数：NewXxx 模式

3.4 结尾埋的伏笔——"返回局部变量的指针完全安全"——在这里兑现。

结构体创建时经常要做点初始化工作（校验参数、设默认值），Go 没有专门的构造函数语法，但有个人人遵守的惯例：**写一个 `New类型名` 的普通函数，返回结构体指针**：

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
    return &a        // 返回局部变量的指针，在 Go 里完全安全（3.4 讲过）
}

func main() {
    acc := NewAccount("张三")
    fmt.Println(acc.Owner)    // 张三
}
```

实际代码里常压缩成一行 `return &Account{Owner: owner}`。以后用第三方库看到 `client := redis.NewClient(...)`，就是这个模式——**看到 `NewXxx`，等于看到构造函数**。

## 五、完整示例：银行账户

把本节和 2.5 的 error 串起来，这就是一个五脏俱全的 Go "类"：

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

// 取款：可能失败，返回 error（2.5 的多返回值模式）
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

> 🥚 彩蛋：为什么 `fmt.Println(acc)` 打印的不是 `&{张三 150}` 而是那句人话？因为定义了 `String() string` 方法的类型，fmt 会自动调用它。这背后是**接口**在工作——下一节揭晓原理。

## 六、方法不是结构体的专利

任何用 `type` 定义的类型都能挂方法：

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

限制只有一条：**只能给本包内定义的类型加方法**。想给 `int`、`string` 或别的包的类型加？先 `type MyInt int` 套一层自己的类型。

## 七、嵌入类型的方法提升

3.3 讲匿名嵌入时说"字段会提升到外层"，方法同样提升：

```go
type Animal struct{ Name string }

func (a Animal) Eat() {
    fmt.Println(a.Name, "在吃东西")
}

type Dog struct {
    Animal          // 匿名嵌入
}

func main() {
    d := Dog{Animal{Name: "旺财"}}
    d.Eat()         // 旺财 在吃东西 —— Dog "天生会"Animal 的所有方法
}
```

Dog 没写一行方法却会 `Eat()`——这就是**组合**的威力：想复用能力，把有这个能力的类型嵌进来即可。Dog 还可以定义自己的 `Eat()` 覆盖掉 Animal 的版本（外层优先），效果神似"重写"，但机制简单得多：就是就近查找。

## 报错速查表

| 报错 | 人话 | 解决 |
|------|------|------|
| `cannot define new methods on non-local type int` | 想给内置类型/别的包的类型加方法 | 先 `type MyInt int` 自定义类型 |
| `stu.SetScore undefined` | 方法名拼错，或方法是小写开头且你在包外调用 | 检查拼写和首字母大小写 |
| `invalid receiver type *[]int` | 接收者不能是指针的指针、切片等 | 接收者只能是本包的具名类型或其指针 |
| 调了方法但字段没变（不报错） | 值接收者拿的是拷贝 | 接收者加 `*` |

## 练习

**1. 动手**：定义 `Rectangle` 结构体（Width、Height float64），完成：
- 值接收者方法 `Area() float64` 求面积
- 指针接收者方法 `Scale(factor float64)` 把长宽放大 factor 倍
- 构造函数 `NewRectangle(w, h float64) *Rectangle`
- `String() string` 方法，返回 `"矩形 3x4，面积 12"` 格式，用 `fmt.Println` 验证自动调用

**2. 猜输出**：先别运行，猜猜打印什么？

```go
type Counter struct{ n int }

func (c Counter) IncBad()  { c.n++ }
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
<summary>点击看答案</summary>

输出 `1`。

两次 `IncBad()` 是值接收者，改的都是拷贝，白干；只有 `IncGood()` 是指针接收者，真正把 n 从 0 改成 1。这题浓缩了本节最重要的坑。

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
    fmt.Println(len(cart.Items))   // 0 ??
}
```

<details>
<summary>点击看答案</summary>

`Add` 是**值接收者**，方法里的 `c` 是 cart 的拷贝，`append` 的结果赋给了拷贝的 `Items` 字段，方法一结束就丢了。改成指针接收者：

```go
func (c *Cart) Add(item string) {
    c.Items = append(c.Items, item)
}
```

有人会疑惑："3.1 不是说切片是共享的吗？" 共享的是**底层数组里已有的元素**；但 `append` 可能换新数组，而且 `c.Items = ...` 这个**赋值本身**落在拷贝的字段上——想让赋值生效，必须拿到原件，还是得指针接收者。

</details>

---

🎉 有了"数据（结构体）+ 行为（方法）"，Go 的"面向对象"已经完成三分之二。最后一块拼图——也是 Go 最精髓的设计——下一节：[4.2 接口](02-interfaces.md)
