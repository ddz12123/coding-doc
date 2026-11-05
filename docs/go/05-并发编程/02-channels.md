# 5.2 channel 通道

> 本节目标：学会用 channel 在 goroutine 之间传递数据，理解阻塞行为，掌握 for range 和 select。

## 一、为什么需要 channel：goroutine 之间要"传话"

上一节的 goroutine 只是各干各的，但任务之间需要**交流**：工人算完活，结果要交回主流程。

**channel（通道）：goroutine 之间传数据的管道**——一头塞、一头取，数据顺着管道流。

Go 的设计哲学：

> **不要通过共享内存来通信，而要通过通信来共享内存。**
>
> （不要让多个 goroutine 抢一个变量，而是让它们通过管道传递数据。）

## 二、创建与收发：一个箭头管两个方向

### 拆解一下创建

```
ch := make(chan int)
      ↑         ↑
      make——channel 必须用 make 创建；只声明不创建是 nil 通道，收发永久卡死
                元素类型——通道里只能装这一种类型
```

读作：**创建一个传递 int 的通道**。

### 拆解一下发送和接收

发送：

```
ch <- v
   ↑
   箭头尖指向左边的 ch——数据顺着箭头流进通道；v 是要送进去的值
```

读作：把 v 发送到通道 ch。

接收：

```
v := <-ch
     ↑
     箭头尖指向左边的 v——数据从通道 ch 里流出来，交给 v 接住
```

读作：从通道 ch 接收一个值，存进变量 v。

记忆口诀：**箭头指向谁，数据就往谁那边送。** 发送时箭头指向通道，接收时箭头指向变量。

### 收发操作一览

| 操作 | 语法 | 说明 |
|------|------|------|
| 创建 | `ch := make(chan int)` | 创建传递 int 的通道，**必须用 make** |
| 发送 | `ch <- v` | 把 v 放进通道，箭头指向 channel |
| 接收 | `v := <-ch` | 从通道取出值，箭头从 channel 出来 |

channel 是强类型的：`chan string` 只能收发 string，塞别的类型直接编译报错。

### 最小可运行例子

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

输出：

```
上菜： 鱼香肉丝
```

注意这个程序**不需要 WaitGroup**——`<-ch` 会一直等到数据到来，天然完成了"等待"。

## 三、核心规则：无缓冲通道，收发必须碰头

无缓冲 channel（`make(chan int)`）的行为：

| 操作 | 行为 |
|------|------|
| 发送 `ch <- v` | 阻塞，直到有人来取 |
| 接收 `<-ch` | 阻塞，直到有人来送 |

即发送方和接收方必须**同时就绪**。接收会阻塞这个特性，让 `<-ch` 成了最简单的"同步等待结果"手段。

等不到配对的另一方时，程序直接崩溃：

```go
func main() {
    ch := make(chan int)
    ch <- 1        // 主 goroutine 在这等人接收……但没有别的 goroutine 了
    fmt.Println(<-ch)
}
// fatal error: all goroutines are asleep - deadlock!
```

> ⚠️ 看到 `deadlock` 报错，先检查收发两端是否有一端被忘了放进 goroutine——收发两端至少要有一端在**另一个 goroutine** 里运行。

## 四、缓冲通道：没满就能塞，没空就能取

### 拆解一下

```
ch := make(chan int, 3)
                ↑    ↑
                元素类型——只能传 int；不写容量就是无缓冲（见 三）
                     容量——缓冲区能装 3 个值，满了发送才阻塞
```

读作：**创建一个能缓冲 3 个 int 的通道**。

### 阻塞规则：满了发送才阻塞，空了接收才阻塞

| 场景 | 发送方 `ch <- v` | 接收方 `<-ch` |
|------|------|------|
| 缓冲区没满 | 直接放进缓冲区，不阻塞 | 缓冲区非空就有数据，不阻塞 |
| 缓冲区满了 | **阻塞**，等人取走一个 | 有数据可取，不阻塞 |
| 缓冲区空了 | 还能放，不阻塞 | **阻塞**，等新数据进来 |

