# 附录 B：常见问题 FAQ

> 收录新手最常遇到的问题，按"环境问题 → 使用问题 → 概念问题"排列。

## 环境与连接问题

### Q1：`Could not connect to Redis at 127.0.0.1:6379: Connection refused`

Redis 服务端没启动。检查：

```bash
# Linux
sudo systemctl status redis-server   # 查看状态 → systemctl start 启动
# Docker
docker ps -a                          # 容器是否在跑 → docker start my-redis
# macOS
brew services list
```

### Q2：连接报 `NOAUTH Authentication required`

Redis 设置了密码。连接时带上：`redis-cli -a 密码`，或连上后执行 `auth 密码`。

### Q3：本机能连，程序 / 其他机器连不上

按顺序排查四件事：

1. 配置文件 `bind 127.0.0.1` → 只允许本机，需改为 `bind 0.0.0.0`（⚠️ 必须同时设密码）
2. `protected-mode yes` 且无密码时会拒绝远程连接 → 设置 `requirepass`
3. 服务器防火墙 / 云安全组没放行 6379 端口
4. Docker 启动时忘了 `-p 6379:6379` 端口映射

### Q4：get 中文显示 `\xe4\xb8\xad` 乱码

不是乱码，是 redis-cli 的转义显示。用 `redis-cli --raw` 连接即可正常显示。代码里 Python 加 `decode_responses=True`。

### Q5：Windows 上怎么装 Redis？

官方不支持 Windows。推荐顺序：Docker > WSL2 > Memurai。详见[安装章节](../01-入门篇/02-安装与启动.md)。

## 使用问题

### Q6：key 明明存了，get 却返回 (nil)？

按概率排查：

1. **过期了**：`ttl key` 看看；注意不带 EX 的 set 会覆盖成永久，带 EX 的重新 set 才刷新时间
2. **库不对**：存的时候在 0 号库，查的时候 `select` 到别的库了？程序连接参数里的 `db` 是几？
3. **key 拼错**：大小写、多余空格、前缀不一致（`user:1` vs `user:01`）
4. **连的不是同一个 Redis**：本机跑了多个实例 / Docker 容器内外混淆

### Q7：为什么 `incr` 报错 `value is not an integer`？

这个 key 当前的值不是纯整数字符串（可能是 JSON、带引号、或小数）。`incr` 只能用于整数，小数用 `incrbyfloat`。

### Q8：数据重启后丢了？

没开持久化。检查 `config get appendonly`，为 no 则在配置文件加 `appendonly yes` 后重启。Docker 用户还要挂载数据卷：`-v redis-data:/data`。详见[持久化章节](../03-核心机制篇/02-持久化RDB与AOF.md)。

### Q9：Redis 内存一直涨，怎么清理？

1. 先找原因：`redis-cli --bigkeys` 找大 key；`info keyspace` 看 key 数量
2. 大概率是**大量 key 没设过期时间**——养成 set 带 EX 的习惯
3. 配置兜底：`maxmemory 2gb` + `maxmemory-policy allkeys-lru`
4. ⚠️ 不要在生产直接 `flushall`

### Q10：怎么查看 Redis 里所有的 key？有图形化工具吗？

学习环境 `keys *`，生产环境用 `scan`。图形化工具推荐：

- **RedisInsight**（官方出品，免费，功能全）
- Another Redis Desktop Manager（开源免费）

### Q11：一个 key 能存多大？集合能放多少元素？

String 最大 512MB；集合类型元素数量上限约 42 亿。但**实际使用远早于上限就该拆分了**：String 建议 <10KB，集合建议 <5000 成员，否则就是"大 key"，见[最佳实践](../05-进阶篇/04-性能优化与最佳实践.md)。

## 概念问题

### Q12：Redis 和 MySQL 到底什么关系？会互相替代吗？

不会。MySQL 是持久可靠的主存储（硬盘、SQL、强事务），Redis 是高速缓存层（内存、简单结构、极致性能）。标准架构是"MySQL 存全量 + Redis 挡流量"。Redis 虽有持久化，但定位不是替代关系型数据库。

### Q13：Redis 是单线程的，为什么还这么快？多核 CPU 不浪费吗？

快的原因：纯内存 + 无锁竞争 + IO 多路复用 + 高效数据结构。命令执行确实用不满多核，官方建议：一台多核机器上部署多个 Redis 实例来利用多核。Redis 6+ 的多线程只用于网络 IO 读写，执行命令仍是单线程。

### Q14：缓存和数据库的数据不一致怎么办？

入门答案：**先更新数据库，再删除缓存**，并给缓存设过期时间兜底（就算删失败，过期后也会自动修正）。完美的强一致做不到也没必要，缓存的哲学是"接受短暂不一致，换取性能"。

### Q15：Redis 的事务和 MySQL 的事务一样吗？

不一样，这是高频面试题。Redis 事务只保证"打包顺序执行、不被插队"，**运行时错误不回滚**。需要真正的原子逻辑用 Lua 脚本。详见[事务章节](../03-核心机制篇/03-事务与Lua脚本.md)。

### Q16：过期的 key 会立刻被删除吗？

不会。Redis 用"惰性删除（访问时检查）+ 定期删除（随机抽查）"两种策略，过期 key 可能短暂滞留内存，但你永远读不到它（读时会先判断过期）。

### Q17：Memcached 和 Redis 选哪个？

新项目无脑选 Redis：数据类型丰富、支持持久化、支持主从/集群、社区生态碾压。Memcached 只有简单 KV，是上一代产品。

### Q18：学完这套教程，算什么水平？下一步学什么?

达到"能在项目中正确使用 Redis + 应付大部分面试基础题"的水平。下一步方向见[学习资源推荐](03-学习资源推荐.md)：

- 深入原理：底层数据结构（SDS、跳表、listpack）、单线程事件循环
- 深入实战：Redisson、缓存一致性方案、多级缓存架构
- 源码：Redis 是公认代码质量极高的 C 项目
