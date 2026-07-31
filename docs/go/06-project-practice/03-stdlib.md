# 03 常用标准库速览

> 本节目标：认识日常开发最高频的几个标准库。不用背，知道"有这个东西、大概怎么用"，需要时回来查。

Go 标准库以"开箱即用"著称，很多其他语言要装第三方库的功能，Go 标准库直接提供。

## 一、strings：字符串操作

```go
import "strings"

s := "Hello, Go World"

strings.Contains(s, "Go")          // true   是否包含
strings.HasPrefix(s, "Hello")      // true   前缀
strings.HasSuffix(s, "World")      // true   后缀
strings.Index(s, "Go")             // 7      首次出现位置（没有返回 -1）
strings.ToUpper(s)                 // "HELLO, GO WORLD"
strings.ToLower(s)                 // "hello, go world"
strings.Replace(s, "o", "0", 1)    // 替换 1 次；-1 表示全部替换
strings.ReplaceAll(s, "o", "0")    // 全部替换
strings.TrimSpace("  abc  ")       // "abc"  去首尾空白
strings.Split("a,b,c", ",")        // ["a" "b" "c"]
strings.Join([]string{"a","b"}, "-") // "a-b"
strings.Fields("a b  c")           // ["a" "b" "c"] 按空白拆分
strings.Repeat("ab", 3)            // "ababab"
```

高效拼接大量字符串用 `strings.Builder`（`+` 拼接每次都产生新字符串）：

```go
var b strings.Builder
for i := 0; i < 100; i++ {
    b.WriteString("x")
}
result := b.String()
```

## 二、strconv：字符串 ↔ 数字

```go
import "strconv"

n, err := strconv.Atoi("42")            // 字符串 → int
s := strconv.Itoa(42)                   // int → 字符串
f, err := strconv.ParseFloat("3.14", 64) // 字符串 → float64
b, err := strconv.ParseBool("true")     // 字符串 → bool
```

## 三、time：时间处理

```go
import "time"

now := time.Now()                       // 当前时间
fmt.Println(now.Year(), now.Month(), now.Day())

// 格式化：Go 不用 yyyy-MM-dd，而是用"参考时间"2006-01-02 15:04:05！
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

> **Go 最著名的怪癖**：格式化模板必须用 `2006-01-02 15:04:05` 这个特定时间（美式顺序 1月2日3点4分5秒06年，方便记忆：1,2,3,4,5,6）。写成别的年份是不行的！

## 四、os：文件与系统交互

```go
import "os"

// 读整个文件（小文件最方便的方式）
data, err := os.ReadFile("config.txt")     // 返回 []byte
fmt.Println(string(data))

// 写整个文件（0644 是文件权限，照抄即可）
err = os.WriteFile("out.txt", []byte("内容"), 0644)

// 其他常用
os.Args                    // 命令行参数切片，os.Args[0] 是程序名
os.Getenv("PATH")          // 读环境变量
os.Exit(1)                 // 退出程序（注意：defer 不会执行）
os.Mkdir("dir", 0755)      // 创建目录
os.Remove("file.txt")      // 删除
os.Stat("file.txt")        // 获取文件信息（常用来判断文件是否存在）
```

判断文件是否存在的惯用写法：

```go
if _, err := os.Stat("config.txt"); os.IsNotExist(err) {
    fmt.Println("文件不存在")
}
```

## 五、encoding/json：JSON 序列化

前后端交互、配置文件、API 调用都离不开 JSON：

```go
import "encoding/json"

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

**两个必踩的坑**：

1. **字段必须大写开头**才能被序列化（小写字段 json 包看不见，静默忽略！）
2. **Unmarshal 必须传指针** `&u2`，否则解析结果丢失

## 六、math/rand：随机数

```go
import "math/rand"

rand.Intn(100)        // [0, 100) 的随机整数
rand.Float64()        // [0.0, 1.0) 的随机小数

// 随机打乱切片
nums := []int{1, 2, 3, 4, 5}
rand.Shuffle(len(nums), func(i, j int) {
    nums[i], nums[j] = nums[j], nums[i]
})
```

> Go 1.20+ 不需要再手动设置随机种子（老教程里的 `rand.Seed(...)` 已废弃）。

## 七、bufio + os.Stdin：读取用户输入

写交互式命令行程序需要：

```go
import (
    "bufio"
    "fmt"
    "os"
    "strings"
)

func main() {
    reader := bufio.NewReader(os.Stdin)

    fmt.Print("请输入你的名字：")
    name, _ := reader.ReadString('\n')      // 读到回车为止
    name = strings.TrimSpace(name)          // 去掉末尾换行符！

    fmt.Println("你好，", name)
}
```

> 简单场景也可以用 `fmt.Scanln(&name)`，但它遇到空格就断了，`bufio.Reader` 更可靠。

## 八、net/http：几行代码起一个 Web 服务（预告）

感受一下 Go 写 Web 有多简单：

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

运行后浏览器访问 `http://localhost:8080` 即可。Web 开发是学完本教程后的绝佳进阶方向。

---

## 怎么查标准库文档？

- 官方文档：<https://pkg.go.dev/std>（每个函数都有可运行的示例）
- VS Code 里把鼠标悬停在函数上就能看文档
- 记不住 API 完全正常，**知道去哪查**才是本事

---

## 练习

1. 写程序统计一句英文句子中每个单词的出现次数，按字母序输出（综合 strings + map + 排序）。
2. 写程序把一个 `[]User` 序列化成 JSON 写入 `users.json` 文件，再读出来反序列化并打印（json + os）。
3. 写交互程序：提示用户输入生日（如 2000-01-01），计算并输出已经活了多少天（bufio + time）。

下一节，把所学全部串起来：[04 实战项目：命令行待办清单](04-project-todo-cli.md)
