# 04 指针

> 本节目标：用最直白的方式理解指针。Go 的指针比 C 简单得多，别怕。

## 一、指针是什么？（大白话版）

变量存在内存里，每块内存都有一个**地址**（就像门牌号）。

- **指针 = 存着某个变量地址的变量。**
- 有了地址，就能找到并修改那个变量本身。

打个比方：
- 普通传值 = 把文件**复印**一份给别人，别人在复印件上涂改，原件不受影响
- 传指针 = 把文件的**存放位置**告诉别人，别人顺着位置找到原件修改，原件真的变了

## 二、两个核心操作符

| 操作符 | 读法 | 作用 |
|-------|------|------|
| `&` | 取地址 | `&x` 得到变量 x 的地址（指针） |
| `*` | 解引用 | `*p` 得到指针 p 指向的那个值 |

```go
package main

import "fmt"

func main() {
    x := 10

    p := &x               // p 是指向 x 的指针，类型是 *int
    fmt.Println(p)        // 0xc000012345 之类的地址
    fmt.Println(*p)       // 10 —— 顺着地址取值

    *p = 99               // 通过指针修改 x
    fmt.Println(x)        // 99 —— x 真的变了！
}
```

类型写法：`*int` 表示"指向 int 的指针"，`*Student` 表示"指向 Student 的指针"。

## 三、指针最主要的用途：让函数修改外部变量

### 没有指针时的困境

```go
func addOne(n int) {
    n++                  // 改的是拷贝
}

func main() {
    x := 10
    addOne(x)
    fmt.Println(x)       // 10 —— 没变！
}
```

### 用指针解决

```go
func addOne(n *int) {    // 参数是指针
    *n++                 // 解引用并修改
}

func main() {
    x := 10
    addOne(&x)           // 传地址
    fmt.Println(x)       // 11 —— 变了！
}
```

## 四、结构体指针（最常用的场景）

实际开发中指针 90% 用在结构体上：

```go
type Student struct {
    Name  string
    Score float64
}

func addBonus(s *Student, bonus float64) {
    s.Score += bonus     // 注意：不用写 (*s).Score，Go 自动解引用！
}

func main() {
    stu := Student{Name: "张三", Score: 85}
    addBonus(&stu, 5)
    fmt.Println(stu.Score)   // 90
}
```

**好消息**：通过结构体指针访问字段，直接写 `s.Score` 就行，Go 自动帮你解引用（不用像 C 那样写 `s->Score` 或 `(*s).Score`）。这让 Go 的指针好用很多。

### 用 new 或 & 直接创建结构体指针

```go
p1 := &Student{Name: "张三"}    // 最常见的写法：字面量前加 &
p2 := new(Student)              // 创建零值 Student 并返回指针（较少用）

fmt.Println(p1.Name)            // 张三
```

## 五、nil 指针：指针的零值

没有指向任何东西的指针是 `nil`。**解引用 nil 指针会让程序崩溃**——这是 Go 程序最常见的运行时错误之一：

```go
var p *int                // p == nil
fmt.Println(*p)           // ❌ panic: runtime error: invalid memory address
                          //    or nil pointer dereference
```

以后你在报错里看到 `nil pointer dereference`，就知道是"用了一个空指针"，检查指针在使用前是否被正确赋值：

```go
if p != nil {
    fmt.Println(*p)       // 安全
}
```

## 六、什么时候用指针，什么时候用值？

新手实用决策表：

| 场景 | 用什么 | 原因 |
|------|-------|------|
| 函数需要**修改**传入的结构体 | 指针 | 传值改不了原件 |
| 结构体**很大**（几十个字段） | 指针 | 避免拷贝开销 |
| 小结构体、只读不改 | 值 | 简单安全 |
| int / string / bool 等基本类型参数 | 值 | 几乎不需要指针 |
| 切片、map 参数 | 值（它们本身就是引用语义） | 不需要再套指针 |

拿不准时的粗暴原则：**结构体传指针，其他传值**。错不到哪去。

## 七、Go 指针 vs C 指针（给有 C 基础的人）

没学过 C 可跳过本节。Go 的指针做了大量减法，安全得多：

- ❌ 没有指针运算（`p++` 不存在）
- ❌ 不能把整数转成指针乱指
- ✅ 有垃圾回收，不用手动 free
- ✅ 返回局部变量的指针是**安全**的（编译器会自动把它分配到堆上）：

```go
func newStudent() *Student {
    s := Student{Name: "新同学"}
    return &s        // 在 Go 里完全合法且常见！
}
```

---

## 新手常见坑

1. **解引用 nil 指针 → panic**：使用前确保指针非 nil
2. **想修改却传了值**：函数改不动外面的变量时，第一反应检查是不是该传指针
3. **给切片/map 再套指针**：`*[]int`、`*map[string]int` 几乎永远不需要，它们本身就是引用语义

---

## 练习

1. 声明 `x := 100`，创建指向它的指针，打印指针的值（地址）、指针指向的值，然后通过指针把 x 改成 200。
2. 写函数 `swap(a, b *int)` 交换两个变量的值（用指针实现），在 main 中验证。
3. 定义 `Counter` 结构体（含 `Count int` 字段），写函数 `increment(c *Counter)` 让计数加一，循环调用 5 次后打印结果。
4. 故意写一段解引用 nil 指针的代码，运行它，熟悉 `nil pointer dereference` 报错长什么样（以后见到就不慌了）。

---

🎉 第三章完成！切片、map、结构体、指针是 Go 日常开发的四大件，后面所有内容都建立在它们之上。

下一章：[第四章 01 方法](../04-methods-interfaces/01-methods.md)
