# 03 结构体

> 本节目标：学会用结构体把相关数据组织在一起——这是 Go 组织数据的核心方式。

## 一、为什么需要结构体？

想描述一个学生：姓名、年龄、分数。用三个零散变量？学生一多就乱套了。**结构体（struct）把相关的数据打包成一个整体**：

```go
type Student struct {
    Name  string
    Age   int
    Score float64
}
```

- `type Student struct {...}` 定义了一个**新类型** `Student`
- `Name`、`Age`、`Score` 叫**字段**（field）
- Go 没有 class，结构体就是 Go 组织数据的方式（配合下一章的"方法"，就能实现面向对象的大部分能力）

## 二、创建结构体实例

```go
// 方式 1：字段名初始化（推荐！清晰且不怕字段顺序变化）
s1 := Student{
    Name:  "张三",
    Age:   18,
    Score: 92.5,       // 最后的逗号不能少
}

// 方式 2：只初始化部分字段，其余为零值
s2 := Student{Name: "李四"}     // Age=0, Score=0

// 方式 3：零值结构体，之后逐个赋值
var s3 Student
s3.Name = "王五"

// 方式 4：按顺序初始化（不推荐，字段一多容易错位）
s4 := Student{"赵六", 20, 88.0}
```

## 三、访问和修改字段

用点号 `.`：

```go
fmt.Println(s1.Name)     // 张三
s1.Score = 95.0
fmt.Printf("%+v\n", s1)  // {Name:张三 Age:18 Score:95}  ← %+v 打印字段名，调试神器
```

## 四、结构体是值类型（和切片、map 不同！）

结构体赋值和传参是**完整拷贝**：

```go
a := Student{Name: "张三", Age: 18}
b := a              // 完整拷贝一份
b.Name = "李四"
fmt.Println(a.Name) // 张三 —— a 不受影响
```

想让函数修改原结构体？传**指针**（下一节详细讲，先看用法）：

```go
func birthday(s *Student) {
    s.Age++             // 通过指针修改原结构体
}

func main() {
    s := Student{Name: "张三", Age: 18}
    birthday(&s)        // &s 取地址
    fmt.Println(s.Age)  // 19 —— 变了！
}
```

## 五、结构体嵌套

字段可以是另一个结构体：

```go
type Address struct {
    City   string
    Street string
}

type Person struct {
    Name    string
    Age     int
    Addr    Address      // 嵌套
}

p := Person{
    Name: "张三",
    Age:  18,
    Addr: Address{
        City:   "北京",
        Street: "中关村大街",
    },
}

fmt.Println(p.Addr.City)   // 北京
```

### 匿名嵌入（组合）

不写字段名、直接写类型，叫**嵌入**。被嵌入类型的字段可以"提升"到外层直接访问：

```go
type Person struct {
    Name string
    Age  int
}

type Employee struct {
    Person          // 匿名嵌入
    Company string
}

e := Employee{
    Person:  Person{Name: "张三", Age: 25},
    Company: "某大厂",
}

fmt.Println(e.Name)     // 张三 —— 不用写 e.Person.Name（写全也可以）
```

这是 Go 实现"继承效果"的方式，官方叫**组合**（composition）。Go 的哲学：组合优于继承。

## 六、结构体与切片、map 配合（实际项目最常见的形态）

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

// 遍历，找出及格的学生
for _, s := range students {
    if s.Score >= 80 {
        fmt.Println(s.Name, "优良")
    }
}

// map 的值是结构体：按 ID 查学生
idMap := map[string]Student{
    "1001": {Name: "张三", Score: 92},
}
```

⚠️ 一个经典坑：`for range` 拿到的 `s` 是**元素的拷贝**，修改它不影响原切片：

```go
for _, s := range students {
    s.Score = 100        // ❌ 没用！改的是拷贝
}

for i := range students {
    students[i].Score = 100   // ✅ 通过下标改原数据
}
```

## 七、匿名结构体（临时用一次）

不值得起名字的临时数据结构：

```go
point := struct {
    X, Y int
}{X: 10, Y: 20}

fmt.Println(point.X)
```

写测试用例的时候很常见，先认识一下。

---

## 新手常见坑

1. **初始化最后一行忘了逗号**：多行字面量每行末尾都要逗号，包括最后一行
2. **for range 修改结构体切片不生效**：range 变量是拷贝，要用下标 `students[i].X = ...`
3. **结构体传参是拷贝**：函数内修改无效，要修改就传指针
4. **字段首字母小写导致其他包访问不了**：跨包使用的字段要大写开头（JSON 序列化也要求大写，第六章会讲）

---

## 练习

1. 定义 `Book` 结构体（书名、作者、价格、是否在售），创建两本书并打印（用 `%+v`）。
2. 写函数 `discount(b *Book, rate float64)` 把书打折（修改原结构体的价格），验证修改生效。
3. 创建一个 `[]Book` 书单（至少 4 本），遍历找出价格最低的书。
4. 定义 `Animal` 结构体（Name），再定义 `Dog` 结构体匿名嵌入 `Animal` 并增加 `Breed` 字段，体验字段提升。

下一节：[04 指针](04-pointers.md)
