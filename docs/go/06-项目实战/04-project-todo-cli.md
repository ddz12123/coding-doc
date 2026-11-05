# 6.4 实战项目：命令行待办清单

> 本节目标：从零完成一个真正能用的命令行 TODO 工具，综合运用整个教程的知识：结构体、切片、方法、错误处理、包拆分、JSON 持久化、单元测试。

## 一、项目目标

**目标**：做一个叫 `todo` 的命令行工具，支持添加、查看、完成、删除任务。

| 命令 | 作用 |
|------|------|
| `go run . add "学完 Go 教程"` | 添加任务 |
| `go run . list` | 查看任务列表 |
| `go run . done 1` | 完成 1 号任务 |
| `go run . remove 2` | 删除 2 号任务 |

`list` 的效果：

```
待办清单：
  [✓] 1. 学完 Go 教程
  [ ] 2. 写一个自己的项目
```

**说明**：

- 任务保存在 `todos.json` 文件里，程序重启数据不丢

## 二、项目结构

**目标**：按包拆分——入口只做参数解析，核心逻辑独立成包，便于单元测试。

```
todo/
├── go.mod
├── main.go            入口：解析命令行参数
├── task/
│   ├── task.go        核心逻辑：任务的增删改查 + 存取
│   └── task_test.go   单元测试
└── todos.json         数据文件（程序自动生成）
```

初始化项目：

```bash
mkdir todo && cd todo
go mod init todo
mkdir task
```

`go mod init todo` 怎么读：把当前目录初始化成名叫 todo 的模块，生成 go.mod（6.1 讲过这套命令）。

## 三、核心逻辑：task 包

**目标**：实现任务的增删改查与 JSON 存取，全部收在 `task` 包里。

创建 `task/task.go`：

```go
// Package task 实现待办任务的管理与持久化。
package task

import (
    "encoding/json"
    "fmt"
    "os"
)

// Task 一条待办任务
type Task struct {
    ID    int    `json:"id"`
    Title string `json:"title"`
    Done  bool   `json:"done"`
}

// List 任务清单，管理一组任务
type List struct {
    Tasks []Task `json:"tasks"`
}

// Add 添加新任务，自动分配 ID
func (l *List) Add(title string) {
    maxID := 0
    for _, t := range l.Tasks {
        if t.ID > maxID {
            maxID = t.ID
        }
    }
    l.Tasks = append(l.Tasks, Task{
        ID:    maxID + 1,
        Title: title,
    })
}

// Done 把指定 ID 的任务标记为完成
func (l *List) Done(id int) error {
    for i := range l.Tasks {
        if l.Tasks[i].ID == id {
            l.Tasks[i].Done = true      // 注意：用下标修改原数据
            return nil
        }
    }
    return fmt.Errorf("找不到编号为 %d 的任务", id)
}

// Remove 删除指定 ID 的任务
func (l *List) Remove(id int) error {
    for i := range l.Tasks {
        if l.Tasks[i].ID == id {
            l.Tasks = append(l.Tasks[:i], l.Tasks[i+1:]...)   // 切片删除元素
            return nil
        }
    }
    return fmt.Errorf("找不到编号为 %d 的任务", id)
}

// Print 打印任务清单
func (l *List) Print() {
    if len(l.Tasks) == 0 {
        fmt.Println("清单是空的，用 add 添加一条任务")
        return
    }
    fmt.Println("待办清单：")
    for _, t := range l.Tasks {
        mark := " "
        if t.Done {
            mark = "✓"
        }
        fmt.Printf("  [%s] %d. %s\n", mark, t.ID, t.Title)
    }
}

// Load 从 JSON 文件读取清单；文件不存在时返回空清单（不算错误）
func Load(filename string) (*List, error) {
    data, err := os.ReadFile(filename)
    if err != nil {
        if os.IsNotExist(err) {
            return &List{}, nil        // 第一次使用，还没有数据文件
        }
        return nil, fmt.Errorf("读取数据文件失败: %w", err)
    }

    var l List
    if err := json.Unmarshal(data, &l); err != nil {
        return nil, fmt.Errorf("解析数据文件失败: %w", err)
    }
    return &l, nil
}

// Save 把清单写入 JSON 文件
func (l *List) Save(filename string) error {
    data, err := json.MarshalIndent(l, "", "  ")
    if err != nil {
        return fmt.Errorf("序列化失败: %w", err)
    }
    if err := os.WriteFile(filename, data, 0644); err != nil {
        return fmt.Errorf("写入数据文件失败: %w", err)
    }
    return nil
}
```

**两处值得停一秒的地方**：

```
func (l *List) Add(title string) {
      ↑
      指针接收者 —— 方法要修改 l 本身（往 Tasks 里追加数据），必须用 *List
```

读作：给 List 类型挂一个 Add 方法；接收者用指针，改的才是原数据，值接收者改的只是副本。

另一个是 `Load` 的边界设计：文件不存在**不算错误**，返回空清单——第一次使用还没有数据文件，这是刻意安排，第六节的测试会把它钉死。

