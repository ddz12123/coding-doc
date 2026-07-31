# 03 sync 与并发安全

> 本节目标：认识数据竞争问题，掌握 Mutex 互斥锁，了解竞态检测工具 -race。

## 一、并发不是免费的：数据竞争

多个 goroutine **同时读写同一个变量**会出大问题。看这个"惊悚"示例：

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    counter := 0
    var wg sync.WaitGroup

    // 1000 个 goroutine，每个把 counter 加 1
    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            counter++
        }()
    }

    wg.Wait()
    fmt.Println(counter)    // 期望 1000，实际可能是 947、982……每次都不一样！
}
```

### 为什么会少？

`counter++` 看着是一步，实际是三步：**读取 → 加 1 → 写回**。

两个 goroutine 同时执行时可能交错：

```
goroutine A：读到 5
goroutine B：读到 5        ← 也读到 5！
goroutine A：写回 6
goroutine B：写回 6        ← 覆盖了 A 的结果，两次 ++ 只加了 1
```

这就是**数据竞争（data race）**——并发编程最阴险的 bug：不一定每次出现、难以复现、后果诡异。

## 二、竞态检测器：-race

Go 自带神器，运行时加 `-race` 参数就能自动检测数据竞争：

```bash
go run -race main.go
```

对上面的程序，它会输出：

```
==================
WARNING: DATA RACE
Write at 0x00c00001c0a8 by goroutine 8:
  ...
Previous write at 0x00c00001c0a8 by goroutine 7:
  ...
==================
```

**养成习惯：写了并发代码，就用 `-race` 跑一遍测试。**

## 三、解决方案 1：Mutex 互斥锁

`sync.Mutex`（互斥锁）保证同一时刻**只有一个 goroutine** 能进入临界区：

```go
package main

import (
    "fmt"
    "sync"
)

func main() {
    counter := 0
    var mu sync.Mutex
    var wg sync.WaitGroup

    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            mu.Lock()         // 上锁：别人锁着就排队等
            counter++         // 同一时刻只有一个 goroutine 能执行这里
            mu.Unlock()       // 解锁：让下一个进来
        }()
    }

    wg.Wait()
    fmt.Println(counter)      // 稳定输出 1000 ✅
}
```

类比：公共卫生间——进去锁门（Lock），出来开锁（Unlock），其他人门口排队。

### 惯用封装：锁和数据放一个结构体

```go
type SafeCounter struct {
    mu    sync.Mutex
    count int
}

func (c *SafeCounter) Inc() {
    c.mu.Lock()
    defer c.mu.Unlock()      // defer 解锁，中途 return 或 panic 都不会忘
    c.count++
}

func (c *SafeCounter) Value() int {
    c.mu.Lock()
    defer c.mu.Unlock()
    return c.count
}
```

`defer mu.Unlock()` 是标准写法——保证无论如何都会解锁。

> 进阶：读多写少的场景有 `sync.RWMutex`（读写锁，允许多个读者同时进），新手知道存在即可。

## 四、解决方案 2：用 channel 代替共享变量

Go 风格的解法——让计数工作只由**一个** goroutine 负责，其他人通过 channel 通知它：

```go
func main() {
    ch := make(chan int)
    done := make(chan int)
    var wg sync.WaitGroup

    // 唯一的计数者
    go func() {
        counter := 0
        for range ch {
            counter++         // 只有这一个 goroutine 碰 counter，无竞争
        }
        done <- counter
    }()

    for i := 0; i < 1000; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            ch <- 1           // 只发消息，不碰共享变量
        }()
    }

    wg.Wait()
    close(ch)
    fmt.Println(<-done)       // 1000 ✅
}
```

### Mutex 还是 channel？

| 场景 | 建议 |
|------|------|
| 保护一个简单的共享状态（计数器、缓存 map） | Mutex，简单直接 |
| 传递数据、任务分发、结果收集 | channel |
| 等一组 goroutine 结束 | WaitGroup |

不必教条。Go 官方的说法是：**哪个更简单清晰用哪个。**

## 五、sync.Once：只执行一次（了解）

典型场景：全局初始化，无论多少 goroutine 同时触发，都只执行一次：

```go
var once sync.Once

func getConfig() {
    once.Do(func() {
        fmt.Println("加载配置（只会打印一次）")
    })
}
```

## 六、并发编程军规（新手版）

1. **能不共享就不共享**：没有共享变量就没有竞争
2. **共享了就加锁**，或改用 channel
3. **map 不是并发安全的**：多 goroutine 同时写 map 会直接 panic（`fatal error: concurrent map writes`），必须加锁
4. **写完并发代码必跑 `-race`**
5. **goroutine 别开越多越好**：CPU 密集任务开太多反而慢；IO 密集任务（如网络请求）适合大量 goroutine，但要控制上限（工作池模式）

---

## 新手常见坑

1. **忘记 Unlock 导致死锁**：所有人都在等锁。用 `defer mu.Unlock()` 根治
2. **拷贝了含锁的结构体**：锁被复制后失去意义。含 Mutex 的结构体一律传指针
3. **并发写 map 不加锁**：直接 panic，这个坑几乎人人踩过
4. **以为 `-race` 没报错就绝对没竞争**：它只能检测**运行时实际发生**的竞争，测试覆盖不到的路径查不出来

---

## 练习

1. 把本节开头的竞争示例敲一遍，用 `go run -race` 亲眼看看 DATA RACE 警告。
2. 用 Mutex 修复它，再跑 `-race` 确认警告消失。
3. 实现 `SafeMap` 结构体：内含 `map[string]int` 和 `sync.Mutex`，提供并发安全的 `Set(k, v)` 和 `Get(k)` 方法，开 100 个 goroutine 同时写入测试。
4. 挑战题：用"channel + 单一计数者"方案重写练习 3。

---

🎉 第五章完成！goroutine + channel + sync 是 Go 并发三件套，你已经摸到了 Go 的看家本领。

下一章把知识落地成真正的工程：[第六章 01 包与模块管理](../06-project-practice/01-packages-modules.md)
