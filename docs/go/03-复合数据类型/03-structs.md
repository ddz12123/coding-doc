# 3.3 结构体

> 本节目标：掌握结构体的定义、创建、字段访问、值语义与嵌套——Go 组织数据的核心方式，第四章方法与接口全部建立在它之上。

## 一、对比：三个散装变量 vs 一个结构体

切片解决"一串同类数据"（3.1），map 解决"按键查值"（3.2）。要描述**一个东西**——学生有姓名、年龄、分数，类型各不相同——两者都不顺手：

```go
// 散装变量：一个人三个变量，三个人九个变量，还得时刻记着谁配谁
name1, age1, score1 := "张三", 18, 92.5
name2, age2, score2 := "李四", 19, 85.0

// 想要的效果：一个人的信息打包成一个值（结构体，下面马上定义）
s1 := Student{Name: "张三", Age: 18, Score: 92.5}
```

| 现有方案 | 问题 |
|---------|------|
| 三个散装变量 `name`、`age`、`score` | 学生一多变量爆炸（name2、age2、score2……），无法整体传递 |
| `map[string]string{"name": "张三", "age": "18"}` | 值类型只能一种（年龄被迫存成字符串）；键拼错 `student["nmae"]` 不报错；哪些键合法全靠记忆 |

**结构体**提供**模板**：一个类型有哪些字段、各是什么类型，定义时固定，由编译器检查。

## 二、定义结构体：先画模板

### 拆解一下定义

```
type Student struct {
↑    ↑       ↑
             struct 关键字 —— 大括号里一行一个字段，列出类型携带的所有数据
     类型名 —— 从这行起，Student 和 int、string 一样是合法类型
type 关键字 —— 定义一个新类型
    Name  string
    Age   int
    Score float64
}
```

读作：定义一个新类型 Student，它是一个结构体。大括号里每行是"字段名 + 字段类型"，名字在前、类型在后（和 2.1 的变量声明同一个方向）；Name、Age、Score 叫**字段**（field）。

`type` 的意义：从此 `Student` 能做类型能做的一切——声明变量、当函数参数、塞进切片和 map（见 七）。

> 💡 **Go 没有 class**。结构体（存数据）+ 下一章的方法（绑行为）+ 接口（抽象），三样合起来覆盖面向对象的核心能力。

### 定义完就能用

```go
var s Student        // Student 已是合法类型
s.Name = "张三"
fmt.Println(s.Name)  // 张三
```

## 三、创建实例：字段名初始化

### 拆解一下初始化

```
Student{Name: "张三", Age: 18}
↑      ↑
       大括号里写"字段名: 值"，逗号隔开——写明了字段名，顺序随意、少写也行
类型名 —— 按 Student 这个模板，造出一个具体的实例
```

读作：按 Student 模板造一个实例，Name 字段是"张三"，Age 字段是 18。没写的字段自动零值。

| 写法 | 说明 |
|------|------|
| `Student{Name: "张三", Age: 18}` | **字段名初始化（推荐）**：清晰，字段顺序随意，少几个也行 |
| `Student{Name: "李四"}` | 只给部分字段，其余自动零值 |
| `var s Student` | 零值结构体，之后逐个赋值 |
| `Student{"赵六", 20, 88.0}` | 按顺序初始化（不推荐：字段一多必错位） |

```go
// 方式 1：字段名初始化
s1 := Student{
    Name:  "张三",
    Age:   18,
    Score: 92.5,       // ⚠️ 换行写时最后一行的逗号不能少
}

// 方式 2：只给部分字段
s2 := Student{Name: "李四"}     // Age=0, Score=0
fmt.Printf("%+v\n", s2)         // {Name:李四 Age:0 Score:0}

// 方式 3：零值结构体
var s3 Student                  // 所有字段都是各自的零值
s3.Name = "王五"

// 方式 4：按顺序初始化
s4 := Student{"赵六", 20, 88.0}
```

> 💡 **结构体没有 nil 问题**：`var s3 Student` 直接可用，每个字段都是零值——对比 3.2 的 nil map 陷阱。按顺序初始化则必须写全字段、顺序正确，少写报 `too few values in struct literal`。

## 四、访问字段：点号

| 操作 | 语法 | 说明 |
|------|------|------|
| 读字段 | `s.Name` | 点号访问 |
| 改字段 | `s.Score = 95.0` | 直接赋值 |
| 调试打印 | `fmt.Printf("%+v\n", s)` | 带字段名打印整个结构体 |

```go
s := Student{Name: "张三", Age: 18, Score: 92.5}

fmt.Println(s.Name)      // 张三
s.Score = 95.0           // 直接赋值修改

fmt.Printf("%+v\n", s)   // {Name:张三 Age:18 Score:95}
fmt.Printf("%v\n", s)    // {张三 18 95} —— 不带字段名
```

- `%+v` 带字段名，`%v` 只打值；字段一多，用 `%+v` 才分得清谁是谁
- 访问写错字段名是**编译错误**（如 `s1.Nmae undefined`）。对比 map 拼错键默默返回零值——结构体的手误在编译期就被发现

