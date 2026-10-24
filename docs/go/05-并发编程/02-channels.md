# 5.2 channel 通道

> 本节目标：学会用 channel 在 goroutine 之间传递数据，理解阻塞行为，掌握 for range 和 select。

## 一、为什么需要 channel？

上一节 goroutine 只是"各干各的"，但实际中它们需要**交流**：工人干完活要把结果交回来。

Go 的答案是 **channel（通道）**——goroutine 之间传数据的管道。Go 有句名言：

> **不要通过共享内存来通信，而要通过通信来共享内存。**
>
> （别让多个 goroutine 抢一个变量，让它们通过管道传递数据。）

## 二、channel 基本操作

```go
ch := make(chan int)      // 创建一个传 int 的 channel（必须用 make）

ch <- 42                  // 发送：把 42 放进通道（箭头指向 channel）
v := <-ch                 // 接收：从通道取出值（箭头从 channel 出来）
```

箭头 `<-` 很形象：**数据顺着箭头方向流动**。

### 第一个 channel 程序

```go
package main

import (
    "fmt"
    "time"
)

func cook(ch chan string) {
    time.Sleep(time.Second)      // 模拟做菜
    ch <- "鱼香肉丝"              // 做好了，放到出菜口
}

func main() {
    ch := make(chan string)

    go cook(ch)                  // 厨师去做菜

    dish := <-ch                 // 服务员在出菜口等（阻塞，直到有菜）
    fmt.Println("上菜：", dish)
}
```

注意这个程序**不需要 WaitGroup**——`<-ch` 会一直等到数据到来，天然完成了"等待"。

## 三、核心概念：channel 是阻塞的

无缓冲 channel（`make(chan int)`）的规则：

- **发送方** `ch <- v`：一直等，直到有人来取
- **接收方** `<-ch`：一直等，直到有人来送

就像**当面交接**：交的人和收的人必须同时在场。这个"同步"特性正是 channel 能协调 goroutine 的原因。

### 死锁：新手必经之路

如果等不到对方，程序直接崩溃：

```go
func main() {
    ch := make(chan int)
    ch <- 1        // 主 goroutine 在这等人接收……但没有别的 goroutine 了
    fmt.Println(<-ch)
}
// fatal error: all goroutines are asleep - deadlock!
```

看到 `deadlock` 报错，就检查：**是不是有 send/receive 永远等不到配对的另一方？**

## 四、缓冲 channel：有容量的管道

make 时给第二个参数，channel 就有了缓冲区：

```go
ch := make(chan int, 3)    // 容量为 3

ch <- 1      // 不阻塞（缓冲区 1/3）
ch <- 2      // 不阻塞（2/3）
ch <- 3      // 不阻塞（3/3 满了）
// ch <- 4   // 阻塞！缓冲区满，必须等人取走才能放

fmt.Println(<-ch)    // 1（先进先出）
fmt.Println(<-ch)    // 2
```

- 缓冲区**没满**：发送不阻塞
- 缓冲区**没空**：接收不阻塞
- 类比：无缓冲 = 当面交接；有缓冲 = 快递柜（柜子满了才要等）

## 五、close 与 for range

发送方发完所有数据后，可以**关闭** channel 表示"没有更多了"：

```go
package main

import "fmt"

func produce(ch chan int) {
    for i := 1; i <= 5; i++ {
        ch <- i
    }
    close(ch)                  // 发完了，关闭
}

func main() {
    ch := make(chan int)
    go produce(ch)

    for v := range ch {        // 持续接收，channel 关闭后自动结束循环
        fmt.Println("收到：", v)
    }
    fmt.Println("接收完毕")
}
```

关于 close 的规则：

- **由发送方关闭**，接收方永远不要关
- 向已关闭的 channel 发送 → panic
- 从已关闭的 channel 接收 → 立刻返回零值（可用 `v, ok := <-ch` 判断，`ok == false` 表示已关闭且取空）
- **不关闭也没关系**（会被垃圾回收），只有"接收方需要知道数据发完了"时才必须 close

眼见为实——从已 close 的 channel 接收是什么样：

```go
ch := make(chan int)
close(ch)
v, ok := <-ch    // v=0（int 的零值），ok=false —— 通道已关闭且取空
```

## 六、select：同时等多个 channel

`select` 像 channel 版的 switch：哪个 channel 先就绪，就执行哪个分支：

```go
package main

import (
    "fmt"
    "time"
)

func main() {
    ch1 := make(chan string)
    ch2 := make(chan string)

    go func() { time.Sleep(1 * time.Second); ch1 <- "来自通道1" }()
    go func() { time.Sleep(2 * time.Second); ch2 <- "来自通道2" }()

    for i := 0; i < 2; i++ {
        select {
        case msg1 := <-ch1:
            fmt.Println(msg1)
        case msg2 := <-ch2:
            fmt.Println(msg2)
        }
    }
}
```

### 经典用法：超时控制

```go
select {
case result := <-ch:
    fmt.Println("拿到结果：", result)
case <-time.After(3 * time.Second):     // 3 秒后这个 channel 会来数据
    fmt.Println("超时了，不等了！")
}
```

这是实际开发中极其常用的模式：等结果，但最多等 3 秒。

