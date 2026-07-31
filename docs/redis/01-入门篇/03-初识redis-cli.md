# 1.3 初识 redis-cli

> 本章目标：学会用 redis-cli 连接 Redis，掌握最基础的增删改查，理解 Redis 的 16 个数据库。
> **从这一章开始，请务必跟着动手敲命令！**

## 1. 连接 Redis

```bash
# 连接本机默认端口
redis-cli

# 完整写法：指定主机、端口、密码
redis-cli -h 127.0.0.1 -p 6379 -a yourpassword

# Docker 用户
docker exec -it my-redis redis-cli
```

连接成功后会看到提示符：

```
127.0.0.1:6379>
```

先来一条最简单的命令确认连接正常：

```
127.0.0.1:6379> ping
PONG
```

退出用 `quit` 或 `exit`，或直接 `Ctrl + C`。

## 2. 你的第一组命令：SET 和 GET

Redis 最核心的思想就是 **key-value**：按名字存，按名字取。

```
127.0.0.1:6379> set name zhangsan     # 存：把 "zhangsan" 存到 key "name" 里
OK

127.0.0.1:6379> get name              # 取：读取 key "name" 的值
"zhangsan"

127.0.0.1:6379> get age               # 取一个不存在的 key
(nil)                                  # nil 表示"没有这个 key"
```

三个要点：

- `set` 同一个 key 会**覆盖**旧值
- key 和 value 都区分大小写，`name` 和 `Name` 是两个不同的 key
- `(nil)` 是新手最常见的返回值，意思是"不存在"，不是报错

## 3. 常用基础命令

跟着敲一遍：

```
# 查看所有 key（学习环境用，生产环境禁用，后面解释）
127.0.0.1:6379> keys *
1) "name"

# 判断 key 是否存在（1 存在，0 不存在）
127.0.0.1:6379> exists name
(integer) 1

# 删除 key（返回删除的个数）
127.0.0.1:6379> del name
(integer) 1

# 再取就没有了
127.0.0.1:6379> get name
(nil)

# 查看 key 存的是什么类型
127.0.0.1:6379> set greeting hello
OK
127.0.0.1:6379> type greeting
string
```

> ⚠️ 为什么生产环境禁用 `keys *`？因为 Redis 是单线程的，`keys *` 会遍历所有 key。如果线上有几千万个 key，这条命令执行期间**所有其他请求都会被卡住**，可能引发线上事故。学习时随便用，工作中用 `scan` 代替（附录速查表里有）。

## 4. Redis 的 16 个数据库

Redis 默认自带 16 个逻辑数据库，编号 0~15，默认使用 0 号。可以理解为 16 个互相隔离的抽屉：

```
127.0.0.1:6379> select 1        # 切换到 1 号库
OK
127.0.0.1:6379[1]> get greeting  # 提示符出现 [1]，1 号库里没有这个 key
(nil)
127.0.0.1:6379[1]> select 0     # 切回 0 号库
OK
127.0.0.1:6379> get greeting
"hello"
```

相关命令：

```
dbsize        # 当前库有多少个 key
flushdb       # ⚠️ 清空当前库（危险！）
flushall      # ⚠️⚠️ 清空所有 16 个库（更危险！）
```

> 💡 实际工作中很少用多数据库功能（Redis 集群模式甚至只支持 0 号库），不同业务一般靠 **key 的命名前缀** 来区分（下一部分会讲）。知道有这个概念即可。

## 5. redis-cli 的实用技巧

### 帮助命令

忘了命令怎么用？不用退出去查文档：

```
127.0.0.1:6379> help set

  SET key value [NX | XX] [GET] [EX seconds | PX milliseconds ...]
  summary: Set the string value of a key
  since: 1.0.0
```

还可以按类型浏览：`help @string`、`help @list`、`help @hash` 等。

### 不进入交互模式，直接执行命令

```bash
redis-cli set name zhangsan
redis-cli get name
```

适合写脚本时使用。

### 中文乱码问题

存中文后 `get` 出来是 `\xe4\xb8\xad...` 这样的转义？连接时加 `--raw` 参数即可：

```bash
redis-cli --raw
```

### 查看服务器信息

```
127.0.0.1:6379> info server      # 版本、运行时间等
127.0.0.1:6379> info memory      # 内存使用情况
```

## 6. 动手练习

用刚学的命令完成下面的小任务（答案就在本章内容里）：

1. 存三个 key：`user:1:name = 小明`、`user:2:name = 小红`、`user:3:name = 小刚`
2. 用 `keys user:*` 查出这三个 key
3. 判断 `user:4:name` 是否存在
4. 删除 `user:3:name`
5. 用 `dbsize` 确认当前库还剩几个 key

## 7. 小结

| 命令 | 作用 |
|------|------|
| `set key value` | 存 |
| `get key` | 取 |
| `del key` | 删 |
| `exists key` | 是否存在 |
| `type key` | 查看类型 |
| `keys *` | 列出所有 key（仅限学习环境） |
| `select n` | 切换数据库 |
| `help 命令名` | 查看命令帮助 |

---

入门篇完成！接下来进入 Redis 的核心——数据类型 👉 [2.1 通用命令与 Key 设计](../02-数据类型篇/01-通用命令与Key设计.md)
