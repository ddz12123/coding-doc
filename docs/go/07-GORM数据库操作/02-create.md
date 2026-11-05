# 7.2 插入数据：Create

> 本节目标：掌握单条、批量插入，学会控制写入字段、回填主键，以及"存在则更新"的 Upsert 写法。

上一节连上了数据库、建好了表，这一节开始往 `users` 表里写数据。

## 一、插入一条记录

```go
user := model.User{
    Username: "zhangsan",
    Password: "$2a$10$xxxx", // 假设是加密后的密码
    Nickname: "小三",
    Status:   1,
}

result := db.DB.Create(&user)
// INSERT INTO `users` (`username`,`password`,`nickname`,`status`,`created_at`,`updated_at`)
// VALUES ('zhangsan','$2a$10$xxxx','小三',1,'2026-01-01 12:00:00','2026-01-01 12:00:00')

result.Error        // 错误信息，nil 表示成功
result.RowsAffected // 影响行数，插入成功是 1
user.ID             // 自增主键已经回填进来了，比如 1
```

三个要点：

- **必须传指针** `Create(&user)`：传值的话 GORM 拿不到地址，自增 ID 没法回填
- `CreatedAt`/`UpdatedAt` **不用手动赋值**，GORM 自动填当前时间
- 零值字段（没赋值的）不会出现在 INSERT 里，走数据库的默认值

## 二、批量插入

切片直接传进去，GORM 生成**一条**多值 INSERT，比循环单插快得多：

```go
users := []model.User{
    {Username: "lisi", Status: 1},
    {Username: "wangwu", Status: 1},
    {Username: "zhaoliu", Status: 1},
}
db.DB.Create(&users)
// INSERT INTO `users` (`username`,`status`,...) VALUES ('lisi',1,...),('wangwu',1,...),('zhaoliu',1,...)

for i := range users {
    fmt.Println(users[i].ID) // 每条的 ID 都回填了
}
```

数据量大（比如导入几万条）时，用 `CreateInBatches` 分批写，避免单条 SQL 过大：

```go
db.DB.CreateInBatches(&users, 100) // 每批 100 条
```

## 三、控制写入的字段

默认写所有非零值字段，可以用 `Select` / `Omit` 精确控制：

```go
// 只写这两个字段，其余列用数据库默认值
db.DB.Select("Username", "Password").Create(&user)

// 除 Nickname 之外都写
db.DB.Omit("Nickname").Create(&user)
```

什么时候需要？"想把某个字段**显式写成零值**"的时候。比如默认值是 1 的 `status`，你偏要存 0——默认情况下零值不会进 INSERT，用 `Select("Username", "Status")` 指定了就能写进去。

## 四、Upsert：存在则更新

`username` 上有唯一索引，重复插入会报 `Error 1062: Duplicate entry`。想实现"不存在就插入，存在就更新"（Upsert），用 `clause.OnConflict`：

```go
import "gorm.io/gorm/clause"

db.DB.Clauses(clause.OnConflict{
    Columns:   []clause.Column{{Name: "username"}},            // 冲突判定列
    DoUpdates: clause.AssignmentColumns([]string{"nickname"}), // 冲突时更新哪些列
}).Create(&user)
// INSERT INTO `users` (...) VALUES (...)
// ON DUPLICATE KEY UPDATE `nickname`=VALUES(`nickname`)
```

## 五、和数据库默认值配合的常见套路

| 需求 | 写法 |
|------|------|
| 插入后拿到自增 ID | 传指针，直接读 `user.ID` |
| 插入一批 | `Create(&slice)`，一条 SQL |
| 大批量导入 | `CreateInBatches(&slice, 100)` |
| 某字段写零值 | `Select` 指定字段 |
| 不写某字段 | `Omit` 或不赋值 |
| 重复插入不报错、改更新 | `clause.OnConflict` |

---

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `user.ID` 插入后还是 0 | 传了值 `Create(user)` 而不是指针 | 一律 `Create(&user)` |
| 想存的 0/"" 没存进去，库里是默认值 | 零值字段不进 INSERT | `Select` 显式指定字段 |
| 报 `Error 1062: Duplicate entry` | 唯一索引列撞了 | 用 Upsert，或插入前先查重 |
| 每条一循环 `Create`，导入特别慢 | 循环里逐条 INSERT，网络往返 N 次 | 改传切片一次批量 |

---

## 练习

1. 批量插入 3 个用户，插入后打印每个人的 ID 和 `RowsAffected`。
2. 把 `zhangsan` 的昵称改成"张三丰"——用 Upsert 实现：用户名相同就更新昵称，不存在就新建。
3. `status` 字段在数据库默认值是 1 的前提下，插入一个 `Status: 0` 的用户，让 0 **真的存进库**。

<details>
<summary>点击查看答案</summary>

**1.**

```go
users := []model.User{
    {Username: "a1", Status: 1},
    {Username: "a2", Status: 1},
    {Username: "a3", Status: 1},
}
result := db.DB.Create(&users)
fmt.Println(result.RowsAffected) // 3
for _, u := range users {
    fmt.Println(u.ID) // 1 2 3（已回填）
}
```

**2.**

```go
u := model.User{Username: "zhangsan", Nickname: "张三丰"}
db.DB.Clauses(clause.OnConflict{
    Columns:   []clause.Column{{Name: "username"}},
    DoUpdates: clause.AssignmentColumns([]string{"nickname"}),
}).Create(&u)
```

**3.** 零值不进 INSERT 是默认行为，指定字段即可：

```go
db.DB.Select("Username", "Status").Create(&model.User{Username: "zero", Status: 0})
// INSERT INTO `users` (`username`,`status`) VALUES ('zero',0)
```

</details>

## 本节小结

- `Create(&user)` 传指针，自增 ID 自动回填；错误看 `.Error`
- 批量传切片（一条多值 INSERT），海量数据用 `CreateInBatches` 分批
- 零值字段默认不写库，想写零值用 `Select` 指定字段
- `clause.OnConflict` 实现"存在则更新"的 Upsert
- 时间字段不用管，GORM 自动填

下一节：[7.3 查询基础](03-query-basic.md)
