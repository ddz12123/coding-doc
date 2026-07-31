# 3.3 事务与 Lua 脚本

> 有时需要把多条命令"打包"执行，中间不被别的客户端插队。Redis 提供两种方式：**事务（MULTI/EXEC）和 Lua 脚本**。
> 预警：Redis 的"事务"和 MySQL 的事务差别很大，别被名字骗了。

## 1. Redis 事务的基本用法

三步走：`multi` 开启 → 排队命令 → `exec` 执行：

```
127.0.0.1:6379> multi
OK
127.0.0.1:6379(TX)> set account:A 80
QUEUED                                  # 注意：命令没有执行，只是入队
127.0.0.1:6379(TX)> set account:B 120
QUEUED
127.0.0.1:6379(TX)> exec                # 一次性按顺序执行队列里的所有命令
1) OK
2) OK
```

要点：

- `multi` 之后的命令**不会立即执行**，而是进入队列（返回 `QUEUED`）
- `exec` 时一次性顺序执行，**执行期间不会插入其他客户端的命令**
- 反悔用 `discard`，清空队列放弃事务

## 2. 重点：Redis 事务"不保证原子性"

MySQL 事务出错会整体回滚，Redis **不会**。分两种情况：

### 情况一：入队时就报错（语法错误）→ 整个事务不执行

```
127.0.0.1:6379> multi
OK
127.0.0.1:6379(TX)> set k1 v1
QUEUED
127.0.0.1:6379(TX)> hello-world          # 不存在的命令
(error) ERR unknown command
127.0.0.1:6379(TX)> exec
(error) EXECABORT Transaction discarded because of previous errors.
# k1 没有被设置 —— 全部作废 ✓
```

### 情况二：执行时才报错（运行时错误）→ 出错的跳过，**其余照常执行，不回滚！**

```
127.0.0.1:6379> multi
OK
127.0.0.1:6379(TX)> set k1 v1
QUEUED
127.0.0.1:6379(TX)> incr k1              # 对字符串 incr，执行时才会报错
QUEUED
127.0.0.1:6379(TX)> set k2 v2
QUEUED
127.0.0.1:6379(TX)> exec
1) OK
2) (error) ERR value is not an integer or out of range
3) OK                                     # k2 依然设置成功了！没有回滚！
```

> 💡 面试标准答案：**Redis 事务保证隔离性（执行期间不被插队），但运行时错误不回滚，所以不保证严格的原子性。** 官方的态度是：命令用对了就不会有运行时错误，回滚机制没必要且影响性能。

## 3. WATCH：乐观锁（了解即可）

`watch` 可以监视 key，如果在 `exec` 之前这个 key 被**别的客户端改了**，事务就取消（`exec` 返回 nil）：

```
127.0.0.1:6379> watch stock          # 监视库存
OK
127.0.0.1:6379> multi
OK
127.0.0.1:6379(TX)> decr stock
QUEUED
127.0.0.1:6379(TX)> exec
(nil)      # ← 如果期间有人改过 stock，返回 nil，事务没执行，需要重试
```

这是一种"乐观锁"：先不加锁，提交时发现被人改过就放弃重来。实际开发中用得不多，因为有更好的方案——Lua 脚本。

## 4. Lua 脚本：真正的原子打包（实战主流）

Redis 内嵌了 Lua 解释器，可以把一段逻辑（含 if 判断！）作为脚本发给 Redis，**整个脚本作为一条命令原子执行**——这是事务做不到的：事务不能根据前一条命令的结果决定后一条做什么，Lua 可以。

### 体验一下

```
# eval 脚本 key个数 key... 参数...
127.0.0.1:6379> eval "return 'hello lua'" 0
"hello lua"

# 带 key 和参数：KEYS[1] 是第一个 key，ARGV[1] 是第一个参数
127.0.0.1:6379> eval "return redis.call('set', KEYS[1], ARGV[1])" 1 name lua-value
OK
127.0.0.1:6379> get name
"lua-value"
```

### 经典案例：库存扣减（防超卖）

需求：库存够就扣，不够就返回失败。"判断 + 扣减"必须是原子的，否则高并发下会超卖：

```lua
-- 脚本逻辑
local stock = tonumber(redis.call('get', KEYS[1]))
if stock and stock >= tonumber(ARGV[1]) then
    return redis.call('decrby', KEYS[1], ARGV[1])
else
    return -1
end
```

在 redis-cli 里执行（压成一行）：

```
127.0.0.1:6379> set stock 10
OK
127.0.0.1:6379> eval "local s = tonumber(redis.call('get', KEYS[1])) if s and s >= tonumber(ARGV[1]) then return redis.call('decrby', KEYS[1], ARGV[1]) else return -1 end" 1 stock 3
(integer) 7          # 扣减成功，剩 7

127.0.0.1:6379> eval "local s = tonumber(redis.call('get', KEYS[1])) if s and s >= tonumber(ARGV[1]) then return redis.call('decrby', KEYS[1], ARGV[1]) else return -1 end" 1 stock 100
(integer) -1         # 库存不足，拒绝
```

无论多少个客户端并发执行这个脚本，Redis 都一个一个排队跑，**绝不会超卖**。

> 💡 实战中，分布式锁的"安全释放锁"、限流器等都靠 Lua 实现。你不需要精通 Lua 语言，会套这个模板就能应付 90% 的场景。

> ⚠️ 脚本执行期间会阻塞整个 Redis，所以 Lua 脚本必须**短小精悍**，禁止写循环跑大量数据。

## 5. 事务 vs Lua 怎么选

| | 事务 MULTI/EXEC | Lua 脚本 |
|---|---|---|
| 原子性 | 弱（运行时错误不回滚） | 强（整体一条命令） |
| 能否有条件逻辑（if） | ❌ 不能 | ✅ 能 |
| 实战使用频率 | 低 | 高 ⭐ |

**结论：需要打包多条命令时，实战中优先考虑 Lua 脚本。** 事务主要作为知识点了解（面试爱考"Redis 事务会回滚吗"）。

## 6. 动手练习

1. 用事务打包两条 `set`，正常执行一次
2. 复现"运行时错误不回滚"：事务里放一条 `incr 一个字符串key`，观察其他命令照常生效
3. 把库存扣减 Lua 脚本跑一遍，分别测试"库存够"和"库存不够"两种情况

---

下一章：Redis 的广播功能 👉 [3.4 发布订阅（Pub/Sub）](04-发布订阅.md)
