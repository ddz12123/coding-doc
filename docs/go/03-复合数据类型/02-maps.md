# 3.2 map 映射

> 本节目标：掌握 map 的创建、增删改查、comma ok 判断键存在、遍历与有序输出，以及几个必知的坑。

## 一、从一个问题开始：想用"名字"当"下标"

切片能装一串数据，但下标只能是**数字**（见 3.1）。要"根据名字查成绩"，用切片只能开两个平行切片，再遍历找下标：

```go
names  := []string{"张三", "李四", "王五"}
scores := []int{90, 85, 78}

// 查"李四"：先遍历 names 找到下标 1，再去 scores 取 scores[1]
// 两个人必须按位置对齐，插一个人、删一个人都要整体挪动
```

**map（映射）**解决的就是这个问题：按**键**存数据，用键直接取值——键可以是任意的值，名字也能当"下标"用。类似 Python 的 dict、Java 的 HashMap：

```go
// "张三" → 90
// "李四" → 85      这就是一个 map[string]int
// "王五" → 78
```

## 二、声明与创建 map

### 拆解一下声明

```
m := make(map[string]int)
     ↑        ↑      ↑
                     值类型 —— 查出来的值是 int
              键类型 —— 方括号里写"下标"的类型，这里用名字（string）
     make —— 内置函数，创建一个可写入的空 map
```

读作：创建一个"用 string 查 int"的空 map，交给 m。`map[键类型]值类型` 是所有 map 的统一写法。

| 写法 | 结果 | 说明 |
|------|------|------|
| `m := make(map[string]int)` | 空 map，可写入 | 最常用 |
| `m := map[string]int{"张三": 90}` | 创建并初始化 | 一开始就有数据时用 |
| `var m map[string]int` | nil map | **只能读，写入会 panic**（见下方 ⚠️） |

```go
scores := make(map[string]int)      // 空 map

scores2 := map[string]int{          // 字面量创建并初始化
    "张三": 90,
    "李四": 85,     // ⚠️ 换行写时，最后一项后面的逗号必须有
}
fmt.Println(len(scores2))           // 2
```

> ⚠️ **nil map 不能写入**。nil 切片可以直接 append（见 3.1），map 没有对应规则：
>
> ```go
> var m map[string]int    // 只声明不初始化 → m 是 nil
> m["a"] = 1              // ❌ panic: assignment to entry in nil map
> ```
>
> 规则：**map 用前必须 make 或字面量初始化**；nil map 只能读（读到零值）。

## 三、增删改查：还是熟悉的方括号

### 拆解一下存值

```
m[k] = v
  ↑    ↑
       值 —— 要存进去的数据
 键 —— 方括号里放键，就像切片放下标，只是类型从数字换成了键类型
```

读作：把 v 存进 m，以后用 k 找到它。**键不存在就新增，存在就覆盖**——增和改是同一个语法，没有单独的"新增写法"。

| 操作 | 语法 | 说明 |
|------|------|------|
| 增 / 改 | `m[k] = v` | 同一个语法 |
| 查 | `v := m[k]` | 键不存在返回零值（见 四） |
| 删 | `delete(m, k)` | 删不存在的键**静默无事**，不报错 |
| 数量 | `len(m)` | 键值对个数 |

```go
scores := make(map[string]int)

scores["张三"] = 90           // 增
scores["李四"] = 85           // 增
scores["张三"] = 95           // 改：覆盖成 95

fmt.Println(scores["张三"])   // 95

delete(scores, "李四")        // 删：内置 delete 函数
fmt.Println(len(scores))      // 1
```

## 四、查不存在的键：comma ok（本节招牌习语）

查不存在的键**不报错**，返回值类型的零值——和 Python 抛 KeyError 相反。但这带来歧义：查到 0，是"考了 0 分"还是"查无此人"？**comma ok** 用来消除歧义：

### 拆解一下 comma ok

```
score, ok := scores["张三"]
↑      ↑
       第二个变量 ok —— bool：键存在 true，不存在 false
第一个变量 —— 接住查到的值
```

读作：查"张三"，查到的值给 score，存不存在给 ok。两个返回值用逗号隔开，所以叫 comma ok（comma = 逗号）。

| 写法 | 结果 |
|------|------|
| `v := m[k]` | 键不存在时 v 是零值，"0 分"和"查无此人"分不开 |
| `v, ok := m[k]` | 多接一个 bool，键是否存在一清二楚 |

```go
scores := map[string]int{"张三": 90}

fmt.Println(scores["路人甲"])   // 0 —— 不报错，返回值类型的零值

score, ok := scores["张三"]
if ok {
    fmt.Println("找到了，分数是", score)
} else {
    fmt.Println("查无此人")
}

// 配合 2.4 的 if 初始化语句，Go 程序员的惯用写法：
if score, ok := scores["张三"]; ok {
    fmt.Println("分数是", score)
}
```

