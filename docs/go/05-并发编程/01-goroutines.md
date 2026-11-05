# 5.1 goroutine：轻量级并发

> 本节目标：理解并发的概念，学会用 `go` 关键字启动 goroutine，理解为什么需要"等待"。

## 一、从一个生活场景开始：烧水 + 切菜

**并发：同时推进多件事。** 串行执行时，总耗时等于各任务之和；并发执行时，等待的时间可以重叠。

| 方式 | 烧水（3 分钟）+ 切菜（2 分钟） | 总耗时 |
|------|------|------|
| 串行 | 先干等水开，再切菜 | 5 分钟 |
| 并发 | 按下烧水壶的同时切菜 | 3 分钟 |

程序同理：同时下载多个文件、同时处理多个用户请求，都要靠并发提升效率。

## 二、goroutine：Go 的并发单元

**goroutine：由 Go 运行时管理的轻量级"线程"**——你只需要说"这个函数拿去并发跑"，怎么调度、怎么分配资源，Go 全部代劳。

| 特点 | 说明 |
|------|------|
| 创建成本低 | 初始栈仅 2KB（系统线程要 1~8MB） |
| 数量上限高 | 一台普通电脑可同时运行几十万个 goroutine |
| 切换开销小 | 由 Go 运行时在**用户态**调度，不陷入内核 |
| 语法极简 | 函数调用前加一个 `go` 关键字 |

`main` 函数本身就运行在一个 goroutine 里，称为主 goroutine。

## 三、go 关键字：并发只需要一个词

### 拆解一下

```
go say("goroutine")
↑  ↑
go —— 并发开关：把这句调用交给一个新 goroutine 去跑，不等它执行完，主流程立刻往下走
   ↑ say("goroutine")——一句普通的函数调用，写法和以前完全一样
```

读作：**开一个新 goroutine 去执行 say("goroutine")**，主流程继续干自己的事。

| 写法 | 含义 |
|------|------|
| `go 函数名(实参)` | 启动一个 goroutine 执行该函数，主流程立即继续 |
| `go func() { … }()` | 启动一个 goroutine 执行匿名函数 |

### 最小可运行例子

```go
package main

import (
    "fmt"
    "time"
)

func say(s string) {
    for i := 0; i < 3; i++ {
        fmt.Println(s, i)
        time.Sleep(100 * time.Millisecond)   // 睡 100 毫秒，模拟耗时
    }
}

func main() {
    go say("goroutine")     // 子 goroutine 并发执行
    say("main")             // 主 goroutine 执行
}
```

输出（顺序每次可能不同）：

```
main 0
goroutine 0
goroutine 1
main 1
main 2
goroutine 2
```

两个任务的输出交替出现，说明它们确实在并发运行。

> ⚠️ 两条铁律：`go` 语句**立刻返回**，不会等 goroutine 执行完；多个 goroutine 的执行顺序由调度器决定，**不能依赖输出顺序**。

## 四、陷阱：main 一退出，所有 goroutine 立即终止

把上面的例子删掉 `say("main")` 一行：

```go
func main() {
    go say("goroutine")
    // main 到这就结束了
}
```

运行结果：**很可能什么都不输出**。主 goroutine 退出时程序整体结束，其余 goroutine 无论是否执行完都被直接终止。

所以启动 goroutine 后必须有**等待手段**。`time.Sleep` 硬等不可靠（睡短了任务没完成，睡长了浪费时间），标准做法是 `sync.WaitGroup`。

## 五、sync.WaitGroup：等齐了再走

**WaitGroup：一个计数器**——启动一个 goroutine 就 +1，干完一个就 −1，主流程等到计数归零为止。

### 拆解一下三步口诀