可以把缓冲 channel 想象成**快递柜**：没满随时投，没空随时取。缓冲满或空时，行为与无缓冲一致（卡住等对方）。

```go
ch := make(chan int, 3)    // 容量为 3

ch <- 1      // 不阻塞（缓冲区 1/3）
ch <- 2      // 不阻塞（2/3）
ch <- 3      // 不阻塞（3/3 满了）
// ch <- 4   // 阻塞——缓冲区满，必须等人取走才能放

fmt.Println(<-ch)    // 1（先进先出）
fmt.Println(<-ch)    // 2
```

## 五、close 与 for range：发送方的"发完了"信号

### 拆解一下

```
close(ch)
      ↑
      要关闭的通道——close 宣告"没有更多数据了"
```

```
for v := range ch {
         ↑
         range 一个通道：持续接收，每个值交给 v；通道关闭后循环自动结束
}
```

读作：**持续从 ch 接收值，直到通道被关闭**。

| 写法 | 含义 |
|------|------|
| `close(ch)` | 关闭通道，表示"没有更多数据了" |
| `for v := range ch` | 持续接收，通道关闭后循环自动结束 |
| `v, ok := <-ch` | ok 为 false 表示通道已关闭且取空 |

### 例子

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

输出：

```
收到： 1
收到： 2
收到： 3
收到： 4
收到： 5
接收完毕
```

从已 close 的 channel 接收，会立即返回零值：

```go
ch := make(chan int)
close(ch)
v, ok := <-ch    // v=0（int 的零值），ok=false —— 通道已关闭且取空
```

> ⚠️ close 只能由**发送方**调用一次：向已关闭的 channel 发送 → panic。从已关闭的 channel 接收则安全，立刻返回元素类型的零值（`ok == false` 表示已关闭且取空）。另外，**不 close 也不会泄漏**（channel 会被垃圾回收），只有接收方需要知道"数据发完了"时才必须 close。

## 六、select：同时守着几个通道

### 拆解一下结构

```
select {
case msg := <-ch1:    ← 分支一：守着 ch1，ch1 先来数据就执行我
    …
case msg := <-ch2:    ← 分支二：守着 ch2，ch2 先来数据就执行我
    …
}
```

读作：**同时监听所有 case 里的通道，哪个先就绪走哪个，一次只走一个**。select 就是 channel 版的 switch。

### 例子

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

输出（按就绪时间先后）：

```
来自通道1
来自通道2
```

select 每次只执行**一个**就绪的分支；要持续监听多个消息，就用 for 循环包住 select——上面的例子正是这么写的。

经典用法——超时控制：

```go
select {
case result := <-ch:
    fmt.Println("拿到结果：", result)
case <-time.After(3 * time.Second):     // 3 秒后这个 channel 会来数据
    fmt.Println("超时了，不等了！")
}
```

等结果，但最多等 3 秒——实际开发中极其常用的模式。`time.After(d)` 返回一个 d 时间后才来数据的通道，谁先就绪走谁。

## 七、单向通道：把方向写进类型

### 拆解一下

```
<-chan int    只读通道：箭头从 chan 出发，数据只能流出——只能接收
chan<- int    只写通道：箭头指向 chan，数据只能流进——只能发送
```

读作：**箭头指向 chan 就只能写，箭头背离 chan 就只能读**。

### 例子

在只读通道上发送，直接编译报错：

```text
invalid operation: cannot send to receive-only channel jobs (variable of type <-chan int)
```

方向限制把"误用通道方向"从运行时事故提前成**编译错误**。典型用法见 八 的工作池：worker 只读 jobs、只写 results。

## 八、实用模式：工作池（Worker Pool）

固定数量的 worker 并发消费一批任务，综合运用本章知识。

