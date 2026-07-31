# 02 map 映射

> 本节目标：掌握 map 的增删改查、判断键是否存在、遍历，以及必须知道的几个坑。

## 一、map 是什么？

map 是**键值对（key-value）**集合，通过键快速查找值。类似 Python 的 dict、Java 的 HashMap、JS 的对象。

```
"张三" → 90
"李四" → 85     这就是一个 map[string]int
"王五" → 78
```

## 二、创建 map

```go
// 方式 1：make 创建空 map
scores := make(map[string]int)     // 键是 string，值是 int

// 方式 2：字面量创建并初始化
scores := map[string]int{
    "张三": 90,
    "李四": 85,     // 注意：最后一项后面的逗号必须有！
}

// ⚠️ 只声明不初始化的 map 是 nil，不能写入！
var m map[string]int
m["a"] = 1     // ❌ panic: assignment to entry in nil map
```

**规则：map 使用前必须用 make 或字面量初始化。**

## 三、增删改查

```go
scores := make(map[string]int)

// 增 / 改（语法相同：键不存在就是新增，存在就是覆盖）
scores["张三"] = 90
scores["李四"] = 85
scores["张三"] = 95        // 覆盖

// 查
fmt.Println(scores["张三"])   // 95

// 删
delete(scores, "李四")

// 长度
fmt.Println(len(scores))     // 1
```

## 四、重点：查询不存在的键不会报错！

这是 map 最重要的知识点。访问不存在的键，返回的是**值类型的零值**：

```go
scores := map[string]int{"张三": 90}

fmt.Println(scores["不存在的人"])   // 0 —— 不报错，返回 int 的零值！
```

问题来了：拿到 0，到底是"这个人考了 0 分"还是"这个人不存在"？

### 用 "comma ok" 写法区分

map 取值其实有两个返回值，第二个是"键是否存在"：

```go
score, ok := scores["张三"]
if ok {
    fmt.Println("找到了，分数是", score)
} else {
    fmt.Println("查无此人")
}

// 惯用的紧凑写法：
if score, ok := scores["张三"]; ok {
    fmt.Println("分数是", score)
}
```

## 五、遍历 map

```go
scores := map[string]int{"张三": 90, "李四": 85, "王五": 78}

for name, score := range scores {
    fmt.Println(name, score)
}

// 只要键：
for name := range scores {
    fmt.Println(name)
}
```

### ⚠️ map 的遍历顺序是随机的！

每次运行程序，遍历顺序都可能不同——这是 Go **故意设计**的，防止你依赖某种顺序。

需要按顺序遍历时，先把键取出来排序：

```go
import (
    "fmt"
    "slices"
)

keys := make([]string, 0, len(scores))
for k := range scores {
    keys = append(keys, k)
}
slices.Sort(keys)                 // 排序键

for _, k := range keys {
    fmt.Println(k, scores[k])     // 按键的字典序输出
}
```

## 六、map 的值可以是任何类型

```go
// 值是切片：一个人有多个爱好
hobbies := map[string][]string{
    "张三": {"篮球", "编程"},
    "李四": {"阅读"},
}
hobbies["张三"] = append(hobbies["张三"], "游泳")

// 值是 map（嵌套）
users := map[string]map[string]string{
    "u1001": {"name": "张三", "city": "北京"},
}
fmt.Println(users["u1001"]["name"])   // 张三

// 值是结构体（下一节学，实际项目中最常见）
```

## 七、经典应用：统计词频

map 最经典的用法——计数器：

```go
words := []string{"go", "python", "go", "java", "go", "python"}

counter := make(map[string]int)
for _, w := range words {
    counter[w]++      // 不存在的键取出零值 0，加 1 后存回去，天然适合计数！
}

fmt.Println(counter)  // map[go:3 java:1 python:2]
```

`counter[w]++` 能直接用，正是利用了"不存在的键返回零值"这个特性。

## 八、map 和切片一样是引用语义

```go
m1 := map[string]int{"a": 1}
m2 := m1            // m1、m2 指向同一份数据
m2["a"] = 100
fmt.Println(m1)     // map[a:100] —— m1 也变了
```

把 map 传给函数，函数内的修改对外部可见。

---

## 新手常见坑

1. **对 nil map 写入会 panic**：`var m map[string]int` 后直接赋值会崩溃，必须先 `make`
2. **以为不存在的键会报错**：不会，返回零值；需要区分时用 `v, ok := m[k]`
3. **依赖遍历顺序**：map 遍历顺序随机，要有序就先排序键
4. **map 不能比较**：`m1 == m2` 编译报错（只能和 nil 比较）
5. **切片不能当 map 的键**：键必须是可比较类型（string、int、bool、数组等可以；切片、map、函数不行）

---

## 练习

1. 创建一个 map 存储 3 个朋友的生日（姓名 → 日期字符串），实现：新增一人、修改一人、删除一人、查询一个不存在的人（用 comma ok 判断）。
2. 统计字符串 `"the quick brown fox jumps over the lazy dog the fox"` 中每个单词出现的次数（提示：`strings.Fields()` 可以按空格拆分字符串）。
3. 把练习 2 的结果按单词字典序打印出来。

下一节：[03 结构体](03-structs.md)
