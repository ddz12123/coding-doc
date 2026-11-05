# 7.4 查询进阶：排序分页、聚合与子查询

> 本节目标：掌握字段选择、排序分页、计数抽列、分组聚合这些"写业务接口"天天用的查询技能。

## 一、字段选择：Select / Omit

```go
// 指定查询的列
db.DB.Select("id", "username").Find(&users)
// SELECT `id`,`username` FROM `users`

db.DB.Select([]string{"id", "username"}).Find(&users) // 切片写法也行

// 还能写 SQL 表达式
db.DB.Select("COALESCE(nickname, username) AS display_name").Find(&users)

// 排除某列（比如不把密码捞出来）
db.DB.Omit("password").Find(&users)
```

列表接口查大字段（正文、密码）时，`Select`/`Omit` 是常用的省流量手段。

## 二、排序：Order

```go
db.DB.Order("sort ASC").Order("id DESC").Find(&roles)
// ORDER BY sort ASC, id DESC —— 可多次调用，依次拼接
```

> `Order` 的参数会**原样拼进 SQL**。排序字段来自用户输入（比如接口参数 `sort=name`）时，先做**白名单校验**，只允许预定义的字段名，否则就是注入漏洞。

## 三、分页：Limit / Offset

公式固定：`offset = (page - 1) * pageSize`。

```go
// 第 3 页，每页 10 条
page, pageSize := 3, 10
db.DB.Limit(pageSize).Offset((page - 1) * pageSize).Find(&users)
// SELECT * FROM `users` LIMIT 10 OFFSET 20
```

一个完整的列表接口通常是"查一页数据 + 查总数"两条 SQL：

```go
func ListUsers(page, pageSize int) ([]model.User, int64, error) {
    var (
        users []model.User
        total int64
    )
    query := db.DB.Model(&model.User{}).Where("status = ?", 1)

    if err := query.Count(&total).Error; err != nil { // 先数总数
        return nil, 0, err
    }
    err := query.Order("id DESC").
        Limit(pageSize).Offset((page - 1) * pageSize).
        Find(&users).Error // 再取一页
    return users, total, err
}
```

## 四、计数与抽列：Count / Pluck

```go
var total int64
db.DB.Model(&model.User{}).Where("status = ?", 1).Count(&total)
// SELECT count(*) FROM `users` WHERE status = 1

var ids []uint
db.DB.Model(&model.Role{}).Where("status = ?", 1).Pluck("id", &ids)
// SELECT `id` FROM `roles` WHERE status = 1 —— 把一列抽进切片
```

> 计数/抽列前要 `Model(&X{})` **指明表**，否则 GORM 不知道从哪张表查。

## 五、分组聚合：Group / Having + Scan

"每个角色有多少个用户"这类统计，结果不是现成的模型，要接进自定义结构体。**`Scan` 不要求目标是模型对象**，专干这个：

```go
type Row struct {
    RoleID uint  `json:"roleId"`
    Cnt    int64 `json:"cnt"`
}

rows := []Row{}
db.DB.Model(&model.UserRole{}).
    Select("role_id, COUNT(*) AS cnt").
    Group("role_id").
    Having("COUNT(*) > ?", 5).
    Scan(&rows)
// SELECT role_id, COUNT(*) AS cnt FROM `user_roles`
// GROUP BY role_id HAVING COUNT(*) > 5
```

`Select` 里的 `AS cnt` 要和 `Row` 的字段对上：列名/别名蛇形转驼峰后等于字段名（`role_id` → `RoleID`，`cnt` → `Cnt`）。

## 六、逐行扫描与分批读取（了解）

```go
// 单行：Row
var name string
row := db.DB.Table("users").Select("username").Where("id = ?", 1).Row()
row.Scan(&name)

// 多行迭代：Rows
rows, _ := db.DB.Model(&model.User{}).Select("username").Rows()
defer rows.Close()
for rows.Next() {
    var name string
    rows.Scan(&name)
}

// 大表分批读：FindInBatches，每 100 条进回调处理一次
result := db.DB.FindInBatches(&users, 100, func(tx *gorm.DB, batch int) error {
    // batch 是批次号（1、2、3…）
    return nil
})
```

日常 90% 的场景用 `Find`/`First`/`Scan` 就够了，这几个知道存在即可。

## 七、子查询与命名参数

子查询：把一个 GORM 查询当参数塞进 `Where`，**注意要用 `IN (?)`**：

```go
// WHERE id IN (SELECT id FROM roles WHERE status = 1)
db.DB.Where("id IN (?)", db.DB.Model(&model.Role{}).Select("id").Where("status = ?", 1)).Find(&users)
```

参数一多，`?` 的顺序容易数错，可以用命名参数：

```go
db.DB.Where("status = @status AND id > @id",
    map[string]interface{}{"status": 1, "id": 100})
```

---

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `Count`/`Pluck` 报错或查错表 | 没写 `Model(&X{})`，GORM 不知道目标表 | 计数/聚合前先 `Model` |
| 分页数据重复或跳行 | `offset` 算错，或排序字段不唯一导致顺序不稳定 | 用 `(page-1)*pageSize`；`Order` 里带一列唯一值（如 `id`） |
| `Scan` 出来字段全是零值 | `Select` 的列名/别名和结构体字段对不上 | 别名和字段名对应（`AS cnt` → `Cnt`） |
| 排序字段直接拼用户输入 | `Order` 原样进 SQL，可被注入 | 白名单校验合法字段名 |
| `LIMIT 0` 一条都查不出 | `pageSize` 忘赋值，零值传了进去 | 接口层对分页参数兜底（默认 10，上限 100） |

---

## 练习

1. 实现"用户列表页"：参数 `page`、`pageSize`、`keyword`（模糊匹配用户名），返回"当页用户 + 总数"。要求 keyword 为空时不加这个条件。
2. 统计每个状态（status）的用户数，返回 `[]struct{ Status int; Cnt int64 }`。
3. 查出状态为 1 的所有用户的 ID 列表（用 `Pluck`）。

<details>
<summary>点击查看答案</summary>

**1.** 动态条件拼接 + 先数后取：

```go
func ListUsers(keyword string, page, pageSize int) ([]model.User, int64, error) {
    query := db.DB.Model(&model.User{})
    if keyword != "" {
        query = query.Where("username LIKE ?", "%"+keyword+"%")
    }
    var total int64
    if err := query.Count(&total).Error; err != nil {
        return nil, 0, err
    }
    var users []model.User
    err := query.Order("id DESC").
        Limit(pageSize).Offset((page - 1) * pageSize).
        Find(&users).Error
    return users, total, err
}
```

**2.**

```go
type StatusCnt struct {
    Status int
    Cnt    int64
}
var rows []StatusCnt
db.DB.Model(&model.User{}).
    Select("status, COUNT(*) AS cnt").
    Group("status").
    Scan(&rows)
```

**3.**

```go
var ids []uint
db.DB.Model(&model.User{}).Where("status = ?", 1).Pluck("id", &ids)
```

</details>

## 本节小结

- `Select`/`Omit` 控制查哪些列，能写 SQL 表达式
- `Order` 拼接排序、`Limit/Offset` 分页（`offset = (page-1)*pageSize`），列表接口 = 一页数据 + 一个总数
- `Count`/`Pluck` 前必须 `Model(&X{})` 指明表
- 聚合统计用 `Group/Having + Scan` 接自定义结构体，别名对上字段名
- `Order` 参数原样进 SQL，用户输入要白名单
- 子查询记得 `IN (?)`，参数多用命名参数

下一节：[7.5 更新与删除](05-update-delete.md)