### 结构骨架

```
jobs 通道（派发任务） → N 个 worker（WaitGroup 管理） → results 通道（收集结果）
任务派发完毕后 close(jobs)，worker 的 for range 随之结束
```

### 例子

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

输出（中间各行顺序随机）：

```
工人2 完成任务1
工人1 完成任务2
……
结果总和： 90
```

### 两个要点

- worker 内 `for j := range jobs`：`close(jobs)` 后循环自动结束，工人下班
- worker 的参数用 `<-chan` / `chan<-` 声明为单向通道，函数体内误用方向会编译报错（见 七）

## 九、常用操作速查

| 需求 | 写法 |
|------|------|
| 创建 | `ch := make(chan T)` / `ch := make(chan T, n)` |
| 发送 / 接收 | `ch <- v` / `v := <-ch` |
| 判断是否取空 | `v, ok := <-ch` |
| 持续接收直到关闭 | `for v := range ch` |
| 关闭（发送方） | `close(ch)` |
| 多路监听 | `select { case v := <-ch1: … }` |
| 超时控制 | `select` + `time.After(d)` |
| 参数方向限制 | `<-chan T`（只读）/ `chan<- T`（只写） |

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `fatal error: all goroutines are asleep - deadlock!` | 收/发永远等不到配对的另一方，全体卡死 | 最常见：忘了用 `go` 启动发送方/接收方；或 for range 一个不 close 的 channel——发送完记得 `close(ch)` |
| `panic: send on closed channel` | 往已经关闭的 channel 里塞数据 | close 只能由**发送方**调用一次；发完数据再 close，之后绝不发送 |
| `panic: close of closed channel` | 同一个 channel close 了两次 | 只在发送方 close 一次；多处收尾时改用单独的 done channel 协调 |
| `var ch chan int` 忘了 make，程序卡死无任何输出 | 这是 nil channel：收发都会**永久阻塞** | 声明+创建一步到位：`ch := make(chan int)` |

## 练习

**1.** 启动一个 goroutine 计算 1~100 的和，通过 channel 把结果传回主 goroutine 打印。

**2.** 写生产者-消费者：生产者发送 10 个随机数后 close，消费者用 for range 接收并打印。

**3.** 用 `select` + `time.After` 实现：等待一个 2 秒后才发数据的 channel，超时时间设 1 秒，观察超时分支被触发；再把超时改成 3 秒，观察正常拿到数据。

**4.** 把工作池示例改成 5 个工人处理 20 个任务，运行观察任务分配。

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

**3.** 超时 1 秒、数据 2 秒才到：1 秒时 `time.After` 先就绪，走**超时分支**，打印"超时了，不等了！"；改成 3 秒：2 秒时数据先到，走**结果分支**，正常拿到数据。select 哪个分支先就绪走哪个——这就是超时控制的全部原理。

**4.** 把工人循环改成 `w <= 5`、任务循环改成 `j <= 20`。观察输出：20 个任务被 5 个工人瓜分，谁抢到几个由调度决定；总耗时约 20/5 × 100ms = 400ms；结果总和恒为 2×(1+2+...+20) = **420**——并发改变速度，不改变结果。

</details>

## 本节小结

- channel 是 goroutine 间传数据的管道：`ch <- v` 发、`v := <-ch` 收；无缓冲要求收发双方同时就绪，有缓冲在未满/非空时不阻塞
- close 由**发送方**发完数据后调用：接收方 `for v := range ch` 自动收尾，`v, ok := <-ch` 用 ok 判断是否取空
- select 同时监听多个通道、哪个先就绪走哪个，配 `time.After` 实现超时控制；`<-chan` / `chan<-` 限定方向，方向用错编译期即被拦截
- 工作池（固定 worker + jobs/results 两通道 + WaitGroup）是并发任务分发的通用骨架

下一节：[5.3 sync 与并发安全](03-sync.md)
