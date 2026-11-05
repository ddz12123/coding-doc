# 6.3 常用标准库速览

> 本节目标：认识日常开发最高频的几个标准库。不用背，知道"有这个东西、大概怎么用"，需要时回来查。

Go 标准库开箱即用：许多其他语言需要安装第三方库的功能，Go 标准库直接提供。本章按"函数表 + 短例子"组织，当速查手册用，每张表后附一句"怎么读"。

> `fmt` 在前五章已大量使用，`Println`/`Printf` 不再单独讲解。

## 一、strings：字符串操作

| 函数 | 用途 | 示例结果（s := "Hello, Go World"） |
|------|------|------|
| `strings.Contains(s, "Go")` | 是否包含 | `true` |
| `strings.HasPrefix(s, "Hello")` | 是否有前缀 | `true` |
| `strings.HasSuffix(s, "World")` | 是否有后缀 | `true` |
| `strings.Index(s, "Go")` | 首次出现位置，没有返回 -1 | `7` |
| `strings.ToUpper(s)` | 转大写 | `"HELLO, GO WORLD"` |
| `strings.ToLower(s)` | 转小写 | `"hello, go world"` |
| `strings.Replace(s, "o", "0", 1)` | 替换 n 次（n 为 -1 表示全部） | `"Hell0, Go World"` |
| `strings.ReplaceAll(s, "o", "0")` | 全部替换 | `"Hell0, G0 W0rld"` |
| `strings.TrimSpace("  abc  ")` | 去首尾空白 | `"abc"` |
| `strings.Split("a,b,c", ",")` | 按分隔符拆分 | `["a" "b" "c"]` |
| `strings.Join([]string{"a","b"}, "-")` | 按分隔符拼接 | `"a-b"` |
| `strings.Fields("a b  c")` | 按空白拆分 | `["a" "b" "c"]` |
| `strings.Repeat("ab", 3)` | 重复 n 次 | `"ababab"` |

> 怎么读：这批函数名大多是完整问句——`Contains(s, "Go")` 读作"s 里包含 Go 吗"，`HasPrefix` 读作"有前缀吗"，`Index` 读作"Go 首次出现在第几位"。参数顺序统一是"先说处理谁，再说怎么处理"。

```go
package main

import (
    "fmt"
    "strings"
)

func main() {
    s := "Hello, Go World"
    fmt.Println(strings.Contains(s, "Go"))     // true
    fmt.Println(strings.ToUpper(s))            // HELLO, GO WORLD
    fmt.Println(strings.Fields("a b  c"))      // [a b c]

    // 高效拼接大量字符串：strings.Builder
    var b strings.Builder
    for i := 0; i < 5; i++ {
        b.WriteString("x")
    }
    fmt.Println(b.String())                    // xxxxx
}
```

- `+` 拼接每次都产生新字符串，循环里大量拼接用 `strings.Builder`
- `Split` 按指定分隔符拆；`Fields` 按任意空白拆，自动忽略连续空格

## 二、strconv：字符串 ↔ 数字

| 函数 | 用途 | 示例结果 |
|------|------|------|
| `strconv.Atoi("42")` | 字符串 → int | `42, nil` |
| `strconv.Itoa(42)` | int → 字符串 | `"42"` |
| `strconv.ParseFloat("3.14", 64)` | 字符串 → float64 | `3.14, nil` |
| `strconv.ParseBool("true")` | 字符串 → bool | `true, nil` |

> 怎么读：`Atoi` = ASCII to int，**字符串转数字**；`Itoa` = int to ASCII，**数字转字符串**。方向看 to 的前后：Atoi 是 A → I，Itoa 是 I → A。

```go
n, err := strconv.Atoi("42")             // 字符串 → int
s := strconv.Itoa(42)                    // int → 字符串
f, err := strconv.ParseFloat("3.14", 64) // 字符串 → float64
b, err := strconv.ParseBool("true")      // 字符串 → bool
```

> ⚠️ Atoi / ParseXxx 都返回 `(值, error)`：解析失败（如 `Atoi("abc")`）会返回错误，不要忽略 err。

## 三、time：时间处理

| 函数/方法 | 用途 |
|------|------|
| `time.Now()` | 当前时间 |
| `now.Year()` / `now.Month()` / `now.Day()` | 取年、月、日 |
| `now.Format("2006-01-02 15:04:05")` | 格式化为字符串 |
| `time.Parse(layout, value)` | 解析字符串为时间 |
| `t.Add(24 * time.Hour)` | 时间运算 |
| `t2.Sub(t1)` | 求时间差，返回 `time.Duration` |
| `time.Sleep(d)` | 休眠一段时间 |
| `time.Since(start)` | 从 start 到现在，常用于计时 |

> 怎么读：`now.Format(模板)` 读作"按模板把时间排成字符串"；`t.Add(时长)` 读作"往后推一段时间"；`t2.Sub(t1)` 读作"t2 减 t1，相差多少"。

