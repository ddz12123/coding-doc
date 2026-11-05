# 7.1 认识 GORM：让 Go 读写数据库

> 本节目标：理解 ORM 是什么，学会安装 GORM、连接 MySQL、定义数据模型并自动建表。

## 一、为什么需要 GORM？

上一章的待办清单，数据存在 `todos.json` 文件里。自己玩没问题，放到真实业务里立刻露馅：

- 数据量一大，每次都要整个文件读进来再写回去，越来越慢
- 多个人同时用，互相覆盖
- 想"查最近 10 条已完成任务"？只能手动遍历

这些正是数据库（MySQL）的拿手好戏。但直接写 SQL 也麻烦：结果要手动扫进结构体、拼字符串容易出 SQL 注入漏洞……

**ORM（对象关系映射）** 就是为解决这些而生的：**用操作 Go 结构体的方式操作数据库表**，SQL 由框架自动生成。

| 你写的 Go 代码 | GORM 生成的 SQL |
|------|------|
| `DB.Create(&user)` | `INSERT INTO users (…) VALUES (…)` |
| `DB.First(&user, 10)` | `SELECT * FROM users WHERE id = 10 LIMIT 1` |

**GORM** 是 Go 生态最流行的 ORM，中文文档齐全：<https://gorm.io/zh_CN/docs/>。

## 二、安装与连接 MySQL

需要装两个包：GORM 本体 + MySQL 驱动。

```bash
go get gorm.io/gorm
go get gorm.io/driver/mysql
```

习惯上把数据库初始化单独放一个包（`db/db.go`），暴露一个全局 `DB`：

```go
// db/db.go
package db

import (
    "gorm.io/driver/mysql"
    "gorm.io/gorm"
)

var DB *gorm.DB // 全局句柄，全项目共用

func Init() error {
    dsn := "root:123456@tcp(127.0.0.1:3306)/gotest?charset=utf8mb4&parseTime=True&loc=Local"
    db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
    if err != nil {
        return err
    }
    DB = db
    return nil
}
```

DSN（数据源名称）里每一段都有含义：

| 片段 | 含义 |
|------|------|
| `root:123456` | 用户名:密码 |
| `tcp(127.0.0.1:3306)` | MySQL 的地址和端口 |
| `/gotest` | 要连的库名，**得先在 MySQL 里建好**：`CREATE DATABASE gotest` |
| `charset=utf8mb4` | 字符集，想存 emoji 必须用 utf8mb4 |
| `parseTime=True` | 把数据库的时间值自动转成 Go 的 `time.Time`，**有时间字段必须加** |
| `loc=Local` | 时间按本地时区解析 |

在 `main.go` 里接线：

```go
// main.go
package main

import (
    "fmt"
    "log"

    "myapp/db"
)

func main() {
    if err := db.Init(); err != nil {
        log.Fatal("数据库连接失败：", err)
    }
    fmt.Println("数据库连接成功")
}
```

`gorm.Open` 会真的去 ping 一次数据库，连不上当场报错——这比"程序跑了一半才发现库没通"好排查得多。

## 三、定义模型

一个 struct 对应一张表。我们后面整章都用这两个模型：

```go
// model/user.go
package model

import (
    "time"

    "gorm.io/gorm"
)

type User struct {
    ID        uint           `gorm:"primaryKey" json:"id"`
    Username  string         `gorm:"size:64;uniqueIndex" json:"username"` // varchar(64)，唯一索引
    Password  string         `json:"-"`
    Nickname  string         `gorm:"size:64" json:"nickname"`
    Status    int            `json:"status"`
    CreatedAt time.Time      `json:"createdAt"`
    UpdatedAt time.Time      `json:"updatedAt"`
    DeletedAt gorm.DeletedAt `gorm:"index" json:"-"` // 有它就启用软删除（7.5 讲）
}
```

```go
// model/role.go
package model

type Role struct {
    ID          uint   `gorm:"primaryKey" json:"id"`
    Name        string `gorm:"size:64;uniqueIndex" json:"name"`
    Description string `gorm:"size:255" json:"description"`
    Sort        int    `json:"sort"`
}
```

常用的字段标签（`gorm:"…"` 里可以写多个，分号隔开）：

| 标签 | 作用 |
|------|------|
| `primaryKey` | 设为主键 |
| `size:64` | 字符串长度（MySQL 里生成 varchar(64)） |
| `uniqueIndex` | 唯一索引 |
| `index` | 普通索引 |
| `column:user_name` | 指定列名 |
| `default:1` | 数据库默认值 |
| `-` | 让 GORM 忽略这个字段 |

> **`json` tag 和 `gorm` tag 是两回事**：`json:"-"` 只影响序列化（API 不输出密码），GORM 照样读写它；想让 GORM 忽略字段要写 `gorm:"-"`。

## 四、结构体到表的映射规则

不写 tag 时，GORM 按固定规则起名字：

