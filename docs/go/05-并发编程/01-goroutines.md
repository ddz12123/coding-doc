# 5.1 goroutine：轻量级并发

> 本节目标：理解并发的概念，学会用 `go` 关键字启动 goroutine，理解为什么需要"等待"。

## 一、什么是并发？

**并发 = 同时处理多件事。**

生活例子：烧水（3 分钟）+ 切菜（2 分钟）。

- 串行做：先烧水干等 3 分钟，再切菜，总共 5 分钟
- 并发做：按下烧水壶，烧水的同时切菜，总共 3 分钟

程序也一样：下载 10 个文件、同时处理 1000 个用户请求、边计算边等网络响应……并发能大幅提升效率。

## 二、goroutine：Go 的并发单元

goroutine 是 Go 运行时管理的**轻量级线程**：

- 创建成本极低（初始栈仅 2KB，系统线程要 1~8MB）
- 一台普通电脑轻松跑**几十万个** goroutine
- 切换由 Go 运行时在**用户态**调度完成，不用陷入内核，比线程切换便宜得多
- 语法简单到离谱：函数调用前加个 `go`

```go
go doSomething()      // 启动一个 goroutine 去执行，主流程立刻继续往下走
```

其实你一直在用它——`main` 函数本身就跑在一个 goroutine 里（主 goroutine）。

## 三、第一个并发程序（以及第一个陷阱）

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
    go say("goroutine")     // 并发执行
    say("main")             // 主 goroutine 执行
}
```

运行输出（顺序每次可能不同）：

```
main 0
goroutine 0
goroutine 1
main 1
main 2
goroutine 2
```

两个任务**交替输出**——它们真的在并发运行！

### 陷阱：main 一退出，所有 goroutine 陪葬

把上面 `say("main")` 那行删掉试试：

```go
func main() {
    go say("goroutine")
    // main 到这就结束了
}
```

**很可能什么都不输出！** 因为主 goroutine 退出时，程序整体结束，其他 goroutine 无论干没干完都被直接杀掉。

goroutine 的启动是"发射后不管"——`go` 语句立刻返回，不会等它执行。所以必须有办法**等它干完**。

## 四、正确的等待方式：sync.WaitGroup

用 `time.Sleep` 硬等是碰运气（睡短了没干完，睡长了浪费时间）。正确姿势是 `sync.WaitGroup`——一个并发计数器：

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
        go worker(i, &wg)              // 注意传指针！
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

三步口诀：

1. 启动前 `wg.Add(1)`
2. goroutine 里 `defer wg.Done()`
3. 主流程 `wg.Wait()` 等待归零

## 五、体验并发的威力

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
总耗时： 1.001s      ← 串行要 5 秒，并发只要 1 秒！
```

## 六、循环变量陷阱（重要！）

在循环里启动 goroutine，闭包直接引用循环变量时要小心：

```go
for i := 0; i < 3; i++ {
    go func() {
        fmt.Println(i)      // Go 1.22+ 输出 0 1 2（顺序随机）；
    }()                     // Go 1.21 及之前可能输出 3 3 3！
}
```

- **Go 1.22 起**每次循环迭代都是新变量，这个坑官方修掉了
- 但为了兼容旧代码/旧面试题，你要知道老写法是**把变量作为参数传进去**：

```go
for i := 0; i < 3; i++ {
    go func(n int) {
        fmt.Println(n)      // 任何版本都正确
    }(i)
}
```

---

## 新手常见坑（报错速查表）

| 报错原文 / 现象 | 人话翻译 | 解决 / 原因 |
|------|------|------|
| `fatal error: all goroutines are asleep - deadlock!` | 所有 goroutine 都睡着了，程序卡死被强制终止 | 等一个永远等不到的事。头号原因：WaitGroup 传值不传指针——Done 减的是拷贝的计数，Wait 永不归零。必须传 `&wg` |
| 程序直接结束，goroutine 一个字都没输出 | main 跑完退出，其他 goroutine 全体陪葬 | 用 WaitGroup 的 `Wait()` 等齐再退出，别用 Sleep 碰运气 |
| `wg.Wait()` 提前放行，任务明明没跑完 | `Add` 写在了 goroutine 里面，Wait 先执行时计数还是 0，直接通过 | `wg.Add(1)` 必须在 `go` 语句**之前**调用 |
| 每次运行输出顺序都不一样 | 正常现象！执行顺序由调度器随机决定 | 不要依赖 goroutine 的执行顺序，需要顺序就用下一节的 channel 编排 |
| （go vet 警告）`... passes lock by value: sync.WaitGroup contains sync.noCopy` | WaitGroup 被整个拷贝了一份传进函数，拷贝的计数加减无效 | 含锁/WaitGroup 的东西一律传指针；`go vet ./...` 能提前抓出来 |

---

## 练习

1. 启动 3 个 goroutine 分别打印自己的编号，用 WaitGroup 等待全部完成后打印"结束"。
2. 写函数模拟煮饭（2 秒）和炒菜（1 秒），先串行执行统计耗时，再改成并发执行统计耗时，对比结果。
3. 故意把 `go worker(i, &wg)` 改成传值 `wg`（需要相应改函数签名），运行观察 `fatal error: all goroutines are asleep - deadlock!` 报错——认识死锁长什么样。

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

**2.** 串行：2s + 1s ≈ 3 秒；并发：≈ 2 秒——总耗时取决于**最慢**的那个任务，和烧水+切菜一个道理。用 `start := time.Now()` 记开始时间，`time.Since(start)` 打印耗时即可。

**3.** 传值后，`worker` 拿到的是 wg 的一份**拷贝**：`Done` 减的是拷贝的计数，原版 wg 永远停在 3，`Wait` 永不归零，main 卡死——于是看到：

```text
fatal error: all goroutines are asleep - deadlock!
```

其实不用真跑到死锁，`go vet` 就能提前发现，它会警告 `worker passes lock by value: sync.WaitGroup contains sync.noCopy`。记住结论：**WaitGroup 一律传指针 `&wg`**。

</details>

## 本节小结

- goroutine 轻到离谱（2KB 起步、用户态调度），`go 函数()` 就能启动；但 main 一退出全体陪葬，必须有"等待"手段
- 等待用 WaitGroup 三步口诀：启动前 `Add(1)`、里面 `defer Done()`、外面 `Wait()`；**必须传指针 `&wg`**
- 循环里起 goroutine：Go 1.22+ 引用循环变量已安全；老代码把变量当参数传进去最稳

光会"同时跑"还不够，下一节让 goroutine 学会互相传话。

下一节：[5.2 channel 通道](02-channels.md)