```go
now := time.Now()
fmt.Println(now.Year(), now.Month(), now.Day())

// 格式化：Go 不用 yyyy-MM-dd，而是用"参考时间"2006-01-02 15:04:05
fmt.Println(now.Format("2006-01-02 15:04:05"))   // 2026-07-26 14:30:00
fmt.Println(now.Format("2006年01月02日"))

// 解析
t, err := time.Parse("2006-01-02", "2024-06-01")

// 时间运算
tomorrow := now.Add(24 * time.Hour)
diff := tomorrow.Sub(now)               // 得到 time.Duration
fmt.Println(diff.Hours())               // 24

// 休眠与计时
time.Sleep(100 * time.Millisecond)
start := time.Now()
// ...干活...
fmt.Println("耗时：", time.Since(start))
```

> ⚠️ **格式化模板只能用参考时间 `2006-01-02 15:04:05`**（美式顺序 1月2日3点4分5秒06年，方便记忆：1,2,3,4,5,6）。写成其他年份会原样输出。

## 四、os：文件与系统交互

| 函数/变量 | 用途 |
|------|------|
| `os.ReadFile("config.txt")` | 读整个文件，返回 `[]byte`（小文件最方便的方式） |
| `os.WriteFile("out.txt", data, 0644)` | 写整个文件（0644 是文件权限，照抄即可） |
| `os.Args` | 命令行参数切片，`os.Args[0]` 是程序名 |
| `os.Getenv("PATH")` | 读环境变量 |
| `os.Exit(1)` | 退出程序（defer 不会执行） |
| `os.Mkdir("dir", 0755)` | 创建目录 |
| `os.Remove("file.txt")` | 删除文件 |
| `os.Stat("file.txt")` | 获取文件信息（常用来判断文件是否存在） |

> 怎么读：函数名就是动作本身——`ReadFile` 读作"读整个文件"，`WriteFile` 读作"写整个文件"，`Getenv` 读作"取环境变量"；`os.Args` 是命令行参数切片，第一个元素是程序名。

```go
data, err := os.ReadFile("config.txt")     // 读整个文件
fmt.Println(string(data))

err = os.WriteFile("out.txt", []byte("内容"), 0644)   // 写整个文件

// 判断文件是否存在的惯用写法
if _, err := os.Stat("config.txt"); os.IsNotExist(err) {
    fmt.Println("文件不存在")
}
```

> ⚠️ `os.Exit` 之后 defer 不会执行，不要把它放在有清理逻辑的函数里。

## 五、encoding/json：JSON 序列化

| 函数/标签 | 用途 |
|------|------|
| `json.Marshal(u)` | 结构体 → JSON（返回 `[]byte`） |
| `json.MarshalIndent(u, "", "  ")` | 带缩进的漂亮格式 |
| `json.Unmarshal(data, &u)` | JSON → 结构体（**必须传指针**） |
| tag `` `json:"name"` `` | 指定 JSON 字段名 |
| tag `` `json:"email,omitempty"` `` | 零值时省略该字段 |

> 怎么读：`Marshal` 读作"把结构体**打包**成 JSON"，`Unmarshal` 读作"把 JSON **拆包**装进结构体"——一对反方向的操作。Unmarshal 必须传指针：json 包要往你的变量里写数据，不传指针它改不到。

```go
type User struct {
    Name  string `json:"name"`             // 反引号里的是"标签"：指定 JSON 字段名
    Age   int    `json:"age"`
    Email string `json:"email,omitempty"`  // omitempty：零值时省略该字段
}

// 结构体 → JSON（Marshal）
u := User{Name: "张三", Age: 18}
data, err := json.Marshal(u)
fmt.Println(string(data))     // {"name":"张三","age":18}

// 带缩进的漂亮格式
pretty, _ := json.MarshalIndent(u, "", "  ")

// JSON → 结构体（Unmarshal，注意传指针！）
jsonStr := `{"name":"李四","age":25}`
var u2 User
err = json.Unmarshal([]byte(jsonStr), &u2)
fmt.Println(u2.Name)          // 李四
```

- ⚠️ **字段必须大写开头**才能被序列化（小写字段 json 包看不见，静默忽略）
- ⚠️ **Unmarshal 必须传指针** `&u2`，否则解析结果丢失

## 六、math/rand：随机数

| 函数 | 用途 |
|------|------|
| `rand.Intn(100)` | [0, 100) 的随机整数 |
| `rand.Float64()` | [0.0, 1.0) 的随机小数 |
| `rand.Shuffle(len(nums), swap)` | 随机打乱切片 |

> 怎么读：`rand.Intn(100)` 读作"随机取一个 0 到 99 的整数"——n 本身不包含在内。

```go
rand.Intn(100)        // [0, 100) 的随机整数
rand.Float64()        // [0.0, 1.0) 的随机小数

// 随机打乱切片
nums := []int{1, 2, 3, 4, 5}
rand.Shuffle(len(nums), func(i, j int) {
    nums[i], nums[j] = nums[j], nums[i]
})
```

