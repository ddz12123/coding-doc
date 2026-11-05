# 7.3 查询基础：First / Find / Where

> 本节目标：掌握查一条和查列表的四个方法，学会用 `Where` 写各种条件，理解"查不到"怎么处理，避开零值和条件累积两个大坑。

## 一、查一条的四个方法

| 方法 | 含义 | 无记录时 | 生成的 SQL 尾巴 |
|------|------|------|------|
| `First` | 主键升序第一条 | 返回 `ErrRecordNotFound` | `ORDER BY id LIMIT 1` |
| `Take` | 不排序取一条 | 返回 `ErrRecordNotFound` | `LIMIT 1` |
| `Last` | 主键降序第一条 | 返回 `ErrRecordNotFound` | `ORDER BY id DESC LIMIT 1` |
| `Find` | 查列表 | **不是错误**，返回空切片 | 无 |

日常用得最多的是两头：查一条用 `First`，查列表用 `Find`。

```go
var user model.User
db.DB.First(&user, 10)                   // 按主键：WHERE id = 10
db.DB.First(&user, "username = ?", "admin") // 按条件查一条

var users []model.User
db.DB.Find(&users)                 // 全表
db.DB.Find(&users, []uint{1, 2, 3}) // 按主键批量：WHERE id IN (1,2,3)
```

**查列表必须传切片的指针** `&users`：传值的话 GORM 往里塞的结果塞不回你的变量。

## 二、Where 条件：只用字符串 + 占位符

`Where` 的第一参数是 SQL 片段，值用 `?` 占位，按顺序传参：

```go
db.DB.Where("username = ?", "admin")
db.DB.Where("status = ? AND id > ?", 1, 100)
db.DB.Where("username LIKE ?", "%zhang%")         // 模糊查询
db.DB.Where("id IN ?", []uint{1, 2, 3})           // v2 的 IN 写法：IN ?（直接跟切片）
db.DB.Where("created_at BETWEEN ? AND ?", t1, t2) // 时间区间
db.DB.Where("nickname IS NULL")
```

> **`?` 占位符就是防 SQL 注入的手段**，参数由驱动安全转义。永远不要 `fmt.Sprintf("username = '%s'", input)` 拼值——这是 SQL 注入的经典入口。

## 三、struct / map 条件与零值坑 ⚠️

`Where` 除了字符串，还能收 struct 或 map：

```go
db.DB.Where(&model.User{Username: "admin", Status: 1})
// WHERE username = 'admin' AND status = 1

db.DB.Where(&model.User{Username: "admin", Sort: 0})
// WHERE username = 'admin' —— Sort = 0 是零值，被丢了！⚠️

db.DB.Where(map[string]interface{}{"username": "admin", "sort": 0})
// WHERE username = 'admin' AND sort = 0 —— map 保留零值
```

结论一句话：**条件里可能出现零值（0、""、false）时，用字符串或 map，不要用 struct**。

## 四、Not / Or 的组合语义

- 多个条件方法之间默认 **AND**
- `Or` 把"到当前为止的所有条件"和"Or 后面的条件"并列成两组，**组内 AND、组间 OR**
- 复杂逻辑直接在字符串里写括号最清晰

```go
db.DB.Where("status = ?", 1).Where("id > ?", 10)
// WHERE status = 1 AND id > 10

db.DB.Where("role = ?", "admin").Where("status = ?", 1).Or("role = ?", "operator")
// WHERE (role = 'admin' AND status = 1) OR (role = 'operator')

db.DB.Not("username = ?", "admin")  // WHERE NOT username = 'admin'
db.DB.Not([]uint{1, 2, 3})          // WHERE id NOT IN (1,2,3)

// 子分组：把一段条件包成括号
db.DB.Where(
    db.DB.Where("type = ?", 1).Or("type = ?", 2),
).Where("status = ?", 1)
// WHERE (type = 1 OR type = 2) AND status = 1
```

## 五、查不到怎么办？

`First`/`Take`/`Last` 查不到返回固定错误，用 `errors.Is` 判断（**不要比对错误字符串**）：

```go
import (
    "errors"
    "gorm.io/gorm"
)

err := db.DB.First(&user, 999).Error
if errors.Is(err, gorm.ErrRecordNotFound) {
    fmt.Println("用户不存在")
}
```

而 `Find` 查不到**不算错误**，切片长度为 0：

```go
db.DB.Where("status = ?", 9).Find(&users)
if len(users) == 0 {
    fmt.Println("没有符合条件的用户")
}
```

还有一组"查不到就初始化/创建"的便利方法：

