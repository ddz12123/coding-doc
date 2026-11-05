# 7.5 更新与删除：软删除登场

> 本节目标：掌握四个更新 API 的分工，重点躲开"零值更新"这个 GORM 最著名的坑，学会删除和软删除。

## 一、四个更新 API

| API | 参数形式 | 触发 hooks | 刷新 UpdatedAt | 用途 |
|------|------|------|------|------|
| `Update` | 单列名 + 值 | 是 | 是 | 改一个字段 |
| `Updates` | struct 或 map | 是 | 是 | 改多个字段 |
| `Save` | 整个对象 | 是 | 是 | 全字段保存（零值也写） |
| `UpdateColumn(s)` | 同 Update/Updates | 否 | 否 | 纯数据修正 |

```go
db.DB.Model(&user).Update("status", 2) // 单字段
// UPDATE `users` SET `status`=2,`updated_at`='...' WHERE `id` = 1

db.DB.Model(&user).Updates(map[string]interface{}{ // 多字段（map）
    "nickname": "新昵称", "status": 2,
})
db.DB.Model(&user).Updates(model.User{Nickname: "新昵称", Status: 2}) // 多字段（struct）

db.DB.Save(&user) // 整个对象全字段保存

db.DB.Model(&user).UpdateColumn("last_login_at", time.Now()) // 不刷新 updated_at
```

注意：**更新必须以 `Model(&user)` 开头**——它告诉 GORM 更新哪张表、用哪个主键定位行。

## 二、零值坑 ⚠️（GORM 最著名的坑）

想"把角色的 sort 重置为 0、描述改掉"：

```go
db.DB.Model(&role).Updates(model.Role{Sort: 0, Description: "临时角色"})
// UPDATE `roles` SET `description`='临时角色' ... —— Sort = 0 是零值，没更新！
```

和 7.3 的 struct 条件是同一个根源：**GORM 默认忽略零值字段**。两种解法：

```go
// 解法一：改用 map（map 不分零值不零值，写啥是啥）
db.DB.Model(&role).Updates(map[string]interface{}{"sort": 0, "description": "临时角色"})
// UPDATE `roles` SET `sort`=0,`description`='临时角色' ✓

// 解法二：struct + Select 指定列（指定了就更新，哪怕是零值）
db.DB.Model(&role).Select("Sort", "Description").Updates(model.Role{Sort: 0, Description: "临时角色"})
```

`Save` 是全字段 UPDATE，零值也会写进去——但它会覆盖**所有**列，并发场景容易把别人刚改的字段冲掉，慎用。

**经验法则：多字段更新无脑用 map。**

## 三、让数据库算：gorm.Expr

"登录次数 +1"如果先查再写，两个请求同时来就会丢一次计数。让数据库自己算，天然原子：

```go
db.DB.Model(&user).Update("login_count", gorm.Expr("login_count + ?", 1))
// UPDATE `users` SET `login_count`=login_count+1,`updated_at`='...' WHERE `id` = 1

db.DB.Model(&user).Updates(map[string]interface{}{
    "login_count": gorm.Expr("GREATEST(login_count - ?, 0)", 1), // 减到 0 为止
})
```

## 四、批量更新与安全保护

```go
// 把所有 status=2 的用户昵称改掉
db.DB.Model(&model.User{}).Where("status = ?", 2).Update("nickname", "已禁用")
```

- `Model(&model.User{})` 传**模型类型**（不指定实例），表示"整表范围"，靠 `Where` 圈定行
- **不带 WHERE 的批量更新/删除，GORM 直接报错拒绝执行**：`gorm.ErrMissingWhereClause`——防止手滑清空全表

真想全表更新，加 `Session(&gorm.Session{AllowGlobalUpdate: true})` 显式放行。

## 五、删除

```go
db.DB.Delete(&user)                        // 按对象删（用它的主键）
db.DB.Delete(&model.User{}, 10)            // 按主键删
db.DB.Delete(&model.User{}, []uint{1, 2, 3}) // 按主键批量删
db.DB.Where("username LIKE ?", "tmp_%").Delete(&model.User{}) // 按条件删
```

