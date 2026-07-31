# 2.2 字符串 String

> String 是 Redis 最基础、使用率最高的类型。本章学完你就能实现：缓存、计数器、验证码、分布式锁的雏形。

## 1. String 是什么

String 就是"一个 key 对应一个值"，值可以是：

- 普通文本：`"hello"`、`"张三"`
- 数字：`"100"`（本质也是字符串，但 Redis 能识别并对它做加减）
- JSON 字符串：`'{"name":"张三","age":20}'`（缓存对象的常用方式）
- 甚至二进制数据（如图片字节），单个 value 最大 512MB

## 2. 基础操作

```
# 存 / 取 / 覆盖
127.0.0.1:6379> set nickname "小明"
OK
127.0.0.1:6379> get nickname
"小明"
127.0.0.1:6379> set nickname "大明"     # 直接覆盖
OK

# 一次存多个、取多个（m = multi）
127.0.0.1:6379> mset k1 v1 k2 v2 k3 v3
OK
127.0.0.1:6379> mget k1 k2 k3
1) "v1"
2) "v2"
3) "v3"

# 追加内容，返回追加后的长度
127.0.0.1:6379> append nickname "同学"
(integer) 12
127.0.0.1:6379> get nickname
"大明同学"

# 获取长度（字节数，一个中文占 3 字节）
127.0.0.1:6379> strlen nickname
(integer) 12
```

## 3. 数字自增自减（计数器的核心）

当 value 是整数时，可以直接做加减：

```
127.0.0.1:6379> set views 0
OK
127.0.0.1:6379> incr views          # +1，返回新值
(integer) 1
127.0.0.1:6379> incr views
(integer) 2
127.0.0.1:6379> incrby views 10     # +10
(integer) 12
127.0.0.1:6379> decr views          # -1
(integer) 11
127.0.0.1:6379> decrby views 5      # -5
(integer) 6
```

两个关键点：

1. **`incr` 是原子操作**。1000 个用户同时点赞，最终一定精确地 +1000，不会因为并发少算。这是 Redis 单线程模型送给我们的免费保障——如果你自己写"先 get，加 1，再 set"，并发下就会算错。
2. 对不存在的 key 执行 `incr`，Redis 会把它当 0 处理，直接返回 1。所以计数器不需要初始化。

```
# 对非数字执行 incr 会报错
127.0.0.1:6379> set name "abc"
OK
127.0.0.1:6379> incr name
(error) ERR value is not an integer or out of range
```

小数用 `incrbyfloat`：

```
127.0.0.1:6379> set price 9.9
OK
127.0.0.1:6379> incrbyfloat price 0.6
"10.5"
```

## 4. SET 的高级参数（重要）

`set` 命令自带几个非常实用的选项：

```
# EX：存的同时设置过期时间（秒）
127.0.0.1:6379> set sms:code:138xxxx8000 6666 EX 60
OK

# NX：只有 key 不存在时才能设置成功（Not eXists）
127.0.0.1:6379> set lock:order:1001 "server-A" NX
OK                       # 第一次：成功
127.0.0.1:6379> set lock:order:1001 "server-B" NX
(nil)                    # 第二次：失败，因为 key 已存在

# XX：只有 key 已存在时才设置（用于"只更新，不新建"）
127.0.0.1:6379> set notexist "v" XX
(nil)
```

> 💡 `SET key value NX EX 30` 这个组合就是**分布式锁**的基本实现：谁先设置成功谁拿到锁，30 秒后自动释放防止死锁。实战篇会详细展开。

## 5. 典型应用场景

### 场景一：缓存对象（最常用）

把数据库查出来的对象转成 JSON 存进去：

```
127.0.0.1:6379> set user:1001 '{"id":1001,"name":"张三","vip":true}' EX 3600
OK
127.0.0.1:6379> get user:1001
"{\"id\":1001,\"name\":\"张三\",\"vip\":true}"
```

代码里取出来再反序列化成对象。设置 1 小时过期，保证数据不会永远陈旧。

### 场景二：计数器

```
incr article:55:views          # 文章阅读量 +1
incrby account:1001:gold 100   # 账户金币 +100
```

### 场景三：手机验证码

```
# 发送验证码时：存 5 分钟
set sms:code:13800138000 482913 EX 300

# 用户提交时：取出比对
get sms:code:13800138000

# 验证通过后：立即删除，防止重复使用
del sms:code:13800138000
```

### 场景四：限流（简易版）

限制某接口每个用户每分钟最多请求 10 次：

```
incr rate:api:user:1001          # 每次请求 +1
expire rate:api:user:1001 60     # 第一次请求时设置 60 秒过期
# 代码里判断：返回值 > 10 则拒绝请求
```

## 6. 动手练习

1. 模拟文章阅读量：创建 `article:1:views`，连续 `incr` 三次，确认值为 3
2. 模拟验证码：一条命令存入 `sms:code:test = 1234`，有效期 120 秒，然后用 `ttl` 验证
3. 模拟抢锁：连续两次执行 `set my:lock A NX`，观察第二次为什么失败
4. 思考：为什么"get 出来加 1 再 set 回去"在并发下会出错，而 `incr` 不会？

## 7. 小结

| 命令 | 作用 |
|------|------|
| `set` / `get` / `mset` / `mget` | 基本存取 |
| `set key value EX 秒 NX` | 带过期 + 不存在才设置 |
| `incr` / `decr` / `incrby` / `decrby` | 原子加减 |
| `append` / `strlen` | 追加 / 长度 |

**记住 String 的两大王牌场景：JSON 缓存 + 原子计数器。**

---

下一章：像存对象一样存数据 👉 [2.3 哈希 Hash](03-哈希Hash.md)