```go
var user model.User

// 查不到不落库，只把 user 填成给定值（内存初始化）
db.DB.FirstOrInit(&user, model.User{Username: "x", Status: 1})

// 查不到就插入
db.DB.FirstOrCreate(&user, model.User{Username: "x"})

// 创建时附加默认字段
db.DB.Attrs(model.User{Status: 1}).FirstOrCreate(&user, model.User{Username: "x"})

// 无论存不存在，都把指定字段更新过去
db.DB.Assign(model.User{Status: 2}).FirstOrCreate(&user, model.User{Username: "x"})
```

## 六、条件累积的坑 ⚠️（本节最重要的坑）

条件方法会**累积**在同一个 `*gorm.DB` 上。复用一个变量反复执行，条件越叠越多：

```go
q := db.DB.Where("status = ?", 1)

q.Count(&n)                        // WHERE status = 1 ✓
q.Where("id > ?", 10).Count(&m)    // WHERE status = 1 AND id > 10 ✓（动态拼接就该这样）
q.Limit(10).Find(&users)           // WHERE status = 1 AND id > 10 LIMIT 10 —— Limit 残留了！
```

两种正确姿势：

```go
// 姿势一：动态条件拼接——从 DB 出发，db = db.Where(...) 覆盖变量（同一轮拼接内）
query := db.DB.Model(&model.User{})
if kw != "" {
    query = query.Where("username LIKE ?", "%"+kw+"%")
}
query.Count(&total)
query.Order("id DESC").Find(&users) // Count 和 Find 共用这轮条件，正是想要的

// 姿势二：同一个变量要反复独立执行——用 Session 开会话，每次执行后条件自动重置
q := db.DB.Where("status = ?", 1).Session(&gorm.Session{})
q.Count(&n) // WHERE status = 1
q.Count(&m) // WHERE status = 1（不会累积）
```

---

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| 明明有数据却查不到 | `Where` 传 struct，条件是零值被忽略 | 换字符串或 map 条件 |
| 比对 `err.Error() == "record not found"` | 错误文本不可靠 | `errors.Is(err, gorm.ErrRecordNotFound)` |
| 查列表结果总是空/panic | 传了 `users` 而不是 `&users` | 切片也要传指针 |
| 第二次查询带上了第一次的条件 | 条件在同一个 `*gorm.DB` 上累积 | 动态拼接用 `db = db.Where(...)`；反复执行用 `Session` |
| 子查询条件写 `IN ?` 不生效 | 传**子查询**时必须是 `IN (?)` | 写成 `Where("id IN (?)", subQuery)` |

---

## 练习

1. 写一个函数 `FindByUsername(name string) (*model.User, error)`：查得到返回用户，查不到返回 `nil, nil`（"不存在"不算错误），其他错误原样返回。
2. 查出所有 `status` 为 0 **或** 2 的用户（提示：想想零值坑，别用 struct 条件）。
3. 写函数 `FirstOrCreateAdmin()`：确保 `admin` 用户存在，且第一次创建时 `status` 为 1。

<details>
<summary>点击查看答案</summary>

**1.** 用 `errors.Is` 区分"没查到"和"真出错"：

```go
func FindByUsername(name string) (*model.User, error) {
    var u model.User
    err := db.DB.Where("username = ?", name).First(&u).Error
    if errors.Is(err, gorm.ErrRecordNotFound) {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }
    return &u, nil
}
```

**2.** `status = 0` 是零值，struct 条件会丢掉它，用字符串条件：

```go
db.DB.Where("status = ? OR status = ?", 0, 2).Find(&users)
```

**3.** `FirstOrCreate` + `Attrs`：

```go
func FirstOrCreateAdmin() model.User {
    var admin model.User
    db.DB.Attrs(model.User{Status: 1}).FirstOrCreate(&admin, model.User{Username: "admin"})
    return admin
}
```

`Attrs` 只在"确实新建了"的时候生效，已存在的 admin 不会被改动。

</details>

## 本节小结

- 查一条 `First`（查不到报错），查列表 `Find`（查不到是空切片，不是错误）
- `Where` 条件首选"字符串 + `?` 占位符"，天然防注入
- 零值坑：struct 条件丢零值，用字符串或 map
- 组合语义：方法之间 AND，`Or` 分组，复杂逻辑写字符串括号
- 判"不存在"用 `errors.Is(err, gorm.ErrRecordNotFound)`
- 条件累积坑：动态拼接用 `db = db.Where(...)`，变量复用执行用 `Session`

下一节：[7.4 查询进阶](04-query-advanced.md)