**方法一览**：

| 方法 | 作用 |
|------|------|
| `Add(title)` | 添加新任务，ID 取现有最大值 +1 |
| `Done(id)` | 把指定 ID 的任务标记完成（用下标修改原数据） |
| `Remove(id)` | 删除指定 ID 的任务（`append(l.Tasks[:i], l.Tasks[i+1:]...)` 切片删除元素） |
| `Print()` | 打印任务清单 |
| `Load(filename)` | 从 JSON 读清单；文件不存在返回空清单，不算错误 |
| `Save(filename)` | 清单序列化后写入 JSON 文件 |

- 用到的知识点：结构体与 JSON 标签、指针接收者方法、切片删除元素、`%w` 包装错误、"文件不存在不算错"的边界处理

## 四、程序入口：main.go

**目标**：解析命令行参数，分发到 task 包；错误统一出口，修改类操作统一保存。

```go
package main

import (
    "fmt"
    "os"
    "strconv"

    "todo/task"
)

const dataFile = "todos.json"

func main() {
    if err := run(); err != nil {
        fmt.Fprintln(os.Stderr, "错误：", err)   // 错误信息输出到标准错误流
        os.Exit(1)
    }
}

func run() error {
    if len(os.Args) < 2 {
        printUsage()
        return nil
    }

    list, err := task.Load(dataFile)
    if err != nil {
        return err
    }

    command := os.Args[1]

    switch command {
    case "list":
        list.Print()
        return nil                      // 只读操作，不用保存

    case "add":
        if len(os.Args) < 3 {
            return fmt.Errorf("用法：add 任务内容")
        }
        list.Add(os.Args[2])
        fmt.Println("已添加：", os.Args[2])

    case "done", "remove":
        if len(os.Args) < 3 {
            return fmt.Errorf("用法：%s 任务编号", command)
        }
        id, err := strconv.Atoi(os.Args[2])
        if err != nil {
            return fmt.Errorf("任务编号必须是数字，收到的是 %q", os.Args[2])
        }
        if command == "done" {
            err = list.Done(id)
        } else {
            err = list.Remove(id)
        }
        if err != nil {
            return err
        }
        fmt.Printf("已%s任务 %d\n", map[string]string{"done": "完成", "remove": "删除"}[command], id)

    default:
        printUsage()
        return fmt.Errorf("未知命令 %q", command)
    }

    return list.Save(dataFile)          // 修改类操作统一在这里保存
}

func printUsage() {
    fmt.Println(`用法：
  todo add "任务内容"    添加任务
  todo list             查看清单
  todo done 编号         完成任务
  todo remove 编号       删除任务`)
}
```

**关键结构 1：run() 的统一错误出口。** main 里没有业务逻辑，只干一件事——把 run() 传回来的错误打印并退出：

```
if err := run(); err != nil {
   ↑      ↑      ↑
  接收 run() 返回的错误 —— main 只干这一件事
          真正的程序逻辑，全部写在这个函数里
                  出了错：打印到标准错误流，退出码设为 1
```

读作：运行 run()，任何一步出错都顺着 `return err` 一路传回 main，在这里统一处理。为什么抽成 run()？如果逻辑全写在 main 里，每处出错都得重复"打印 + 退出"；有了这条错误通道，每个环节只管 `return err`，出口只有一个——这是 Go CLI 程序的经典写法。

**关键结构 2：switch 分发命令。**

```
switch command {
case "list":           ← 只读操作：打印完直接 return nil，不保存
case "add":            ← 修改操作：改完落到函数末尾，统一 Save
case "done", "remove": ← 修改操作：编号先转数字，再执行
default:               ← 未知命令：打印用法，返回错误
}
```

读作：按第一个命令行参数走不同分支；只读分支不落盘，修改分支最后统一执行 `list.Save(dataFile)`，不会漏存。

**说明**：

- 错误信息写到标准错误流 `os.Stderr`，退出码设为 1
- `list` 是只读操作，不用保存；`add`/`done`/`remove` 统一在 `run()` 末尾 `Save`

## 五、运行与编译

**目标**：跑通完整流程，并编译成独立的命令行工具。

```bash
go run . add "学完 Go 教程"
go run . add "写一个自己的项目"
go run . list
go run . done 1
go run . list
```

`todos.json` 的内容：

```json
{
  "tasks": [
    { "id": 1, "title": "学完 Go 教程", "done": true },
    { "id": 2, "title": "写一个自己的项目", "done": false }
  ]
}
```

编译成真正的命令行工具：

```bash
go build -o todo.exe        # Windows；macOS/Linux 去掉 .exe
.\todo.exe list
```

**说明**：

- `go build -o` 产出的可执行文件可以直接分发使用

## 六、补上单元测试

**目标**：为 task 包补齐测试，覆盖添加与完成、删除、存取回环、文件不存在四种情况。

创建 `task/task_test.go`：