同样受安全保护：不带条件的全局删除会被 `ErrMissingWhereClause` 拦下。

## 六、软删除：删了，但又没删

7.1 的 `User` 模型里有 `DeletedAt gorm.DeletedAt` 字段——有它，`Delete` 的行为就变了：

```go
db.DB.Delete(&user)
// UPDATE `users` SET `deleted_at`='2026-01-01 12:00:00' WHERE `id` = 10
// ↑ 不是 DELETE 语句！只是往 deleted_at 里填了个时间
```

之后所有查询会**自动**带上 `deleted_at IS NULL`，已"删"的数据像不存在一样：

```go
db.DB.First(&user, 10)            // ErrRecordNotFound：自动过滤已软删数据
db.DB.Unscoped().First(&user, 10) // Unscoped 能看到已"删"数据
db.DB.Unscoped().Delete(&user)    // Unscoped 的 Delete 才是真的 DELETE（物理删除）
```

为什么要软删除？数据可恢复、可审计（"这个人注销前发过什么"），业务系统里大部分删除都应该是软删除。

**注意**：没有 `DeletedAt` 字段的模型（比如中间表 `user_roles`），`Delete` 就是物理删除。

---

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| 字段没更新，也没有报错 | struct `Updates` 忽略零值 | 用 map，或 `Select` 指定列 |
| 报 `WHERE conditions required` | 无条件的全局更新/删除被安全保护拦截 | 加 `Where`，或显式 `AllowGlobalUpdate` |
| 计数并发下越加越少 | 先 `First` 读出来，内存里 +1 再写回 | 用 `gorm.Expr("col + ?", 1)` 让数据库算 |
| 数据"删不掉"，查还在 | 表里有 `DeletedAt`，`Delete` 是软删除 | 查询自动过滤是特性；真删用 `Unscoped().Delete` |
| 误删数据无法恢复 | 用了物理删除 | 业务删除尽量软删除，`Unscoped` 留给运维清理 |

---

## 练习

1. 实现"封禁用户"：把用户 `status` 改为 2，**同时**清空昵称（昵称要真的写成空字符串）。
2. 实现"注销用户"（软删除）和"彻底清除"（物理删除）两个函数。
3. 给用户加 `LoginCount int` 字段并迁移，写一个 `Login(user *model.User)` 函数每次让计数 +1，不用先查后写。

<details>
<summary>点击查看答案</summary>

**1.** 清空昵称就是写零值 `""`，struct `Updates` 会丢掉它，用 map：

```go
db.DB.Model(&user).Updates(map[string]interface{}{
    "status":   2,
    "nickname": "",
})
```

**2.**

```go
// 注销：软删除（有 DeletedAt 字段，自动生效）
func Deactivate(id uint) error {
    return db.DB.Delete(&model.User{}, id).Error
}

// 彻底清除：物理删除
func Destroy(id uint) error {
    var u model.User
    if err := db.DB.Unscoped().First(&u, id).Error; err != nil {
        return err
    }
    return db.DB.Unscoped().Delete(&u).Error
}
```

**3.**

```go
func Login(u *model.User) error {
    return db.DB.Model(u).Update("login_count", gorm.Expr("login_count + ?", 1)).Error
}
```

</details>

## 本节小结

- `Update` 改单字段、`Updates` 改多字段、`Save` 全字段、`UpdateColumn` 不刷时间
- **零值更新坑**：struct `Updates` 丢零值——多字段更新用 map，或 `Select` 指定列
- 自增/递减这类并发计数交给 `gorm.Expr`，让数据库算
- 无条件的更新/删除会被 `ErrMissingWhereClause` 拦截
- 有 `DeletedAt` 字段就是软删除：`Delete` 变 UPDATE，查询自动过滤，`Unscoped` 看见真身

下一节：[7.6 事务](06-transaction.md)