| 结构体 | 表/列 | 规则 |
|------|------|------|
| `type User struct` | `users` | 表名 = 结构体名的蛇形**复数** |
| `type UserRole struct` | `user_roles` | 驼峰拆词 + 下划线 |
| `ID` 字段 | `id` | 名叫 `ID` 自动当主键 |
| `CreatedAt` | `created_at` | 特殊名字：插入时自动填当前时间 |
| `UpdatedAt` | `updated_at` | 特殊名字：插入/更新时自动刷新 |
| `DeletedAt gorm.DeletedAt` | `deleted_at` | 特殊名字：有它就启用软删除 |
| `Nickname` | `nickname` | 驼峰 → 蛇形 |

想改表名或列名：

```go
func (User) TableName() string { return "t_users" } // 改表名

type User struct {
    Name string `gorm:"column:user_name"` // 改列名
}
```

## 五、自动建表：AutoMigrate

不用手写 `CREATE TABLE`，一行搞定：

```go
db.DB.AutoMigrate(&model.User{}, &model.Role{})
```

- 按 struct 定义建表、补列、补索引
- **只增不改不删**：新增字段会加列；删掉字段或改类型不会动已有的列（安全，但也意味着改类型要手动处理）
- 幂等：跑多少遍都一样，项目启动时调一次即可

```go
DB.Migrator().HasTable("users") // 检查表是否存在
```

## 六、链式调用：GORM 的读写姿势

GORM 的所有操作都是**链式调用**，方法分两类：

| 类别 | 方法 | 作用 |
|------|------|------|
| 条件方法（可叠加） | `Where`、`Select`、`Order`、`Limit`、`Joins`、`Preload`… | 只"登记"条件，不执行 SQL |
| 终结方法（触发执行） | `Find`、`First`、`Create`、`Update`、`Delete`、`Count`… | 真正生成并执行 SQL |

```go
// 条件一路叠加，最后由 Find 执行
DB.Where("status = ?", 1).Order("id DESC").Limit(10).Find(&users)
// SELECT * FROM users WHERE status = 1 ORDER BY id DESC LIMIT 10
```

每个条件方法都返回 `*gorm.DB`，所以能一直点下去；执行后的 `.Error` 是错误信息，`.RowsAffected` 是影响行数。**这个"返回 `*gorm.DB`"的设计是整章的地基**，后面每节都会见到。

---

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| 读时间字段报 `unsupported Scan` 之类错误 | DSN 忘了 `parseTime=True` | 补上这个参数 |
| 报 `Error 1146: Table 'xxx' doesn't exist` | 忘了 `AutoMigrate`，或连错库 | 启动时先迁移；检查库名 |
| 报 `Error 1049: Unknown database` | 库没建，DSN 里的库必须已存在 | 先 `CREATE DATABASE gotest` |
| 密码字段被 API 输出了 | 以为 `json:"-"` 也会让 GORM 忽略 | `json` 和 `gorm` 是两套 tag，互不影响 |
| 中文/emoji 存进去变问号 | DSN 或库的字符集不是 utf8mb4 | DSN 加 `charset=utf8mb4`，建库时也指定 |

---

## 练习

1. 建库 `gotest`，跑通连接和 `AutoMigrate`，再用 MySQL 客户端执行 `DESC users;`，对照第四节的映射规则看生成的表结构。
2. 给 `User` 加一个 `Age int` 字段，重新运行程序，验证 `AutoMigrate` 自动补了列；再删掉一个字段跑一遍，验证"只增不删"。
3. 思考：`Password` 和 `DeletedAt` 都写了 `json:"-"`，它们各自防的是什么？

<details>
<summary>点击查看答案</summary>

**1.** 表名是 `users`（蛇形复数）；列名全是蛇形小写；`id` 是主键自增；`username` 是 varchar(64) 且唯一索引；`created_at`/`updated_at` 是 datetime，且 `deleted_at` 上有索引（因为 `gorm.DeletedAt` 字段建议配 `gorm:"index"`）。

**2.** 加字段后再运行，`DESC users` 能看到新列 `age`，旧数据该列是 NULL/默认值。删掉字段再跑，表里那一列**还在**——AutoMigrate 只增不删，防止误删数据。真要删列用 `DB.Migrator().DropColumn(&model.User{}, "age")`。

**3.** `Password` 的 `json:"-"` 防**序列化泄露**：API 返回用户信息时不能带密码（但数据库里必须存）。`DeletedAt` 的 `json:"-"` 防**内部实现外泄**：删除时间戳属于 ORM 的实现细节，前端不需要知道。

</details>

## 本节小结

- ORM = 用结构体操作数据库表，GORM 是 Go 生态最主流的选择
- 两行安装：`gorm.io/gorm` + `gorm.io/driver/mysql`；DSN 里 `parseTime=True` 别忘
- 模型映射：表名蛇形复数、列名蛇形、`CreatedAt`/`UpdatedAt`/`DeletedAt` 三个特殊字段
- `AutoMigrate` 自动建表补列，只增不删，启动时调一次
- 链式调用：条件方法叠加、终结方法执行，`.Error` 看错误

下一节：[7.2 插入数据](02-create.md)
