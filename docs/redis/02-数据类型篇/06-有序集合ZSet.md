# 2.6 有序集合 ZSet

> ZSet（Sorted Set）= Set 的去重 + 按分数自动排序。它是**排行榜**的标准答案，也是五大类型的最后一个。

## 1. ZSet 是什么

ZSet 里的每个元素（member）都绑定一个**分数（score）**，Redis 自动按分数从小到大排序：

```
key: rank:game
     ├── 小刚 → 850 分
     ├── 小明 → 920 分
     └── 小红 → 990 分
（Redis 内部始终按 score 排好序）
```

- member 不能重复（和 Set 一样），但 score 可以相同
- score 是一个双精度浮点数，可以更新，更新后自动重新排序

## 2. 基础操作

ZSet 命令以 `z` 开头：

```
# 添加元素：zadd key score member [score member ...]
127.0.0.1:6379> zadd rank 920 小明 990 小红 850 小刚
(integer) 3

# 按排名查看（从小到大），withscores 顺便显示分数
127.0.0.1:6379> zrange rank 0 -1 withscores
1) "小刚"
2) "850"
3) "小明"
4) "920"
5) "小红"
6) "990"

# 从大到小查看（排行榜通常用这个！rev = reverse）
127.0.0.1:6379> zrevrange rank 0 -1 withscores
1) "小红"
2) "990"
3) "小明"
4) "920"
5) "小刚"
6) "850"

# 查看某人的分数
127.0.0.1:6379> zscore rank 小明
"920"

# 查看某人的排名（从 0 开始计数！）
127.0.0.1:6379> zrevrank rank 小明
(integer) 1          # 从大到小排第 1，即第二名

# 给某人加分（原子操作，加完自动重排）
127.0.0.1:6379> zincrby rank 100 小刚
"950"

# 元素总数
127.0.0.1:6379> zcard rank
(integer) 3

# 删除元素
127.0.0.1:6379> zrem rank 小刚
(integer) 1
```

> ⚠️ 新手最容易踩的坑：**排名从 0 开始**。`zrevrank` 返回 0 表示第一名。展示给用户时记得 +1。

## 3. 按分数范围查询

除了按排名，还能按分数段筛选：

```
127.0.0.1:6379> zadd scores 55 张三 78 李四 92 王五 88 赵六
(integer) 4

# 分数在 60~90 之间的人（byscore 按分数查）
127.0.0.1:6379> zrangebyscore scores 60 90
1) "李四"
2) "赵六"

# 统计 80 分以上的人数（inf = 无穷大）
127.0.0.1:6379> zcount scores 80 +inf
(integer) 2

# 删除 60 分以下的
127.0.0.1:6379> zremrangebyscore scores 0 59
(integer) 1
```

区间默认是闭区间（包含边界），加 `(` 表示开区间：`zrangebyscore scores (60 90` 表示 60 < 分数 ≤ 90。

## 4. 典型应用场景

### 场景一：游戏 / 积分排行榜（招牌场景）

```
# 玩家得分就加分
zincrby rank:game 50 player:1001

# 展示 TOP 10
zrevrange rank:game 0 9 withscores

# 查我的排名和分数
zrevrank rank:game player:1001       # 排名（记得 +1）
zscore rank:game player:1001         # 分数
```

按天/周分榜？在 key 里带上日期即可：`rank:game:2026-07-26`、`rank:game:2026-W30`。

### 场景二：热搜榜

```
zincrby hot:search 1 "Redis教程"     # 每被搜索一次热度 +1
zrevrange hot:search 0 9 withscores  # 热搜 TOP 10
```

### 场景三：延迟队列（进阶思路，了解即可）

把"应执行的时间戳"当作 score 存入，消费者循环用 `zrangebyscore key 0 当前时间戳` 取出到期任务。这是很多延迟任务框架的底层原理。

### 场景四：滑动窗口限流（进阶思路，了解即可）

score 存请求时间戳，统计最近 60 秒内的请求数：`zcount key 当前时间-60s 当前时间`，超过阈值就限流。

## 5. 五大类型选型总结（重要）

学完五大类型，用一张表收尾：

| 需求 | 用什么 |
|------|--------|
| 缓存一段文本 / JSON、计数器 | String |
| 对象的字段需要单独读写（购物车） | Hash |
| 有序、可重复、队列 / 栈 / 最新列表 | List |
| 去重、判断存在、交并差集 | Set |
| 去重 + 按分数排序（排行榜） | ZSet |

## 6. 动手练习

1. 创建班级成绩榜 `rank:class`：塞入 5 个同学和分数
2. 查出前三名（从高到低，带分数）
3. 给最后一名加 30 分，观察排名变化
4. 查询 80~100 分的同学有几个
5. 查"你自己"的排名，思考展示时为什么要 +1

## 7. 小结

| 命令 | 作用 |
|------|------|
| `zadd key score member` | 添加 / 更新分数 |
| `zrevrange key 0 9 withscores` | 取 TOP 10 |
| `zscore` / `zrevrank` | 查分数 / 查排名 |
| `zincrby` | 原子加分 |
| `zrangebyscore` / `zcount` | 按分数段查 / 统计 |
| `zrem` / `zcard` | 删除 / 总数 |

**记住 ZSet 的招牌：排行榜三件套 `zincrby` + `zrevrange` + `zrevrank`。**

---

下一章：认识四个特殊用途的类型 👉 [2.7 其他数据类型概览](07-其他数据类型概览.md)
