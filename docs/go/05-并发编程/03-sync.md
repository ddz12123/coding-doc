# 5.3 sync 与并发安全

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

典型场景：全局初始化，无论多少 goroutine 同时触发，都只执行一次。完整跑一把——5 个 goroutine 同时要配置，看"加载配置"出现几次：

```go
package main

import (
    "fmt"
    "sync"
)

var (
    once   sync.Once
    config string
)

func getConfig() string {
    once.Do(func() {           // 5 个 goroutine 同时到这，只有第一个真正执行
        config = "数据库连接配置"
        fmt.Println("加载配置")  // 只会打印一次
    })                         // 其他 4 个在这等它干完，然后直接跳过
    return config
}

func main() {
    var wg sync.WaitGroup
    for i := 1; i <= 5; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            fmt.Printf("goroutine %d 拿到配置：%s\n", id, getConfig())
        }(i)
    }
    wg.Wait()
}
```

输出（后五行顺序随机）：

```text
加载配置
goroutine 3 拿到配置：数据库连接配置
goroutine 1 拿到配置：数据库连接配置
goroutine 5 拿到配置：数据库连接配置
goroutine 2 拿到配置：数据库连接配置
goroutine 4 拿到配置：数据库连接配置
```

"加载配置"只出现**一次**，且一定在所有"拿到配置"之前——`once.Do` 保证函数只执行一次，其他调用原地等它执行完再继续。

## 六、并发编程军规（新手版）

1. **能不共享就不共享**：没有共享变量就没有竞争
2. **共享了就加锁**，或改用 channel
3. **map 不是并发安全的**：多 goroutine 同时写 map 会直接 panic（`fatal error: concurrent map writes`），必须加锁
4. **写完并发代码必跑 `-race`**
5. **goroutine 别开越多越好**：CPU 密集任务开太多反而慢；IO 密集任务（如网络请求）适合大量 goroutine，但要控制上限（工作池模式）

---

## 新手常见坑（报错速查表）

| 报错原文 / 现象 | 人话翻译 | 解决 / 原因 |
|------|------|------|
| `fatal error: concurrent map writes` | 多个 goroutine 同时写一个 map，运行时直接崩溃退出 | map 不是并发安全的：写操作用 Mutex 保护，或让单个 goroutine 独占 map |
| `fatal error: all goroutines are asleep - deadlock!` | 忘了 Unlock（或某条路径绕过了 Unlock），所有人排队等锁 | `mu.Lock()` 下一行就写 `defer mu.Unlock()`，根治 |
| `WARNING: DATA RACE`（`go run -race` 的输出） | 检测到两个 goroutine 在无保护地同时读写同一处内存 | 按警告指出的变量和行号，加锁或改用 channel |
| （go vet 警告）`passes lock by value` | 含 Mutex 的结构体被**拷贝**了一份，拷贝出来的锁形同虚设 | 含锁结构体一律传指针 `&s`，方法接收者用 `func (s *SafeMap)` |
| `-race` 没报错，上线还是偶发出错 | 它只能检测**运行时实际发生**的竞争 | 测试要真实跑并发路径；没执行到的代码它看不见 |

---

## 练习

1. 把本节开头的竞争示例敲一遍，用 `go run -race` 亲眼看看 DATA RACE 警告。
2. 用 Mutex 修复它，再跑 `-race` 确认警告消失。
3. 实现 `SafeMap` 结构体：内含 `map[string]int` 和 `sync.Mutex`，提供并发安全的 `Set(k, v)` 和 `Get(k)` 方法，开 100 个 goroutine 同时写入测试。
4. 挑战题：用"channel + 单一计数者"方案重写练习 3。

<details>
<summary>点击查看答案</summary>

**1 / 2.** 直接跑大概率能看到 WARNING，且 counter 小于 1000；加 Mutex 后 WARNING 消失、稳定输出 1000。（竞争是概率性的，多跑几次或把 goroutine 数加大更容易复现。）

**3. SafeMap 参考实现：**

```go
package main

import (
    "fmt"
    "sync"
)

type SafeMap struct {
    mu sync.Mutex
    m  map[string]int
}

func NewSafeMap() *SafeMap {
    return &SafeMap{m: make(map[string]int)}
}

func (s *SafeMap) Set(k string, v int) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.m[k] = v
}

func (s *SafeMap) Get(k string) int {
    s.mu.Lock()
    defer s.mu.Unlock()
    return s.m[k]
}

func (s *SafeMap) Len() int {
    s.mu.Lock()
    defer s.mu.Unlock()
    return len(s.m)
}

func main() {
    sm := NewSafeMap()
    var wg sync.WaitGroup
    for i := 0; i < 100; i++ {
        wg.Add(1)
        go func(id int) {
            defer wg.Done()
            sm.Set(fmt.Sprintf("key-%d", id), id)
        }(i)
    }
    wg.Wait()
    fmt.Println("map 大小：", sm.Len())   // 稳定 100；不加锁会 concurrent map writes
}
```

**4. 思路：** 让 map 只被**一个** goroutine 持有（单一保管员）。定义请求结构 `type setReq struct{ k string; v int }`，其他 goroutine 往 `ch := make(chan setReq)` 发请求；保管员 `for req := range ch { m[req.k] = req.v }`；全部发完后 `close(ch)`，保管员自然下班。只有保管员一人碰 map，天然无竞争，一把锁都不用。

</details>

## 本节小结

- 并发读写共享变量 = 数据竞争：结果随机、难复现。`go run -race` / `go test -race` 是并发代码的必跑检查
- Mutex 三板斧：`Lock()` → 临界区 → `defer Unlock()`；锁和数据封装进同一个结构体，含锁结构体一律传指针
- map 不是并发安全的，并发写直接 `fatal error: concurrent map writes`
- 选型口诀：保护共享状态用 Mutex，传递数据/任务用 channel，等一组结束用 WaitGroup

---

🎉 第五章完成！goroutine + channel + sync 是 Go 并发三件套，你已经摸到了 Go 的看家本领。

下一章把知识落地成真正的工程：[6.1 包与模块管理](../06-项目实战/01-packages-modules.md)
