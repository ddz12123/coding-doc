# 3.2 map 映射

> 本节目标：掌握 map 的增删改查、comma ok 判断键存在、遍历，以及几个必知的坑。

## 一、为什么需要 map

上一节用切片存了全班成绩。新需求来了：**根据名字查成绩**。用切片只能一个个找：

```go
names := []string{"张三", "李四", "王五"}
scores := []int{90, 85, 78}

// 查"李四"的分数？循环遍历 names 找下标，再去 scores 取……
// 两个切片还得时刻保持对齐，插一个人全乱
```

我们想要的是**按名字直接取**。这就是 **map（映射）**——键值对集合，类似 Python 的 dict、Java 的 HashMap：

```
"张三" → 90
"李四" → 85     这就是一个 map[string]int
"王五" → 78
```

## 二、创建 map

```go
// 方式 1：make 创建空 map
scores := make(map[string]int)
```

拆一下类型：

```
map[string]int
     ↑      ↑
   键类型   值类型   —— "用 string 查 int"
```

```go
// 方式 2：字面量创建并初始化
scores := map[string]int{
    "张三": 90,
    "李四": 85,     // ⚠️ 最后一项后面的逗号必须有！（换行写时）
}
```

> ⚠️ **本节头号坑：nil map 不能写入。**
>
> ```go
> var m map[string]int    // 只声明不初始化 → m 是 nil
> m["a"] = 1              // ❌ panic: assignment to entry in nil map
> ```
>
> 上一节说 nil 切片可以直接 append，**map 没有这个待遇**——nil map 只能读（读到零值），一写就崩。规则背下来：**map 用前必须 make 或字面量初始化**。

## 三、增删改查

```go
scores := make(map[string]int)

// 增 / 改是同一个语法：键不存在就新增，存在就覆盖
scores["张三"] = 90
scores["李四"] = 85
scores["张三"] = 95           // 覆盖成 95

// 查
fmt.Println(scores["张三"])   // 95

// 删：内置 delete 函数（删不存在的键不报错，静默无事）
delete(scores, "李四")

// 数量
fmt.Println(len(scores))     // 1
```

## 四、重点：查不存在的键不报错！

这是 map 最重要的知识点，Python 转来的尤其注意（Python 是抛 KeyError，Go 完全相反）：

```go
scores := map[string]int{"张三": 90}

fmt.Println(scores["路人甲"])   // 0 —— 不报错！返回值类型的零值
```

于是有个经典歧义：拿到 0，到底是"考了 0 分"还是"查无此人"？

### comma ok：一次取值，两个答案

map 取值其实可以接**两个**返回值，第二个是"键存不存在"：

```go
score, ok := scores["张三"]
if ok {
    fmt.Println("找到了，分数是", score)
} else {
    fmt.Println("查无此人")
}
```

配合 2.4 学的 if 初始化语句，Go 程序员的惯用姿势是：

```go
if score, ok := scores["张三"]; ok {
    fmt.Println("分数是", score)
}
```

这个写法叫 **comma ok**，是 Go 的招牌习语之一。什么时候用：**"键不存在"和"值恰好是零值"需要区分时就用它**；无所谓时（比如计数器）直接取。

## 五、遍历 map

还是 for range，两个变量是**键、值**：

```go
scores := map[string]int{"张三": 90, "李四": 85, "王五": 78}

for name, score := range scores {
    fmt.Println(name, score)
}

for name := range scores {     // 只要键
    fmt.Println(name)
}
```

### ⚠️ 遍历顺序是随机的！

跑三次上面的代码，可能得到三种顺序。这不是 bug——Go **故意**每次打乱，就是防止你写出依赖顺序的代码（有些语言的 map 碰巧有序，换个版本就炸）。

要按顺序输出？老老实实**先把键收集起来排序**：

```go
import "slices"

keys := make([]string, 0, len(scores))
for k := range scores {
    keys = append(keys, k)      // 上一节的"收集"套路
}
slices.Sort(keys)

for _, k := range keys {
    fmt.Println(k, scores[k])   // 按键的字典序输出
}
```

这三步（收集键 → 排序 → 按序取值）是 Go 的固定套路，直接背。

## 六、值可以是任何类型

map 的值类型不限，组合出各种实用结构：

```go
// 值是切片：一个人多个爱好
hobbies := map[string][]string{
    "张三": {"篮球", "编程"},
    "李四": {"阅读"},
}
hobbies["张三"] = append(hobbies["张三"], "游泳")

// 值是 map：嵌套
users := map[string]map[string]string{
    "u1001": {"name": "张三", "city": "北京"},
}
fmt.Println(users["u1001"]["name"])   // 张三

// 值是结构体 —— 实际项目最常见的形态，下一节正式登场
```