使用时机：**"键不存在"和"值恰好是零值"需要区分时**用 comma ok；无所谓时（比如下面的计数器）直接取。

## 五、遍历 map：顺序是随机的

还是 2.4 的 for range，两个变量这次是**键、值**：

| 写法 | 含义 |
|------|------|
| `for k, v := range m` | 同时取键和值 |
| `for k := range m` | 只取键 |

> ⚠️ **遍历顺序是随机的**：每次运行顺序都可能不同。这是 Go 故意的——防止写出依赖顺序的代码。

```go
scores := map[string]int{"张三": 90, "李四": 85, "王五": 78}

for name, score := range scores {
    fmt.Println(name, score)
}

for name := range scores {     // 只要键
    fmt.Println(name)
}
```

要按顺序输出，先把键收集成切片、排序，再按键取值——**固定三步套路**：

```go
import "slices"

keys := make([]string, 0, len(scores))
for k := range scores {
    keys = append(keys, k)      // 3.1 的收集套路
}
slices.Sort(keys)

for _, k := range keys {
    fmt.Println(k, scores[k])   // 按键的字典序输出
}
```

## 六、键和值的类型可以很丰富

### 值类型：任意类型都能装

`map[string]int` 里的 int 换成任何类型都行，类型照旧从外往里读：

```
map[string][]string
    ↑        ↑
             值类型是切片 —— 一个键对应一串值
    键类型 —— string
```

读作：用 string 查 []string——比如姓名查爱好列表。

| 写法 | 含义 |
|------|------|
| `map[string][]string` | 值是切片 |
| `map[string]map[string]string` | 值是嵌套 map |
| `map[string]Student` | 值是结构体——实际项目最常见的形态，下一节正式登场 |

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
```

### 键类型：必须可比较

键的限制只有一条：**键必须是可比较的类型**（能跑 `==`）。string、int、bool、数组都行；**切片、map、函数不能当键**——它们不支持 `==`，编译报错 `invalid map key type`。

## 七、经典应用：计数器

```go
counter := make(map[string]int)
counter[w]++    // 键不存在：取到零值 0 → 加 1 → 存回
```

`counter[w]++` 第一次遇到新键也不会出错，过程是：键不存在 → 取到零值 0 → 0+1=1 存回。"不存在返回零值"这条规则，在这里从坑变成了便利——不用先判断"键在不在，不在先设 0"。

```go
words := []string{"go", "python", "go", "java", "go", "python"}

counter := make(map[string]int)
for _, w := range words {
    counter[w]++      // 一行完成统计
}

fmt.Println(counter)  // map[go:3 java:1 python:2]
```

## 八、map 的赋值与传参：共享

和切片一样（3.1），map 赋值、传参**不复制数据**，两端指向同一份数据：

```go
m1 := map[string]int{"a": 1}
m2 := m1            // 指向同一份数据
m2["a"] = 100
fmt.Println(m1)     // map[a:100] —— m1 也变了
```

- 把 map 传进函数，函数内的修改外面全看得见
- 该特性与结构体（3.3）、指针（3.4）的语义会串成完整的图景

## 九、常用操作速查

| 需求 | 写法 |
|------|------|
| 创建空 map | `m := make(map[K]V)` |
| 创建并初始化 | `m := map[K]V{k1: v1}` |
| 增 / 改 | `m[k] = v` |
| 查（区分不存在） | `v, ok := m[k]` |
| 删 | `delete(m, k)` |
| 键值对个数 | `len(m)` |
| 遍历 | `for k, v := range m` |
| 有序遍历 | 收集键 → `slices.Sort` → 按序取值（见 五） |
| 计数 | `m[k]++` |

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `panic: assignment to entry in nil map` | 对只声明未初始化的 nil map 写入 | 先 `make(map[K]V)` 或字面量初始化 |
| 查不存在的键得到 0 / "" / false | 返回值类型的零值，不是 bug | 要区分就用 `v, ok := m[k]` |
| 每次运行遍历顺序不一样 | Go 故意打乱遍历顺序 | 收集键 → `slices.Sort` → 按序取值 |
| `invalid operation: m1 == m2` | map 之间不能比较 | 只能和 nil 比较 |
| `invalid map key type []int` | 切片、map、函数不能当键 | 改用可比较类型当键 |
| `missing ',' before newline` | 字面量换行写时最后一项漏了逗号 | 补上逗号 |

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
- 增/改同一个语法 `m[k] = v`，删用 `delete(m, k)`
- **查不存在的键返回零值不报错**；要区分就用 comma ok：`if v, ok := m[k]; ok`
- 遍历顺序随机是故意的；要有序：收集键 → 排序 → 按序取
- 计数器 `counter[w]++` 是 map 最高频的实战套路
- map 赋值/传参共享数据；切片、map、函数不能当键

下一节：[3.3 结构体](03-structs.md)
