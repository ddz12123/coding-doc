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

> 参数里的 `<-chan int`（只读通道）和 `chan<- int`（只写通道）是方向限制，防止工人误操作。新手看懂即可。

---

## 新手常见坑

1. **忘了 make**：`var ch chan int` 是 nil channel，收发都会永远阻塞
2. **deadlock 报错**：某个收/发操作永远等不到配对方。最常见：忘了用 `go` 启动发送方/接收方
3. **重复 close 或向已关闭 channel 发送** → panic
4. **for range 一个不 close 的 channel**：发送方发完不关闭，range 会永远等下去 → 死锁

---

## 练习

1. 启动一个 goroutine 计算 1~100 的和，通过 channel 把结果传回主 goroutine 打印。
2. 写生产者-消费者：生产者发送 10 个随机数后 close，消费者用 for range 接收并打印。
3. 用 `select` + `time.After` 实现：等待一个 2 秒后才发数据的 channel，超时时间设 1 秒，观察超时分支被触发；再把超时改成 3 秒，观察正常拿到数据。
4. 把工作池示例改成 5 个工人处理 20 个任务，运行观察任务分配。

下一节：[5.3 sync 与并发安全](03-sync.md)
