# 04 实战项目：命令行待办清单

> 毕业项目！从零完成一个真正能用的命令行 TODO 工具，综合运用整个教程的知识：结构体、切片、方法、错误处理、包拆分、JSON 持久化、单元测试。

## 一、项目目标

做一个叫 `todo` 的命令行工具：

```bash
go run . add "学完 Go 教程"        # 添加任务
go run . add "写一个自己的项目"
go run . list                      # 查看任务列表
go run . done 1                    # 完成 1 号任务
go run . remove 2                  # 删除 2 号任务
```

`list` 的效果：

```
待办清单：
  [✓] 1. 学完 Go 教程
  [ ] 2. 写一个自己的项目
```

任务保存在 `todos.json` 文件里，程序重启数据不丢。

## 二、项目结构

```
todo/
├── go.mod
├── main.go            入口：解析命令行参数
├── task/
│   ├── task.go        核心逻辑：任务的增删改查 + 存取
│   └── task_test.go   单元测试
└── todos.json         数据文件（程序自动生成）
```

开局三连：

```bash
mkdir todo && cd todo
go mod init todo
mkdir task
```

## 三、核心逻辑：task 包

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
        fmt.Println("清单是空的，用 add 添加一条吧！")
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

留意这里用到的知识点：结构体与 JSON 标签、指针接收者方法、切片删除元素、`%w` 包装错误、"文件不存在不算错"的边界处理。

## 四、程序入口：main.go

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

留意：`main` 只负责调用 `run()` 并处理最终错误——这样所有业务逻辑都能用 `return err` 优雅地传递错误，是 Go CLI 程序的经典写法。

## 五、跑起来！

```bash
go run . add "学完 Go 教程"
go run . add "写一个自己的项目"
go run . list
go run . done 1
go run . list
```

打开 `todos.json` 看看数据长什么样：

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

## 六、补上单元测试

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

全绿！这就是一个有测试保障的完整小项目了。

## 七、进阶挑战（选做）

按难度递增，每完成一个都是实打实的成长：

1. **加时间字段**：任务记录创建时间，list 时显示（time 包 + 修改 JSON 结构）
2. **clear 命令**：一键删除所有已完成的任务
3. **优先级**：add 时支持 `-p high`，list 按优先级排序（`os.Args` 解析或学习标准库 `flag` 包）
4. **彩色输出**：用 `github.com/fatih/color` 给已完成任务显示绿色（练习引入第三方依赖）
5. **并发场景**：假设多个程序同时读写 todos.json 会怎样？（思考题，引出文件锁的概念）

## 八、毕业寄语 🎓

走到这里，你已经掌握了：

- ✅ Go 的全部核心语法：变量、流程控制、函数
- ✅ 四大数据结构：切片、map、结构体、指针
- ✅ Go 的编程范式：方法、接口、错误处理、泛型
- ✅ Go 的看家本领：goroutine、channel、并发安全
- ✅ 工程能力：分包、测试、标准库、完整项目

**接下来的路：**

1. **多写**：把你日常的重复劳动写成 Go 小工具，实践是最快的成长
2. **Web 方向**：学 `net/http` 标准库，然后了解 Gin 等 Web 框架，做一个 REST API
3. **读好代码**：Go 标准库源码可读性极高，`strings`、`errors` 包都值得读
4. **进阶书目**：《The Go Programming Language》（Go 圣经）、官方博客 go.dev/blog

编程学习没有终点，但你已经度过了最难的"从 0 到 1"。

**Happy Coding, Gopher! 🐹**

---

[返回教程目录](../README.md)
