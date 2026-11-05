# 7.7 关联操作：Preload 与 Association

> 本节目标：学会声明模型之间的多对多关系，用 `Preload` 一次查出带关联的数据，用 `Association` 管理关联，用 `Joins` 做跨表过滤。

## 一、声明关联：many2many

用户和角色是典型的**多对多**：一个用户可以有几个角色，一个角色可以分给多个用户。中间靠一张 `user_roles` 表记录"谁有哪个角色"：

```go
type User struct {
    ID       uint   `gorm:"primaryKey" json:"id"`
    Username string `gorm:"size:64;uniqueIndex" json:"username"`
    Roles    []Role `gorm:"many2many:user_roles" json:"roles"` // 多对多，中间表 user_roles
}

type Role struct {
    ID   uint   `gorm:"primaryKey" json:"id"`
    Name string `gorm:"size:64;uniqueIndex" json:"name"`
}
```

GORM 按 `many2many:user_roles` 推断中间表结构，列名规则是 `本端模型名_id` / `对端模型名_id`：

```
user_roles 表：user_id | role_id
```

记得 `AutoMigrate(&model.User{}, &model.Role{})`——中间表也会自动建出来。

## 二、Preload：预加载关联数据

```go
var users []model.User
db.DB.Preload("Roles").Find(&users)
// 两条 SQL：
// SELECT * FROM `users`
// SELECT * FROM `roles` JOIN `user_roles` ON ... WHERE user_id IN (1,2,3,...)
// 然后在内存里把角色拼进每个 user.Roles —— 每个用户都带上了自己的角色列表
```

几种常用形态：

```go
db.DB.Preload("Roles").Find(&users)              // 用户的角色

// 点号链：嵌套预加载（角色的菜单）
db.DB.Preload("Roles.Menus").Find(&users)

// 全部关联一次加载
db.DB.Preload(clause.Associations).Find(&users)

// 预加载加条件：字符串形式
db.DB.Preload("Roles", "status = ?", 1).Find(&users)

// 预加载加条件：函数形式（能排序、写复杂条件）
db.DB.Preload("Roles", func(tx *gorm.DB) *gorm.DB {
    return tx.Order("sort ASC")
}).Find(&users)

// 单独加载某个用户的关联
db.DB.Model(&user).Association("Roles").Find(&roles)
```

> `Preload("Roles")` 的参数是**结构体字段名**，不是表名。

### Preload 不是 JOIN

它是先查主表，再用第二条 SQL 查关联表，在内存里按外键拼装。查列表时只产生 **2 条 SQL**（主表一条 + 关联表一条 `WHERE user_id IN (...)`），没有 N+1 问题。

## 三、Association API：管理关联关系

"给用户分配角色"这类操作，用 `Association` 系列：

```go
db.DB.Model(&user).Association("Roles").Append(&role)   // 追加一个关联
db.DB.Model(&user).Association("Roles").Append(&roles)  // 追加一批

db.DB.Model(&user).Association("Roles").Replace(&roles) // 全量替换 = 删旧关联 + 插新关联
db.DB.Model(&user).Association("Roles").Delete(&role)   // 删除指定关联（只删中间表记录）
db.DB.Model(&user).Association("Roles").Clear()         // 清空所有关联
db.DB.Model(&user).Association("Roles").Count()         // 关联数量
db.DB.Model(&user).Association("Roles").Find(&roles)    // 取出关联对象
```

要点：

- `Append`/`Replace`/`Delete`/`Clear` **只改中间表**，不动 `users`、`roles` 本身的数据
- `Replace` 是"分配角色"类接口的标准语法：前端提交一筐角色 ID，直接整筐替换
- 跨多步的关联操作，包进 7.6 的闭包事务更稳

## 四、Joins：手写连接，跨表过滤

`Preload` 是"查主表**带**关联数据"；反过来"**按**关联表的字段过滤主表"（比如：查出拥有某角色的所有用户），要用 `Joins`：

