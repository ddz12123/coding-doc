# 3.3 结构体

> 本节目标：掌握结构体的定义、创建、值语义——这是 Go 组织数据的核心方式，第四章方法与接口全部建立在它之上。

本章重头戏来了。切片解决"一串同类数据"，map 解决"按键查值"，但还有一类需求它们都不顺手——**描述一个"东西"**。

## 一、为什么需要结构体

想在程序里表示一个学生：姓名、年龄、分数。用现有工具试试：

```go
// 方案 1：三个散装变量
name := "张三"
age := 18
score := 92.5
// 学生一多：name2, age2, score2……又回到了没有切片的黑暗时代

// 方案 2：塞进 map
student := map[string]string{"name": "张三", "age": "18"}
// 问题更大：值类型只能一种（年龄被迫存成字符串）；
// 键拼错 student["nmae"] 不报错；哪些键是合法的全靠脑子记
```

我们想要的是：**定义一个"学生就该长这样"的模板——有哪些字段、各是什么类型，白纸黑字定死，编译器帮忙把关**。这就是**结构体（struct）**：

```go
type Student struct {
    Name  string
    Age   int
    Score float64
}
```

拆解语法：

```
type  Student  struct {
 ↑       ↑        ↑
关键字  新类型名   "结构体"关键字
（定义新类型） 

    Name  string      ← 字段名 + 字段类型（还是名字在前类型在后）
    Age   int            Name、Age、Score 叫"字段"（field）
    Score float64
}
```

`type` 是第一次正式见面：它**定义一个新类型**。从这行起，`Student` 和 int、string 一样是合法类型——能声明变量、能当函数参数、能塞进切片和 map。

> 💡 学过 Python/Java 的会问：class 呢？**Go 没有 class**。结构体（存数据）+ 下一章的方法（绑行为）+ 接口（抽象），三样合起来覆盖了面向对象的核心能力，但更简单直接。

## 二、创建结构体实例

四种方式，先记推荐的：

```go
// 方式 1：字段名初始化（推荐！清晰，字段顺序随意，少几个也行）
s1 := Student{
    Name:  "张三",
    Age:   18,
    Score: 92.5,       // ⚠️ 换行写时最后一行的逗号不能少
}

// 方式 2：只给部分字段，其余自动零值
s2 := Student{Name: "李四"}     // Age=0, Score=0

// 方式 3：零值结构体，之后逐个赋值
var s3 Student                  // 所有字段都是各自的零值
s3.Name = "王五"

// 方式 4：按顺序初始化（不推荐：字段一多必错位，加字段全崩）
s4 := Student{"赵六", 20, 88.0}
```

注意方式 3：**结构体没有 nil 问题**！`var s3 Student` 直接可用，每个字段都是零值——又是"零值可用"哲学。对比 map 的 nil 陷阱，结构体老实得多。

## 三、访问和修改字段：点号

```go
fmt.Println(s1.Name)     // 张三
s1.Score = 95.0          // 直接赋值修改

fmt.Printf("%+v\n", s1)  // {Name:张三 Age:18 Score:95}
```

记住 `%+v` 这个占位符：带字段名打印整个结构体，**调试第一神器**（`%v` 只打值：`{张三 18 95}`，字段一多分不清谁是谁）。

> ⚠️ 访问写错字段名是**编译错误**：`s1.Nmae` → `s1.Nmae undefined`。对比 map 拼错键默默返回零值——这正是结构体优于 map 方案的地方：**手滑在编译期就被抓**。

## 四、结构体是值类型（本节最重要的知识点）

前两节刚说过：切片、map 赋值是"共享"。结构体**完全相反**——赋值和传参都是**整体复制**：

```go
a := Student{Name: "张三", Age: 18}
b := a              // 把 a 完整拷贝一份给 b，两块独立内存
b.Name = "李四"
fmt.Println(a.Name) // 张三 —— a 纹丝不动
```

把三章学过的类型排个队，这张表值得抄在本子上：

| 类型 | 赋值/传参行为 |
|------|--------------|
| int、float64、string、bool、数组、**结构体** | **复制**，各改各的 |
| 切片、map | **共享**底层数据，一改都变 |

### 值类型的代价：函数改不动它

```go
func birthday(s Student) {
    s.Age++             // 改的是拷贝
}

func main() {
    s := Student{Name: "张三", Age: 18}
    birthday(s)
    fmt.Println(s.Age)  // 18 —— 没变！不报错的错
}
```

