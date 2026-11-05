# 7.8 原生 SQL、错误处理与调试

> 本节目标：学会兜底的 Raw/Exec、规范的错误处理、Hooks 与 Scope，掌握调试 SQL 的三件套，最后带走一张全章速查表。

## 一、原生 SQL：Raw 与 Exec

链式方法覆盖不到的场景（复杂统计、数据库特有语法），随时可以退回原生 SQL：

```go
// Raw + Scan：查询
type Res struct {
    Username string
    RoleCnt  int64
}
var res Res
db.DB.Raw("SELECT username, COUNT(ur.role_id) AS role_cnt FROM users u "+
    "LEFT JOIN user_roles ur ON ur.user_id = u.id WHERE u.id = ? GROUP BY username",
    1).Scan(&res)

// Exec：执行写语句
db.DB.Exec("UPDATE users SET status = ? WHERE id = ?", 1, 10)

// Raw 也可以接链式方法
db.DB.Raw("SELECT * FROM users WHERE status = ?", 1).Scan(&users)
```

`?` 占位符照常用。**注意**：`Raw` 里的表名不会自动加软删除条件 `deleted_at IS NULL`，需要的话自己写上。

## 二、错误处理规范

```go
err := db.DB.First(&user, 1).Error

// 记录不存在：errors.Is 判断，不要比对字符串
if errors.Is(err, gorm.ErrRecordNotFound) { ... }

// 没命中任何行的更新/删除：不是 error，看影响行数
result := db.DB.Where("status = ?", 9).Delete(&model.User{})
result.RowsAffected // 0
```

常见错误一览：

| 错误 | 触发场景 |
|------|------|
| `gorm.ErrRecordNotFound` | First/Take/Last 没查到 |
| `gorm.ErrMissingWhereClause` | 不带条件的全局 Update/Delete（安全保护） |
| `gorm.ErrDuplicatedKey` | 唯一键冲突（需全局配置 `TranslateError: true` 才翻译成这个错误） |
| `gorm.ErrInvalidData` | `Scan` 的目标类型不匹配 |

## 三、Hooks：模型生命周期钩子

模型在增删改查前后会触发钩子，注册用户时"没填昵称就用用户名"就是典型用法：

| 操作 | 触发顺序 |
|------|------|
| Create | BeforeSave → BeforeCreate → （SQL）→ AfterCreate → AfterSave |
| Update | BeforeSave → BeforeUpdate → （SQL）→ AfterUpdate → AfterSave |
| Delete | BeforeDelete → （SQL）→ AfterDelete |
| Query | AfterFind |

```go
func (u *User) BeforeCreate(tx *gorm.DB) error {
    if u.Nickname == "" {
        u.Nickname = u.Username
    }
    return nil // 返回 error 会中断操作并回滚
}
```

钩子是**双刃剑**：逻辑藏在模型里，调用方看不到。只放"这个模型自己的规则"（默认值、校验），业务流程别塞进来。

## 四、Scope：可复用的查询片段

同一个条件到处写？封装成 Scope——**固定签名的函数**：

```go
// 无参数的 scope
func Enabled(db *gorm.DB) *gorm.DB {
    return db.Where("status = ?", 1)
}

// 带参数的 scope：返回闭包
func Paginate(page, size int) func(db *gorm.DB) *gorm.DB {
    return func(db *gorm.DB) *gorm.DB {
        return db.Offset((page - 1) * size).Limit(size)
    }
}

// 使用：Scopes 依次串联
db.DB.Scopes(Enabled, Paginate(1, 10)).Find(&users)
// WHERE status = 1 LIMIT 10 OFFSET 0
```

7.4 的分页逻辑用 `Paginate` 一封装，所有列表接口复用一份。

## 五、调试三件套

### 1. Debug()：打印本次 SQL

```go
db.DB.Debug().Where("status = ?", 1).Find(&users)
// 控制台输出 SQL 模板、参数和耗时，慢于阈值还会标红
```

### 2. DryRun：只生成不执行

```go
stmt := db.DB.Session(&gorm.Session{DryRun: true}).
    Where("status = ?", 1).Find(&users)

fmt.Println(stmt.Statement.SQL.String()) // SELECT * FROM `users` WHERE status = ?
fmt.Println(stmt.Statement.Vars)         // [1]
```

### 3. ToSQL：直接拿完整 SQL

```go
sql := db.DB.ToSQL(func(tx *gorm.DB) *gorm.DB {
    return tx.Model(&model.User{}).Where("status = ?", 1).Limit(10).Find(&users)
})
fmt.Println(sql) // 参数已填好的可执行 SQL
```

`Session` 还能做单次会话的其他配置（全局配置写在 `gorm.Open` 的 `&gorm.Config{}` 里，选项名相同）：