## 七、实用模式：工作池（Worker Pool）

综合运用本章知识——固定数量的工人并发处理一堆任务：

```go
package main

import (
    "fmt"
    "sync"
    "time"
)

func worker(id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
    defer wg.Done()
    for j := range jobs {              // 不断从任务通道取活干
        time.Sleep(100 * time.Millisecond)    // 模拟干活
        fmt.Printf("工人%d 完成任务%d\n", id, j)
        results <- j * 2
    }
}

func main() {
    jobs := make(chan int, 10)
    results := make(chan int, 10)
    var wg sync.WaitGroup

    // 启动 3 个工人
    for w := 1; w <= 3; w++ {
        wg.Add(1)
        go worker(w, jobs, results, &wg)
    }

    // 派发 9 个任务
    for j := 1; j <= 9; j++ {
        jobs <- j
    }
    close(jobs)          // 任务派完，工人 range 到关闭就下班

    wg.Wait()
    close(results)

    sum := 0
    for r := range results {
        sum += r
    }
    fmt.Println("结果总和：", sum)
}
```

> 参数里的 `<-chan int`（只读通道）和 `chan<- int`（只写通道）是方向限制，防止工人误操作。比如在 worker 里写 `jobs <- 1`（往只读通道发送）会直接编译报错：
>
> ```text
> invalid operation: cannot send to receive-only channel jobs (variable of type <-chan int)
> ```
>
> 方向限制把"误操作"从运行时事故提前成了编译错误。新手看懂即可。

---

## 新手常见坑（报错速查表）

| 报错原文 / 现象 | 人话翻译 | 解决 / 原因 |
|------|------|------|
| `fatal error: all goroutines are asleep - deadlock!` | 收/发永远等不到配对的另一方，全体卡死 | 最常见：忘了用 `go` 启动发送方/接收方；或 for range 一个不 close 的 channel——发送完记得 `close(ch)` |
| `panic: send on closed channel` | 往已经关闭的 channel 里塞数据 | close 只能由**发送方**调用一次；发完数据再 close，之后绝不发送 |
| `panic: close of closed channel` | 同一个 channel close 了两次 | 只在发送方 close 一次；多处收尾时改用单独的 done channel 协调 |
| `var ch chan int` 忘了 make，程序卡死无任何输出 | 这是 nil channel：收发都会**永久阻塞** | 声明+创建一步到位：`ch := make(chan int)` |

---

## 练习

1. 启动一个 goroutine 计算 1~100 的和，通过 channel 把结果传回主 goroutine 打印。
2. 写生产者-消费者：生产者发送 10 个随机数后 close，消费者用 for range 接收并打印。
3. 用 `select` + `time.After` 实现：等待一个 2 秒后才发数据的 channel，超时时间设 1 秒，观察超时分支被触发；再把超时改成 3 秒，观察正常拿到数据。
4. 把工作池示例改成 5 个工人处理 20 个任务，运行观察任务分配。

<details>
<summary>点击查看答案</summary>

**1. 求和交给 goroutine，结果走 channel：**

```go
package main

import "fmt"

func sum(ch chan int) {
    total := 0
    for i := 1; i <= 100; i++ {
        total += i
    }
    ch <- total              // 算完把结果交出去
}

func main() {
    ch := make(chan int)
    go sum(ch)
    fmt.Println("1+2+...+100 =", <-ch)    // 5050
}
```

**2. 生产者发完就 close：**

```go
package main

import (
    "fmt"
    "math/rand"
)

func main() {
    ch := make(chan int)

    go func() {              // 生产者
        for i := 0; i < 10; i++ {
            ch <- rand.Intn(100)
        }
        close(ch)            // 不 close，消费者的 range 会永远等
    }()

    for v := range ch {      // 消费者
        fmt.Println(v)
    }
}
```

**3.** 超时 1 秒、数据 2 秒才来：1 秒时 `time.After` 先就绪，走**超时分支**，打印"超时了，不等了！"；改成 3 秒：2 秒时数据先到，走**结果分支**，正常拿到数据。select 哪个分支先就绪走哪个——这就是超时控制的全部原理。

**4.** 把工人循环改成 `w <= 5`、任务循环改成 `j <= 20`。观察输出：20 个任务被 5 个工人瓜分，谁抢到几个全看调度；总耗时约 20/5 × 100ms = 400ms；结果总和恒为 2×(1+2+...+20) = **420**——并发改变速度，不改变结果。

</details>

## 本节小结

- channel 是 goroutine 间传数据的管道：`ch <- v` 发、`v := <-ch` 收；无缓冲 = 当面交接（双方到齐才走），有缓冲 = 快递柜（满了才等）
- close 由**发送方**发完数据后调用：接收方 `for v := range ch` 自动收尾，`v, ok := <-ch` 用 ok 判断是否取空
- select 同时等多个通道、配 `time.After` 做超时；`<-chan` / `chan<-` 限定方向，传错方向编译器直接拦下
- 工作池（固定工人 + jobs/results 两通道 + WaitGroup）是并发任务分发的万能骨架

传数据用 channel 很顺手，但"多人抢一个变量"还得靠锁——下一节的 sync 登场。

下一节：[5.3 sync 与并发安全](03-sync.md)
