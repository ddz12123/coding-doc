# 7.6 事务：要么全成，要么全不干

> 本节目标：理解事务解决什么问题，掌握 GORM 推荐的闭包事务写法，会手动事务和 SavePoint。

## 一、为什么需要事务？

典型场景：新用户注册成功后，送他一个默认角色——共两步：

1. 往 `users` 插入用户 ✓
2. 往 `user_roles` 插入关联 ✗（比如唯一键冲突、连接断了）

没有事务的话，结果是一个"有用户、没角色"的脏数据。**事务（Transaction）** 保证一组操作要么**全部成功**，要么**全部回滚**，像从没发生过。

## 二、闭包事务（推荐写法）

```go
err := db.DB.Transaction(func(tx *gorm.DB) error {
    if err := tx.Create(&user).Error; err != nil { // 注意：用 tx，不是 DB
        return err                                 // 返回 error → 自动回滚
    }
    if err := tx.Model(&user).Association("Roles").Append(&roles).Error; err != nil {
        return err
    }
    return nil                                     // 返回 nil → 自动提交
})
if err != nil {
    log.Println("注册失败，已回滚：", err)
}
```

好处：提交、回滚都不用你管，闭包正常返回就提交，任何一处返回 error 就回滚，**不会忘记回滚**。

**核心规则：闭包内一律用 `tx`，绝不能混用全局 `DB`**——`DB` 不在这次事务里，用它执行的语句等于脱离了事务，回滚时回不掉它。⚠️

## 三、手动事务

需要跨函数传递事务、或控制粒度更细时，手动开：

```go
tx := db.DB.Begin()
defer func() {
    if r := recover(); r != nil {
        tx.Rollback() // panic 时也要回滚
    }
}()

if err := tx.Create(&user).Error; err != nil {
    tx.Rollback()
    return err
}
if err := tx.Model(&user).Association("Roles").Append(&roles).Error; err != nil {
    tx.Rollback()
    return err
}
return tx.Commit().Error // 成功才提交
```

模板记三点：`Begin` 拿 `tx`、失败路径全部 `Rollback`、成功才 `Commit`。新手闭包写法足够，手动版看懂别人的代码即可。

## 四、嵌套事务：SavePoint

一个长事务里，某段操作失败只想撤销这一段？用保存点：

```go
db.DB.Transaction(func(tx *gorm.DB) error {
    tx.Create(&user1) // 想保留的

    tx.SavePoint("sp1")
    if err := tx.Create(&user2).Error; err != nil {
        tx.RollbackTo("sp1") // 只回滚到存档点，user1 保留
    }

    tx.Create(&user3)
    return nil
})
```

类似游戏存档：`SavePoint` 存档，`RollbackTo` 读档，大事务回滚不到开头。

## 五、GORM 的默认事务

GORM 默认给**每个单独的写操作**包一层事务（保证单条语句的一致性）。这有一点性能损耗；如果你所有的写都显式包了事务，可以在全局关掉：

```go
db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
    SkipDefaultTransaction: true,
})
```

入门阶段保持默认就好，知道有这回事、排查性能问题时能想起来即可。

---

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| 回滚了，但有的数据还是写进去了 | 闭包里混用了全局 `DB` | 闭包内只用 `tx` |
| 事务结束后数据没生效 | 写了 `Rollback` 路径但漏了 `Commit`，或反之 | 闭包事务让框架管理，避免手写遗漏 |
| 事务里调外部 HTTP/发邮件，接口特别慢 | 外部调用被拖进了事务，数据库连接被长时间占用 | 事务只包数据库操作，外部调用放事务外 |
| 事务里 `DB` 和 `tx` 都能跑，以为没差别 | `DB` 走的是另一个连接，看不到未提交的 `tx` 数据 | 一条纪律：进了闭包只认 `tx` |

---

## 练习

1. 实现"注册用户"函数 `Register(username, password string) error`：在同一个事务里创建用户，并给用户关联名为 `member` 的默认角色（角色不存在就先创建）。任何一步失败整体回滚。
2. 思考题：下面的代码错在哪？

    ```go
    db.DB.Transaction(func(tx *gorm.DB) error {
        tx.Create(&user)
        db.DB.Create(&log) // 记一条日志
        return errors.New("rollback please")
    })
    ```

<details>
<summary>点击查看答案</summary>

**1.**

```go
func Register(username, password string) error {
    return db.DB.Transaction(func(tx *gorm.DB) error {
        user := model.User{Username: username, Password: password, Status: 1}
        if err := tx.Create(&user).Error; err != nil {
            return err
        }
        var role model.Role
        if err := tx.Where("name = ?", "member").FirstOrCreate(&role, model.Role{Name: "member"}).Error; err != nil {
            return err
        }
        return tx.Model(&user).Association("Roles").Append(&role).Error
    })
}
```

**2.** `db.DB.Create(&log)` 不在事务里：闭包返回 error 时，`user` 回滚了，但 `log` 已经在事务外提交、回不去了。应改成 `tx.Create(&log)`。

</details>

## 本节小结

- 事务 = 一组操作要么全提交、要么全回滚，解决"写一半失败"的脏数据问题
- 首选闭包 `DB.Transaction(func(tx) error {...})`：返回 nil 提交、返回 error 回滚
- **闭包内只用 `tx`，混用 `DB` 等于脱离事务**
- 手动事务：`Begin` / `Rollback` / `Commit`，失败路径别漏回滚
- `SavePoint`/`RollbackTo` 实现事务内部分回滚
- 事务里别做慢操作（HTTP、邮件），连接会被占死

下一节：[7.7 关联操作](07-associations.md)