```
wg.Add(1)        ← ① 启动前：计数 +1，登记"多了一个要等的活"
go worker(i, &wg)
             ↑ 传指针 &wg——WaitGroup 传值等于拷贝计数器，Done 减的是副本（见坑表）

defer wg.Done()  ← ② goroutine 内第一行：干完活计数 −1；defer 保证哪怕 panic 也执行

wg.Wait()        ← ③ 主流程：停在这一行等，计数归零才放行
```

读作：**每启动一个 goroutine 前计数 +1，每个 goroutine 结束时 −1，主流程等到计数归零**。口诀：启动前 `Add(1)`，goroutine 内 `defer Done()`，主流程 `Wait()`。

### 完整例子

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, wg *sync.WaitGroup) {
    defer wg.Done()                    // 干完活，计数减 1（defer 保证一定执行）
    fmt.Printf("工人 %d 开始干活\n", id)
    time.Sleep(time.Second)            // 模拟干活
    fmt.Printf("工人 %d 干完了\n", id)
}

func main() {
    var wg sync.WaitGroup

    for i := 1; i <= 3; i++ {
        wg.Add(1)                      // 每启动一个任务，计数加 1
        go worker(i, &wg)              // 注意传指针
    }

    wg.Wait()                          // 阻塞，直到计数归零
    fmt.Println("所有工人都干完了")
}
```

输出（前三行顺序随机）：

```
工人 3 开始干活
工人 1 开始干活
工人 2 开始干活
工人 1 干完了
工人 3 干完了
工人 2 干完了
所有工人都干完了
```

### 两个必须注意的点

- **WaitGroup 必须传指针 `&wg`**：传值会拷贝整个计数器，`Done` 减的是副本的计数，`Wait` 永远等不到归零
- `wg.Add(1)` 不能写进 goroutine 内部：否则 `Wait` 可能在计数 +1 之前执行，提前放行

## 六、验证并发的收益：5 个下载只要 1 秒

模拟下载 5 个文件，每个耗时 1 秒：

```go
func download(name string, wg *sync.WaitGroup) {
    defer wg.Done()
    time.Sleep(time.Second)            // 模拟下载耗时
    fmt.Println(name, "下载完成")
}

func main() {
    start := time.Now()
    var wg sync.WaitGroup

    for i := 1; i <= 5; i++ {
        wg.Add(1)
        go download(fmt.Sprintf("文件%d", i), &wg)
    }
    wg.Wait()

    fmt.Println("总耗时：", time.Since(start))
}
```

输出：

```
文件4 下载完成
文件1 下载完成
文件5 下载完成
文件2 下载完成
文件3 下载完成
总耗时： 1.001s      ← 串行要 5 秒，并发只要 1 秒
```

结论：并发总耗时取决于**最慢的任务**，而不是所有任务耗时之和。

## 七、循环变量陷阱

在循环里启动 goroutine 时，闭包直接引用循环变量要小心：

```go
for i := 0; i < 3; i++ {
    go func() {
        fmt.Println(i)      // Go 1.22+ 输出 0 1 2（顺序随机）
    }()                     // Go 1.21 及之前可能输出 3 3 3
}
```

| 写法 | 适用版本 | 说明 |
|------|------|------|
| 闭包直接引用 `i` | Go 1.22+ | 每次循环迭代都是新变量，官方已修复此坑 |
| `go func(n int) { … }(i)` | 所有版本 | 把变量作为参数传入，老代码与面试题的通用写法 |

### 拆解一下兼容写法

```
go func(n int) { … }(i)
        ↑            ↑
        参数 n：i 的当前值被复制一份存进 n，之后 i 再怎么变都影响不到 n
                     这一轮的 i 立刻作为实参传入——每个 goroutine 分到自己的值