```go
package task

import "testing"

func TestAddAndDone(t *testing.T) {
    l := &List{}

    l.Add("任务一")
    l.Add("任务二")

    if len(l.Tasks) != 2 {
        t.Fatalf("期望 2 条任务，实际 %d 条", len(l.Tasks))
    }
    if l.Tasks[1].ID != 2 {
        t.Errorf("第二条任务 ID 应为 2，实际 %d", l.Tasks[1].ID)
    }

    if err := l.Done(1); err != nil {
        t.Fatalf("完成任务 1 失败：%v", err)
    }
    if !l.Tasks[0].Done {
        t.Error("任务 1 应已完成")
    }

    if err := l.Done(999); err == nil {
        t.Error("完成不存在的任务应该报错，却没有")
    }
}

func TestRemove(t *testing.T) {
    l := &List{}
    l.Add("A")
    l.Add("B")
    l.Add("C")

    if err := l.Remove(2); err != nil {
        t.Fatalf("删除失败：%v", err)
    }
    if len(l.Tasks) != 2 {
        t.Fatalf("期望剩 2 条，实际 %d 条", len(l.Tasks))
    }
    for _, task := range l.Tasks {
        if task.Title == "B" {
            t.Error("任务 B 应已被删除")
        }
    }
}

func TestSaveAndLoad(t *testing.T) {
    file := t.TempDir() + "/test.json"   // t.TempDir()：测试专用临时目录，自动清理

    l := &List{}
    l.Add("持久化测试")
    if err := l.Save(file); err != nil {
        t.Fatalf("保存失败：%v", err)
    }

    loaded, err := Load(file)
    if err != nil {
        t.Fatalf("加载失败：%v", err)
    }
    if len(loaded.Tasks) != 1 || loaded.Tasks[0].Title != "持久化测试" {
        t.Errorf("加载的数据不对：%+v", loaded.Tasks)
    }
}

func TestLoadMissingFile(t *testing.T) {
    l, err := Load(t.TempDir() + "/不存在.json")
    if err != nil {
        t.Fatalf("文件不存在应返回空清单而非错误，却得到：%v", err)
    }
    if len(l.Tasks) != 0 {
        t.Errorf("应为空清单，实际有 %d 条", len(l.Tasks))
    }
}
```

运行：

```bash
go test ./...
```

**说明**：

- `t.TempDir()` 提供测试专用临时目录，测试结束自动清理，不污染真实数据文件
- `TestLoadMissingFile` 把"文件不存在返回空清单"这一边界约定用测试钉死
- 全部通过后，这就是一个有测试保障的完整小项目

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `go run todo.go` 报错找不到其他文件 | 项目有多个文件和子包，`go run` 指定单文件只编译它 | 在项目根目录用 `go run .` |
| `add` 成功了，`list` 里却没有 | 修改后没走到 `Save`（中途 `return` 跳过） | 修改类操作统一在 `run()` 末尾保存，本项目已这样设计 |
| `done 2` 完成的不是想要的 | 列表里显示的是 ID，删除后不重排，ID 不等于"第几行" | 以 `list` 输出的 ID 为准 |
| 报 `任务编号必须是数字，收到的是 "1 "` | 参数带了多余空格，`os.Args` 原样传入 | 输入时检查；也可在解析前 `strings.TrimSpace` |
| 参数带空格被拆成多个 | `todo add 学 Go 教程` 没加引号 | 给含空格的参数加引号：`todo add "学 Go 教程"` |
| 测试跑完，真实的 todos.json 被改了 | 测试直接读写真实数据文件 | 用 `t.TempDir()` 隔离测试数据 |

## 七、进阶挑战（选做）

**目标**：在现有项目上继续练习，按难度递增：

1. **加时间字段**：任务记录创建时间，list 时显示（time 包 + 修改 JSON 结构）
2. **clear 命令**：一键删除所有已完成的任务
3. **优先级**：add 时支持 `-p high`，list 按优先级排序（`os.Args` 解析或学习标准库 `flag` 包）
4. **彩色输出**：用 `github.com/fatih/color` 给已完成任务显示绿色（练习引入第三方依赖）
5. **并发场景**：假设多个程序同时读写 todos.json 会怎样？（思考题，引出文件锁的概念）

## 八、毕业寄语 🎓

**本教程已覆盖：**

- Go 的全部核心语法：变量、流程控制、函数
- 四大数据结构：切片、map、结构体、指针
- Go 的编程范式：方法、接口、错误处理、泛型
- Go 的看家本领：goroutine、channel、并发安全
- 工程能力：分包、测试、标准库、完整项目

**接下来的路：**

- **多写**：把日常的重复劳动写成 Go 小工具，实践是最快的成长
- **Web 方向**：学 `net/http` 标准库，再了解 Gin 等框架，做一个 REST API
- **读好代码**：Go 标准库源码可读性极高，`strings`、`errors` 包值得读
- **进阶书目**：《The Go Programming Language》（Go 圣经）、官方博客 go.dev/blog

编程学习没有终点，但你已经度过了最难的"从 0 到 1"。

**Happy Coding, Gopher! 🐹**

---

[返回教程目录](../README.md)
