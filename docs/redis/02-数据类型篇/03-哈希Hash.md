# 2.3 哈希 Hash

> Hash 让一个 key 里面能存"一组字段"，就像编程语言里的对象 / Map / 字典。

## 1. Hash 是什么

结构长这样：

```
key: user:1001
     ├── name  → "张三"
     ├── age   → "20"
     └── city  → "北京"
```

一个 key 内部包含多个 **field → value** 对。对比 String 存 JSON：

| | String + JSON | Hash |
|---|---|---|
| 存储形式 | 整个对象序列化成一个字符串 | 每个字段独立存储 |
| 改一个字段 | 取出整个 JSON → 反序列化 → 改 → 序列化 → 存回 | 一条命令直接改（`hset`） |
| 读一个字段 | 必须取出整个 JSON | 可以只取需要的字段（`hget`） |
| 适合场景 | 整存整取、字段不常单独改 | 字段经常单独读写（如库存、积分） |

## 2. 基础操作

Hash 的命令都以 `h` 开头：

```
# 存字段（可以一次存多个）
127.0.0.1:6379> hset user:1001 name "张三" age 20 city "北京"
(integer) 3

# 取单个字段
127.0.0.1:6379> hget user:1001 name
"张三"

# 取多个字段
127.0.0.1:6379> hmget user:1001 name age
1) "张三"
2) "20"

# 取全部字段（字段名和值交替返回）
127.0.0.1:6379> hgetall user:1001
1) "name"
2) "张三"
3) "age"
4) "20"
5) "city"
6) "北京"

# 修改就是再 hset 一次（覆盖）
127.0.0.1:6379> hset user:1001 city "上海"
(integer) 0        # 返回 0 表示字段已存在、是覆盖；1 表示新建了字段
```

## 3. 更多常用命令

```
# 删除字段
127.0.0.1:6379> hdel user:1001 city
(integer) 1

# 判断字段是否存在
127.0.0.1:6379> hexists user:1001 name
(integer) 1

# 字段数量
127.0.0.1:6379> hlen user:1001
(integer) 2

# 只取所有字段名 / 只取所有值
127.0.0.1:6379> hkeys user:1001
1) "name"
2) "age"
127.0.0.1:6379> hvals user:1001
1) "张三"
2) "20"

# 字段值自增（和 String 的 incrby 一样是原子的）
127.0.0.1:6379> hincrby user:1001 age 1
(integer) 21
```

> ⚠️ 注意：过期时间只能设置在**整个 key** 上（`expire user:1001 3600`），不能给单个 field 设置过期（Redis 7.4 之后才支持 field 级过期，新手可先忽略）。

## 4. 典型应用场景

### 场景一：存储对象（字段需要单独更新时）

购物车是经典例子——`field` 是商品 ID，`value` 是数量：

```
# 用户 1001 的购物车
127.0.0.1:6379> hset cart:1001 product:100 2 product:205 1
(integer) 2

# 商品 100 数量 +1
127.0.0.1:6379> hincrby cart:1001 product:100 1
(integer) 3

# 删除某个商品
127.0.0.1:6379> hdel cart:1001 product:205
(integer) 1

# 查看整个购物车
127.0.0.1:6379> hgetall cart:1001
1) "product:100"
2) "3"

# 购物车商品种类数
127.0.0.1:6379> hlen cart:1001
(integer) 1
```

### 场景二：统计一组相关计数

比如一篇文章的多维度计数放在一个 key 里，比散落成多个 String key 更整洁：

```
hincrby article:55:stats views 1     # 阅读 +1
hincrby article:55:stats likes 1     # 点赞 +1
hincrby article:55:stats shares 1    # 分享 +1
hgetall article:55:stats             # 一次取出全部统计
```

## 5. String + JSON 还是 Hash？怎么选

新手常见纠结，给你一个简单的判断标准：

- **整存整取、不改单个字段** → String + JSON（如缓存一个商品详情页数据）
- **字段需要频繁单独读写、需要原子增减** → Hash（如购物车、账户余额、统计数据）
- 对象嵌套很深（对象里还有数组和对象）→ String + JSON（Hash 的 value 只能是字符串，存不了嵌套结构）

## 6. 动手练习

1. 用 Hash 建一个 `student:1`，包含 `name=李雷`、`score=90`、`class=三班`
2. 把 score 加 5 分（用一条原子命令）
3. 删掉 class 字段，再用 `hgetall` 查看结果
4. 建一个自己的购物车 `cart:me`，加两件商品，修改数量，再整个查看

## 7. 小结

| 命令 | 作用 |
|------|------|
| `hset key field value [field value ...]` | 存字段 |
| `hget` / `hmget` / `hgetall` | 取字段 |
| `hdel` / `hexists` / `hlen` | 删 / 判断 / 计数 |
| `hkeys` / `hvals` | 所有字段名 / 所有值 |
| `hincrby` | 字段原子加减 |

**记住 Hash 的定位：需要单独读写字段的"对象"，典型代表是购物车。**

---

下一章：既能当队列又能当栈 👉 [2.4 列表 List](04-列表List.md)