## 五、结构体是值类型（本节最重要的知识点）

3.1 的切片、3.2 的 map 赋值都是"共享"；结构体**完全相反**——赋值和传参都是**整体复制**：

| 类型 | 赋值/传参行为 |
|------|--------------|
| int、float64、string、bool、数组、**结构体** | **复制**，各改各的 |
| 切片、map | **共享**底层数据，一改都变 |

赋值复制：

```go
a := Student{Name: "张三", Age: 18}
b := a              // 把 a 完整拷贝一份，两块独立内存
b.Name = "李四"
fmt.Println(a.Name) // 张三 —— a 不受影响
```

传参也是复制，函数改不动原件：

```go
func birthday(s Student) {
    s.Age++             // 改的是拷贝
}

func main() {
    s := Student{Name: "张三", Age: 18}
    birthday(s)
    fmt.Println(s.Age)  // 18 —— 没变，且不报错
}
```

要让函数修改原结构体，传**指针**（原理 3.4 彻底讲透，此处先记写法）：

```go
func birthday(s *Student) {   // *Student：接收"指向 Student 的指针"
    s.Age++                   // 通过指针改到原件
}

func main() {
    s := Student{Name: "张三", Age: 18}
    birthday(&s)              // &s：取 s 的地址传过去
    fmt.Println(s.Age)        // 19 —— 变了
}
```

这个值语义还会影响 for range 遍历（见 七）。

## 六、结构体嵌套：具名与匿名嵌入

| 写法 | 含义 |
|------|------|
| `Addr Address` | 具名嵌套：字段的类型是另一个结构体 |
| `Person`（只写类型，不写字段名） | **匿名嵌入（embedding）**：被嵌入类型的字段"提升"到外层 |

具名嵌套——"学生有个地址，地址又有城市和街道"：

```go
type Address struct {
    City   string
    Street string
}

type Person struct {
    Name string
    Age  int
    Addr Address       // 字段类型是另一个结构体
}

p := Person{
    Name: "张三",
    Age:  18,
    Addr: Address{
        City:   "北京",
        Street: "中关村大街",
    },
}

fmt.Println(p.Addr.City)   // 北京 —— 点号一路点下去
```

匿名嵌入：

```go
type Person struct {
    Name string
    Age  int
}

type Employee struct {
    Person          // 匿名嵌入：只写类型
    Company string
}

e := Employee{
    Person:  Person{Name: "张三", Age: 25},
    Company: "某大厂",
}

fmt.Println(e.Name)          // 张三 —— Person 的字段"提升"到了外层，直接点
fmt.Println(e.Person.Name)   // 写全也行，同一个东西
```

> 💡 嵌入的效果类似继承，但 Go 官方称之为**组合（composition）**：Employee 不是"是一种 Person"，而是"内含一个 Person"。**组合优于继承**是 Go 的核心哲学，第四章讲方法时会大量使用。

## 七、实战主力阵型：结构体 + 切片 + map

| 写法 | 含义 |
|------|------|
| `[]Student` | 结构体切片：字面量里类型可省略，直接写 `{}` |
| `map[string]Student` | 值为结构体的 map：按键直查 |

```go
type Student struct {
    Name  string
    Score float64
}

// 结构体切片：学生列表
students := []Student{
    {Name: "张三", Score: 92},
    {Name: "李四", Score: 78},
    {Name: "王五", Score: 85},
}

// 遍历筛选
for _, s := range students {
    if s.Score >= 80 {
        fmt.Println(s.Name, "优良")
    }
}

// map 值是结构体：按 ID 直查
idMap := map[string]Student{
    "1001": {Name: "张三", Score: 92},
}
```

> ⚠️ **for range 改结构体切片，改不动原数据**。range 变量 s 是每个元素的**拷贝**（值语义，见 五）：
>
> ```go
> for _, s := range students {
>     s.Score = 100        // ❌ 毫无效果
> }
> fmt.Println(students[0].Score)   // 还是 92
>
> for i := range students {
>     students[i].Score = 100   // ✅ 通过下标直达原件
> }
> ```

## 八、匿名结构体（认识即可）

```go
point := struct {      // 只写结构体形状，不起类型名
    X, Y int
}{X: 10, Y: 20}

fmt.Println(point.X)   // 10
```

只用一次、不值得起名的临时结构；写测试用例时很常见（第六章见），现在认得出来即可。

## 九、字段可见性：首字母大小写

2.1 的规则在结构体字段上同样生效：**字段首字母大写才对其他包可见**。

| 字段 | 可见性 |
|------|--------|
| `Name string` | 其他包能访问 |
| `email string` | 只有本包能访问 |

```go
type User struct {
    Name  string    // 其他包能访问
    email string    // 只有本包能访问
}
```

> ⚠️ JSON 序列化库在"其他包"里：**小写字段它看不见，转 JSON 时会静默丢失**（第六章细讲）。实战中结构体字段几乎都大写开头。

## 十、常用操作速查

