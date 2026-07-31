# Go 语言新手入门教程

> 一份写给**第一次接触 Go 语言**的新手的完整教程。不需要你有任何 Go 基础，只要会用电脑、了解一点点编程的基本概念（比如什么是变量）就可以开始。

## 这份教程适合谁？

- 完全没学过 Go，想从零开始的人
- 学过其他语言（如 Python、Java、JavaScript），想快速上手 Go 的人
- 看过一些零散资料，想系统性过一遍基础的人

## 怎么使用这份教程？

1. **按顺序读**：章节是精心编排的，后面的内容依赖前面的知识。
2. **动手敲代码**：每一段示例代码都建议你亲手敲一遍、跑一遍。看会了不等于会了。
3. **做练习题**：每篇文末都有练习，做完再看下一篇。
4. **遇到报错不要慌**：报错信息是你最好的老师，教程中专门整理了新手常见错误。

## 目录

### 第一章：入门准备（01-getting-started）

| 文件 | 内容 |
|------|------|
| [01 认识 Go 语言](01-getting-started/01-what-is-go.md) | Go 是什么、为什么学 Go、Go 能做什么 |
| [02 安装 Go 开发环境](01-getting-started/02-install.md) | Windows / macOS / Linux 安装、配置编辑器 |
| [03 第一个程序 Hello World](01-getting-started/03-hello-world.md) | 写出并运行你的第一个 Go 程序、逐行解释 |
| [04 Go 命令与模块初识](01-getting-started/04-go-toolchain.md) | go run / build / mod 等常用命令 |

### 第二章：基础语法（02-basics）

| 文件 | 内容 |
|------|------|
| [01 变量与常量](02-basics/01-variables-constants.md) | 变量声明的几种方式、常量、iota |
| [02 基本数据类型](02-basics/02-data-types.md) | 整数、浮点数、布尔、字符串、类型转换 |
| [03 运算符](02-basics/03-operators.md) | 算术、比较、逻辑运算符 |
| [04 流程控制](02-basics/04-flow-control.md) | if / for / switch，Go 只有一种循环 |
| [05 函数](02-basics/05-functions.md) | 函数定义、多返回值、defer |

### 第三章：复合数据类型（03-composite-types）

| 文件 | 内容 |
|------|------|
| [01 数组与切片](03-composite-types/01-arrays-slices.md) | 数组、切片（最常用的数据结构）、append |
| [02 map 映射](03-composite-types/02-maps.md) | 键值对、增删改查、遍历 |
| [03 结构体](03-composite-types/03-structs.md) | 自定义类型、字段、嵌套 |
| [04 指针](03-composite-types/04-pointers.md) | 新手也能懂的指针讲解 |

### 第四章：方法、接口与错误处理（04-methods-interfaces）

| 文件 | 内容 |
|------|------|
| [01 方法](04-methods-interfaces/01-methods.md) | 给类型绑定行为、值接收者与指针接收者 |
| [02 接口](04-methods-interfaces/02-interfaces.md) | Go 最有特色的设计、鸭子类型 |
| [03 错误处理](04-methods-interfaces/03-error-handling.md) | error、errors 包、panic 与 recover |
| [04 泛型入门](04-methods-interfaces/04-generics.md) | Go 1.18+ 的泛型基础 |

### 第五章：并发编程（05-concurrency）

| 文件 | 内容 |
|------|------|
| [01 goroutine](05-concurrency/01-goroutines.md) | 轻量级并发、Go 的招牌能力 |
| [02 channel 通道](05-concurrency/02-channels.md) | goroutine 之间的通信 |
| [03 sync 与并发安全](05-concurrency/03-sync.md) | WaitGroup、Mutex、常见并发陷阱 |

### 第六章：工程实践（06-project-practice）

| 文件 | 内容 |
|------|------|
| [01 包与模块管理](06-project-practice/01-packages-modules.md) | 多文件多包组织代码、go mod 详解 |
| [02 单元测试](06-project-practice/02-testing.md) | go test、表驱动测试 |
| [03 常用标准库速览](06-project-practice/03-stdlib.md) | fmt / strings / strconv / time / os / json |
| [04 实战项目：命令行待办清单](06-project-practice/04-project-todo-cli.md) | 综合运用所学，完成一个真实小项目 |

## 学习路线建议

```
第一章（半天）→ 第二章（1~2 天）→ 第三章（1~2 天）
      → 第四章（2 天）→ 第五章（2 天）→ 第六章（2~3 天）
```

零基础大约 **10~14 天**可以完整学完；有其他语言经验的话 **一周左右**足够。

## 学完之后去哪里？

- 官方教程 [A Tour of Go](https://go.dev/tour/)（可作复习）
- 官方文档 [go.dev/doc](https://go.dev/doc/)
- [Go by Example](https://gobyexample.com/)（大量小示例）
- 开始写你自己的项目 —— 这是最有效的学习方式

祝学习顺利！Let's Go! 🚀