- Go 1.20+ 不需要手动设置随机种子（老教程里的 `rand.Seed(...)` 已废弃）

## 七、bufio + os.Stdin：读取用户输入

写交互式命令行程序需要读取用户输入，标准做法分三步：

| 步骤 | 代码 | 说明 |
|------|------|------|
| 1. 创建读取器 | `reader := bufio.NewReader(os.Stdin)` | 包装标准输入 |
| 2. 读一行 | `name, _ := reader.ReadString('\n')` | 读到回车为止 |
| 3. 清理 | `name = strings.TrimSpace(name)` | 去掉末尾换行符 |

> 怎么读：`ReadString('\n')` 读作"一直读到换行符为止"——换行符本身也被读进来了，所以第三步要用 TrimSpace 清理。

```go
reader := bufio.NewReader(os.Stdin)

fmt.Print("请输入你的名字：")
name, _ := reader.ReadString('\n')      // 读到回车为止
name = strings.TrimSpace(name)          // 去掉末尾换行符

fmt.Println("你好，", name)
```

> 💡 简单场景也可以用 `fmt.Scanln(&name)`，但它遇到空格就断，`bufio.Reader` 更可靠。

## 八、net/http：几行代码起一个 Web 服务（预告）

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "Hello, Web!")
    })
    fmt.Println("服务启动：http://localhost:8080")
    http.ListenAndServe(":8080", nil)
}
```

> 怎么读：`HandleFunc(路径, 处理函数)` 读作"访问这个路径时，执行这个函数"；`ListenAndServe(":8080", nil)` 读作"在 8080 端口开始监听服务"。

运行后浏览器访问 `http://localhost:8080` 即可。Web 开发是学完本教程后的绝佳进阶方向。

## 怎么查标准库文档？

- 官方文档：<https://pkg.go.dev/std>（每个函数都有可运行的示例）
- VS Code 里把鼠标悬停在函数上就能看文档
- 记不住 API 完全正常，**知道去哪查**才是本事

---

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| JSON 序列化结果里字段**静默消失**，不报任何错 | 字段名小写开头，json 包无法访问未导出字段 | 字段名首字母必须大写 |
| Unmarshal "成功"，结构体却还是零值 | 第二个参数没传指针，解析结果没有写入 | 参数写 `&u2` |
| `Format` 原样输出 `yyyy-MM-dd` 这串字符 | Go 的格式化模板是参考时间，不认识 yyyy | 模板只能是 `2006-01-02 15:04:05` |

---

## 练习

1. 写程序统计一句英文句子中每个单词的出现次数，按字母序输出（综合 strings + map + 排序）。
2. 写程序把一个 `[]User` 序列化成 JSON 写入 `users.json` 文件，再读出来反序列化并打印（json + os）。
3. 写交互程序：提示用户输入生日（如 2000-01-01），计算并输出已经活了多少天（bufio + time）。

<details>
<summary>点击查看答案（要点）</summary>

**1. 词频统计**：`words := strings.Fields(s)` 按空白拆词（比 Split 稳，连续空格也能正确处理）→ `for _, w := range words { counts[w]++ }`（map 取不存在的 key 得零值，直接 `++` 即可）→ 排序输出：

```go
keys := make([]string, 0, len(counts))
for k := range counts {
    keys = append(keys, k)
}
slices.Sort(keys)           // 需要 import "slices"（Go 1.21+）
for _, k := range keys {
    fmt.Println(k, counts[k])
}
```

**2. JSON 落盘再读回**：`data, _ := json.MarshalIndent(users, "", "  ")` 带缩进序列化 → `os.WriteFile("users.json", data, 0644)` 写入 → `raw, err := os.ReadFile("users.json")` 读回 → `json.Unmarshal(raw, &got)` 反序列化（**第二个参数必须传指针 `&got`**）→ 打印验证和原来一致。

**3. 活了多少天**：`birth, err := time.Parse("2006-01-02", input)` 解析生日 → 生日在过去，`time.Until(birth)` 算出来是**负数**，记得取负：

```go
days := int(-time.Until(birth).Hours() / 24)
fmt.Printf("已经活了 %d 天\n", days)
```

（`time.Since(birth)` 等价于 `-time.Until(birth)`，用哪个都行。注意处理 Parse 的 err——用户输入"2000/01/01"会解析失败。）

</details>

## 本节小结

- 日常 Top5：`strings` 拆拼替换、`strconv` 数字字符串互转、`time` 时间、`os` 文件、`encoding/json` 序列化——记不住 API 正常，知道有它、会查文档就是本事
- JSON 三步走：结构体打 tag → `Marshal` 出去 → `Unmarshal`（传指针）回来
- 时间格式化用参考时间 `2006-01-02 15:04:05`，不是 yyyy-MM-dd

下一节，把所学全部串起来：[6.4 实战项目：命令行待办清单](04-project-todo-cli.md)