```

读作：启动一个 goroutine 执行匿名函数，并把这一轮的 i 值作为参数传进去。

```go
for i := 0; i < 3; i++ {
    go func(n int) {
        fmt.Println(n)      // 任何版本都正确
    }(i)
}
```

## 八、常用操作速查

| 需求 | 写法 |
|------|------|
| 启动 goroutine | `go 函数名(实参)` |
| 等待一组 goroutine 结束 | `Add(1)` + `defer Done()` + `Wait()` |
| 统计耗时 | `start := time.Now()` … `time.Since(start)` |
| 循环里启动（兼容旧版本） | `go func(n int) { … }(i)` |

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `fatal error: all goroutines are asleep - deadlock!` | 所有 goroutine 都在等待，程序卡死被强制终止。头号原因：WaitGroup 传值不传指针，`Done` 减的是副本的计数，`Wait` 永不归零 | 一律传 `&wg` |
| 程序直接结束，goroutine 一个字都没输出 | main 跑完退出，其余 goroutine 全部被终止 | 用 WaitGroup 的 `Wait()` 等齐再退出，不要用 `time.Sleep` 硬等 |
| `wg.Wait()` 提前放行，任务明明没跑完 | `Add` 写在了 goroutine 里面，`Wait` 先执行时计数还是 0，直接通过 | `wg.Add(1)` 必须在 `go` 语句**之前**调用 |
| 每次运行输出顺序都不一样 | 正常现象，执行顺序由调度器随机决定 | 不要依赖 goroutine 的执行顺序，需要顺序就用下一节的 channel 编排 |
| `go vet` 警告 `... passes lock by value: sync.WaitGroup contains sync.noCopy` | WaitGroup 被整个拷贝了一份传进函数，副本上的计数加减无效 | 含锁/WaitGroup 的对象一律传指针；`go vet ./...` 能提前发现 |

## 练习

**1.** 启动 3 个 goroutine 分别打印自己的编号，用 WaitGroup 等待全部完成后打印"结束"。

**2.** 写函数模拟煮饭（2 秒）和炒菜（1 秒），先串行执行统计耗时，再改成并发执行统计耗时，对比结果。

**3.** 故意把 `go worker(i, &wg)` 改成传值 `wg`（需要相应改函数签名），运行观察 `fatal error: all goroutines are asleep - deadlock!` 报错，认识死锁的表现形式。

<details>
<summary>点击查看答案</summary>

**1. WaitGroup 三步口诀落地：**

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    var wg sync.WaitGroup

    for i := 1; i <= 3; i++ {
        wg.Add(1)               // ① 启动前：计数加 1
        go func(id int) {
            defer wg.Done()     // ② goroutine 里：干完活计数减 1
            fmt.Println("我是", id, "号")
        }(i)
    }

    wg.Wait()                   // ③ 主流程：等计数归零
    fmt.Println("结束")
}
```

**2.** 串行：2s + 1s ≈ 3 秒；并发：≈ 2 秒——总耗时取决于**最慢**的那个任务，与本节第一部分的烧水+切菜同理。用 `start := time.Now()` 记开始时间，`time.Since(start)` 打印耗时即可。

**3.** 传值后，`worker` 拿到的是 wg 的一份**拷贝**：`Done` 减的是拷贝的计数，原版 wg 永远停在 3，`Wait` 永不归零，main 卡死，于是看到：

```text
fatal error: all goroutines are asleep - deadlock!
```

不必真跑到死锁，`go vet` 就能提前发现，警告信息为 `worker passes lock by value: sync.WaitGroup contains sync.noCopy`。记住结论：**WaitGroup 一律传指针 `&wg`**。

</details>

## 本节小结

- goroutine 非常轻量（2KB 起步、用户态调度），`go 函数()` 即可启动；但 main 退出会终止所有 goroutine，必须有等待手段
- 等待用 WaitGroup 三步口诀：启动前 `Add(1)`、goroutine 内 `defer Done()`、主流程 `Wait()`；**必须传指针 `&wg`**
- 并发总耗时取决于最慢的任务，而非各任务耗时之和
- 循环里启动 goroutine：Go 1.22+ 直接引用循环变量已安全；兼容旧代码时把变量当参数传入

下一节：[5.2 channel 通道](02-channels.md)