| 需求 | 写法 |
|------|------|
| 定义结构体 | `type Student struct { Name string }` |
| 创建（推荐） | `s := Student{Name: "张三"}` |
| 零值创建 | `var s Student` |
| 读 / 写字段 | `s.Name` / `s.Name = "李四"` |
| 调试打印 | `fmt.Printf("%+v\n", s)` |
| 函数修改原结构体 | 参数 `*Student`，调用传 `&s` |
| 匿名嵌入 | `type Employee struct { Person }` |
| 修改切片元素的字段 | `students[i].Score = 100` |

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `s.Nmae undefined (type Student has no field or method Nmae)` | 字段名拼错，编译器当场发现 | 改正拼写 |
| `missing ',' before newline in composite literal` | 多行初始化最后一行漏了逗号 | 补上逗号 |
| `too few values in struct literal` | 按顺序初始化时少给了字段 | 改用字段名初始化 |
| 函数里改了结构体，外面没变 | 值类型传参是拷贝 | 参数改 `*Student`，调用传 `&s` |
| for range 里改字段不生效 | range 变量是元素拷贝 | 用下标 `students[i].X = ...` |
| JSON 转出来少字段 | 字段首字母小写，外部包看不见 | 字段大写开头，配 json 标签（第六章细讲） |

## 练习

**1. 动手**：定义 `Book` 结构体（书名、作者、价格、是否在售），用两种不同方式创建两本书，用 `%+v` 打印。

**2. 动手**：创建 `[]Book` 书单（至少 4 本），遍历找出价格最低的书并打印书名。

**3. 猜输出**：先别运行，猜猜打印什么？

```go
type Point struct{ X, Y int }

a := Point{1, 2}
b := a
b.X = 100

pts := []Point{{1, 1}, {2, 2}}
for _, p := range pts {
    p.Y = 99
}

fmt.Println(a.X)
fmt.Println(pts[1].Y)
```

**4. 修 bug**：下面的代码想给书打八折，但价格没变化，找出两处问题：

```go
type Book struct {
    Title string
    Price float64
}

func discount(b Book, rate float64) {
    b.Price = b.Price * rate
}

func main() {
    books := []Book{{"Go 入门", 100}, {"Go 进阶", 200}}
    for _, b := range books {
        discount(b, 0.8)
    }
    fmt.Println(books)
}
```

**5. 挑战**：定义 `Animal` 结构体（Name 字段），再定义 `Dog` 匿名嵌入 `Animal` 并新增 `Breed` 字段。创建一只狗，分别用提升写法和全路径写法打印它的名字。

<details>
<summary>点击查看答案</summary>

```go
// 1
type Book struct {
    Title   string
    Author  string
    Price   float64
    OnSale  bool
}

b1 := Book{Title: "Go 语言入门", Author: "张三", Price: 59, OnSale: true}
var b2 Book
b2.Title = "Go 语言进阶"
b2.Author = "李四"
b2.Price = 89
fmt.Printf("%+v\n%+v\n", b1, b2)

// 2
cheapest := books[0]
for _, b := range books {
    if b.Price < cheapest.Price {
        cheapest = b
    }
}
fmt.Println("最便宜：", cheapest.Title)
```

**3. 输出：**

```
1     ← 结构体是值类型，b := a 是拷贝，改 b 不动 a
2     ← range 变量 p 是拷贝，改 p.Y 无效，pts[1].Y 还是原值
```

**4. 两处问题，是同一个知识点踩了两遍：**

```go
func discount(b *Book, rate float64) {   // ① 参数改成指针，否则改的是函数内的拷贝
    b.Price = b.Price * rate
}

func main() {
    books := []Book{{"Go 入门", 100}, {"Go 进阶", 200}}
    for i := range books {
        discount(&books[i], 0.8)         // ② range 变量是拷贝，用下标取地址
    }
    fmt.Println(books)                   // [{Go 入门 80} {Go 进阶 160}]
}
```

```go
// 5
type Animal struct {
    Name string
}

type Dog struct {
    Animal
    Breed string
}

d := Dog{Animal: Animal{Name: "旺财"}, Breed: "柴犬"}
fmt.Println(d.Name)          // 旺财（提升写法）
fmt.Println(d.Animal.Name)   // 旺财（全路径写法）
```

</details>

## 本节小结

- `type Name struct {...}` 定义新类型；字段名+类型，首字母大写才对外可见
- 创建首选**字段名初始化**；`var s Student` 零值直接可用，没有 nil 陷阱
- 点号访问字段，拼错是编译错误（优于 map）；`%+v` 调试打印
- **结构体是值类型**：赋值/传参/range 变量全是拷贝——切片 map 共享、结构体复制，对照表要记牢
- 函数要修改原结构体：传 `*Student`，调用时 `&s`（3.4 讲透原理）
- 嵌套用字段名，**匿名嵌入**实现字段提升——Go 的组合哲学
- 实战主力：`[]Student` 和 `map[string]Student`

下一节：[3.4 指针](04-pointers.md)