| 常用选项 | 作用 |
|------|------|
| `DryRun` | 生成 SQL 不执行 |
| `PrepareStmt` | 预编译语句缓存，提速 |
| `SkipDefaultTransaction` | 关闭单操作默认事务（7.6） |
| `AllowGlobalUpdate` | 允许无条件的全局更新/删除（危险） |
| `CreateBatchSize` | 批量插入自动分批大小 |
| `Logger` | 本次会话的日志级别 |

## 六、全章速查表

```go
// 插入
DB.Create(&u); DB.Create(&list); DB.CreateInBatches(&list, 100)

// 查询
DB.First(&u, id)                       // 主键一条（无记录报错）
DB.Find(&list, ids)                    // 主键多条
DB.Where("col = ?", v).First(&u)       // 条件一条
DB.Where("col IN ?", slice).Find(&list)
DB.Model(&T{}).Count(&n)               // 计数
DB.Model(&T{}).Pluck("id", &ids)       // 抽单列
DB.Select("a,b").Order("id DESC").Limit(10).Offset(0).Find(&list) // 排序分页
DB.Select("...").Group("g").Having("...").Scan(&rows)             // 聚合

// 更新
DB.Model(&u).Update("col", v)                      // 单字段
DB.Model(&u).Updates(map[string]interface{}{...})  // 多字段（含零值）
DB.Model(&u).Select("col1","col2").Updates(T{...}) // struct 强制含零值
DB.Model(&u).Update("col", gorm.Expr("col + ?", 1))// 数据库表达式

// 删除
DB.Delete(&u); DB.Delete(&T{}, ids); DB.Unscoped().Delete(&u) // 物理删

// 事务
DB.Transaction(func(tx *gorm.DB) error { ...; return nil })

// 关联
DB.Preload("Roles").Find(&list)
DB.Model(&u).Association("Roles").Replace(&roles)
DB.Table("t").Joins("JOIN t2 ON ...").Where(...).Scan(&rows)

// 调试
DB.Debug(); DB.Session(&gorm.Session{DryRun: true}); DB.ToSQL(fn)
```

---

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `Raw` 查出了"已删除"的数据 | 原生 SQL 不自动加 `deleted_at IS NULL` | SQL 里手动写软删条件 |
| 钩子没执行 | 方法定义在值接收者上或名字拼错 | 指针接收者 `func (u *User) BeforeCreate(tx *gorm.DB) error` |
| 全表被更新了，没报错 | 用了 `AllowGlobalUpdate` | 生产环境别开这个开关 |
| 生产环境满屏 SQL 日志 | 默认 logger 打印所有慢 SQL | 全局配置 `logger.Default.LogMode(logger.Warn)` |

---

## 练习

1. 用 `Scope` 封装 `Active`（status = 1）和 `Page(page, size)`，组合实现"启用的用户第 2 页、每页 5 条"。
2. 写一个 Hook：创建用户时如果没填昵称，自动用用户名顶上；用户名也为空则报错中断。
3. 用 DryRun 打印 `WHERE status = 1 AND id > 100` 查询的 SQL 和参数（不真执行）。

<details>
<summary>点击查看答案</summary>

**1.**

```go
func Active(db *gorm.DB) *gorm.DB {
    return db.Where("status = ?", 1)
}

func Page(page, size int) func(db *gorm.DB) *gorm.DB {
    return func(db *gorm.DB) *gorm.DB {
        return db.Offset((page - 1) * size).Limit(size)
    }
}

var users []model.User
db.DB.Scopes(Active, Page(2, 5)).Find(&users)
```

**2.**

```go
func (u *User) BeforeCreate(tx *gorm.DB) error {
    if u.Username == "" {
        return errors.New("username 不能为空")
    }
    if u.Nickname == "" {
        u.Nickname = u.Username
    }
    return nil
}
```

返回 error 后 Create 中止并回滚，调用方从 `.Error` 拿到这个错误。

**3.**

```go
stmt := db.DB.Session(&gorm.Session{DryRun: true}).
    Where("status = ? AND id > ?", 1, 100).Find(&users)
fmt.Println(stmt.Statement.SQL.String()) // SELECT * FROM `users` WHERE status = ? AND id > ?
fmt.Println(stmt.Statement.Vars)         // [1 100]
```

</details>

## 本节小结

- 链式覆盖不了的用 `Raw`（查）+ `Exec`（写），占位符照用，软删条件要手写
- 错误处理：`errors.Is` 判 `ErrRecordNotFound`，更新/删除没命中看 `RowsAffected`
- Hooks 放"模型自己的规则"，Scope 放"可复用的查询条件"，别滥用
- 调试三件套：`Debug()` 打印、`DryRun` 只生成、`ToSQL` 拿成品 SQL
- 恭喜！GORM 全章学完，速查表就是你的复习地图

---

[返回教程目录](../README.md)