函数收到的是复制品，改得再欢也影响不到原件。想让函数修改原结构体，要传**指针**——下一节的主角，这里先看用法混个脸熟：

```go
func birthday(s *Student) {   // *Student：接收"指向 Student 的指针"
    s.Age++                   // 通过指针改到原件
}

func main() {
    s := Student{Name: "张三", Age: 18}
    birthday(&s)              // &s：取 s 的地址传过去
    fmt.Println(s.Age)        // 19 —— 变了！
}
```

先记住现象和写法（`&` 取地址、参数写 `*类型`），原理下一节彻底讲透。

## 五、结构体嵌套

字段的类型也可以是结构体——"学生有个地址，地址又有城市和街道"：

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

### 匿名嵌入：Go 式"继承"

上面的嵌套要写字段名（`Addr Address`）。还有一种**只写类型不写字段名**的玩法，叫**嵌入（embedding）**：

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

被嵌入类型的字段可以**直接透过外层访问**，效果神似继承——Employee "天生带有" Person 的一切。但 Go 官方管这叫**组合（composition）**：Employee 不是"是一种 Person"，而是"内含一个 Person"。**组合优于继承**是 Go 的核心哲学，第四章讲方法时它会大放异彩。

## 六、结构体 + 切片 + map：实战主力阵型

真实项目里数据长什么样？**结构体切片**和**值为结构体的 map**，占了日常代码的半壁江山：

```go
type Student struct {
    Name  string
    Score float64
}

// 结构体切片：学生列表
students := []Student{
    {Name: "张三", Score: 92},     // 类型可省略，直接写 {}
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

> ⚠️ **高频坑：for range 改结构体切片，改了个寂寞。**
>
> ```go
> for _, s := range students {
>     s.Score = 100        // ❌ 毫无效果！
> }
> fmt.Println(students[0].Score)   // 还是 92
> ```
>
> 原因就是本节核心知识：结构体是值类型，**range 变量 s 是每个元素的拷贝**。改拷贝，原件无动于衷——不报错，纯白干。想改原数据，用下标：
>
> ```go
> for i := range students {
>     students[i].Score = 100   // ✅ 通过下标直达原件
> }
> ```

## 七、匿名结构体（认识即可）

只用一次、不值得起名的临时结构：

```go
point := struct {
    X, Y int
}{X: 10, Y: 20}

fmt.Println(point.X)   // 10
```

写测试用例时很常见（第六章见），现在认得出来就行。

## 八、字段大小写：老规则，新场景

2.1 的规则在结构体上同样生效：**字段首字母大写才对其他包可见**。

```go
type User struct {
    Name  string    // 其他包能访问
    email string    // 只有本包能访问
}
```

现在多一个提醒：以后做 Web 开发时，JSON 序列化库在"其他包"里——**小写字段它看不见，转 JSON 时会静默丢失**。所以实战中结构体字段几乎都大写开头。埋个伏笔，第六章兑现。

## 本节报错/怪象速查表

| 现象 | 人话翻译 |
|------|----------|
| `s.Nmae undefined (type Student has no field or method Nmae)` | 字段名拼错，编译器当场抓获 |
| `missing ',' before newline in composite literal` | 多行初始化最后一行漏了逗号 |
| `too few values in struct literal` | 按顺序初始化时少给了字段——改用字段名初始化 |
| 函数里改了结构体，外面没变 | 值类型传参是拷贝，要改就传 `*Student` 指针 |
| for range 里改字段不生效 | range 变量是拷贝，用 `students[i].X = ...` |
| JSON 转出来少字段 | 字段首字母小写，外部包看不见（第六章细讲） |

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
2     ← range 变量 p 是拷贝，改 p.Y 是白干，pts[1].Y 还是原值
```

**4. 两处问题，其实是同一个知识点踩了两遍：**

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

- `type Name struct {...}` 定义新类型；字段名+类型，大写字段才对外可见
- 创建首选**字段名初始化**；`var s Student` 零值直接可用，没有 nil 陷阱
- 点号访问字段，拼错是编译错误（优于 map）；`%+v` 调试打印
- **结构体是值类型**：赋值/传参/range 变量全是拷贝——切片 map 共享、结构体复制，这张对照表要背
- 函数要修改原结构体：传 `*Student`，调用时 `&s`（下一节讲透）
- 嵌套用字段名，**匿名嵌入**实现字段提升——Go 的组合哲学
- 实战主力：`[]Student` 和 `map[string]Student`

下一节把 `&` 和 `*` 彻底讲明白：[3.4 指针](04-pointers.md)