键的限制倒是有一条：**键必须是可比较的类型**。string、int、bool、数组都行；**切片、map、函数不能当键**（它们连 `==` 都不支持），编译报错 `invalid map key type`。

## 七、经典应用：计数器

map 最高频的实战用法——统计出现次数：

```go
words := []string{"go", "python", "go", "java", "go", "python"}

counter := make(map[string]int)
for _, w := range words {
    counter[w]++      // 一行搞定！
}

fmt.Println(counter)  // map[go:3 java:1 python:2]
```

`counter[w]++` 为什么第一次遇到 "go" 时不出错？拆开看：`counter["go"]` 不存在 → 返回零值 0 → 0+1=1 存回去。**"不存在返回零值"在这里从坑变成了神助攻**——不需要像别的语言那样先判断"键在不在，不在先设 0"。

## 八、map 也是"共享"的

和切片一样，map 赋值/传参**不复制数据**：

```go
m1 := map[string]int{"a": 1}
m2 := m1            // 指向同一份数据
m2["a"] = 100
fmt.Println(m1)     // map[a:100] —— m1 也变了
```

把 map 传进函数，函数内的修改外面全看得见。这个特性下一节讲结构体、3.4 讲指针时会串成完整的图景。

## 本节报错/怪象速查表

| 现象 | 人话翻译 |
|------|----------|
| `panic: assignment to entry in nil map` | 对没 make 的 map 写入，先 `make(map[K]V)` |
| 查不存在的键得到 0 / "" / false | 不是 bug，返回零值；要区分用 `v, ok := m[k]` |
| 每次运行遍历顺序不一样 | 故意的；要有序就收集键排序再遍历 |
| `invalid operation: m1 == m2` | map 之间不能比较，只能和 nil 比 |
| `invalid map key type []int` | 切片/map/函数不能当键 |
| `missing ',' before newline` | 字面量换行写时，最后一项后面漏了逗号 |

## 练习

**1. 动手**：创建 map 存 3 个朋友的生日（姓名 → 日期字符串），依次：新增一人、修改一人、删除一人、用 comma ok 查询一个不存在的人。

**2. 动手**：统计 `"the quick brown fox jumps over the lazy dog the fox"` 中每个单词的出现次数（提示：`strings.Fields(s)` 按空格拆成切片），并按单词字典序打印。

**3. 猜输出**：先别运行，猜猜打印什么？

```go
m := map[string]int{"a": 1}
fmt.Println(m["b"])

v, ok := m["b"]
fmt.Println(v, ok)

m["b"]++
fmt.Println(m["b"])
```

**4. 修 bug**：下面的程序会 panic，找出原因修好它：

```go
func main() {
    var stock map[string]int
    stock["苹果"] = 10
    stock["香蕉"] = 5
    fmt.Println(stock)
}
```

<details>
<summary>点击查看答案</summary>

```go
// 1
birthdays := map[string]string{
    "张三": "2000-01-01",
    "李四": "1999-05-20",
    "王五": "2001-12-31",
}
birthdays["赵六"] = "1998-08-08"        // 增
birthdays["张三"] = "2000-02-02"        // 改
delete(birthdays, "王五")               // 删
if b, ok := birthdays["神秘人"]; ok {   // 查
    fmt.Println(b)
} else {
    fmt.Println("查无此人")
}

// 2
import (
    "fmt"
    "slices"
    "strings"
)

text := "the quick brown fox jumps over the lazy dog the fox"
counter := make(map[string]int)
for _, w := range strings.Fields(text) {
    counter[w]++
}

keys := make([]string, 0, len(counter))
for k := range counter {
    keys = append(keys, k)
}
slices.Sort(keys)
for _, k := range keys {
    fmt.Println(k, counter[k])
}
```

**3. 输出：**

```
0          ← 不存在的键返回零值
0 false    ← comma ok：值是零值，ok 明确告诉你"不存在"
1          ← 零值 0 加 1 存回去，计数器原理
```

**4.** `var stock map[string]int` 声明的是 nil map，写入即 panic。改成：

```go
stock := make(map[string]int)   // 或 stock := map[string]int{}
```

</details>

## 本节小结

- map 是键值对：`map[键类型]值类型`；**用前必须 make 或字面量初始化**，nil map 一写就 panic
- 增/改同一个语法，删用 `delete(m, k)`
- **查不存在的键返回零值不报错**；要区分就用 comma ok：`if v, ok := m[k]; ok`
- 遍历顺序随机是故意的；要有序：收集键 → 排序 → 按序取
- 计数器 `counter[w]++` 是 map 第一名的实战套路
- map 赋值/传参共享数据；切片、map、函数不能当键

下一节：[3.3 结构体](03-structs.md)