```go
// 查出 role_id = 2 的所有用户
db.DB.Joins("JOIN user_roles ON user_roles.user_id = users.id").
    Where("user_roles.role_id = ?", roleID).
    Find(&users)
```

多表 JOIN 后抽某一列（权限系统的经典查法）：

```go
// 经过 role_menus、user_roles 两张中间表，取出用户能访问的菜单地址
var urls []string
db.DB.Table("menus").
    Joins("JOIN role_menus ON role_menus.menu_id = menus.id").
    Joins("JOIN user_roles ON user_roles.role_id = role_menus.role_id").
    Where("user_roles.user_id = ?", userID).
    Distinct().
    Pluck("menus.path", &urls)
```

## 五、Preload 还是 Joins？

| 需求 | 用哪个 |
|------|------|
| 查主表，顺带把关联数据也拿出来 | `Preload` |
| 按关联表的字段**过滤主表** | `Joins` |
| 跨多表的聚合统计 | `Joins`/`Table` + `Scan`/`Pluck`（7.4） |

一句话：**要数据用 Preload，要条件用 Joins**。

---

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| 报 `unsupported relations` | `Preload` 里写了表名 `user_roles` 或小写字段 | 写**结构体字段名** `Roles` |
| 关联数据总是空 | 没写 `Preload`，GORM 默认不查关联 | 查询时显式 `Preload("Roles")` |
| 想追加角色，结果旧角色没了 | 用了 `Replace`（全量替换） | 追加用 `Append`，整筐换才用 `Replace` |
| `Replace`/`Append` 报错 | 传了值而不是指针 | `Append(&role)`、`Append(&roles)` |
| 中间表结构对不上 | 手动建了列名不规范的中间表 | 让 `AutoMigrate` 建，或列名遵守 `user_id`/`role_id` 规则 |

---

## 练习

1. 查出"拥有角色 `admin`"的所有用户的用户名。
2. 给用户 `zhangsan` 分配角色列表 `["editor", "viewer"]`（不管他原来有什么角色，最终就是这两个）。
3. 查出每个用户及其角色数量，返回 `[]struct{ Username string; RoleCnt int64 }`（提示：JOIN + Group + Scan）。

<details>
<summary>点击查看答案</summary>

**1.** 按关联表字段过滤主表 → Joins：

```go
var names []string
db.DB.Model(&model.User{}).
    Joins("JOIN user_roles ON user_roles.user_id = users.id").
    Joins("JOIN roles ON roles.id = user_roles.role_id").
    Where("roles.name = ?", "admin").
    Pluck("users.username", &names)
```

**2.** "最终就是这两个" = 全量替换 → Replace：

```go
var roles []model.Role
db.DB.Where("name IN ?", []string{"editor", "viewer"}).Find(&roles)

var zhangsan model.User
db.DB.Where("username = ?", "zhangsan").First(&zhangsan)
db.DB.Model(&zhangsan).Association("Roles").Replace(&roles)
```

**3.**

```go
type Row struct {
    Username string
    RoleCnt  int64
}
var rows []Row
db.DB.Model(&model.User{}).
    Select("users.username, COUNT(user_roles.role_id) AS role_cnt").
    Joins("LEFT JOIN user_roles ON user_roles.user_id = users.id").
    Group("users.id").
    Scan(&rows)
```

</details>

## 本节小结

- 多对多声明：`gorm:"many2many:user_roles"`，中间表列名 `user_id`/`role_id` 由模型名推断
- `Preload("Roles")` 按字段名预加载，两条 SQL 内存拼装，列表页没有 N+1
- `Association` 管关联：`Append`/`Replace`/`Delete`/`Clear`/`Count`/`Find`，只动中间表
- 按关联表字段过滤主表用 `Joins`；**要数据用 Preload，要条件用 Joins**
- "分配角色"类接口的标准姿势：查出角色 → `Replace`

下一节：[7.8 原生 SQL 与调试](08-raw-sql-debug.md)
