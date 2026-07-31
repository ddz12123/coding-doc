# 01 用代码操作 Redis

> 命令行只是学习工具，真实项目都是用代码连接 Redis。本章给出 Python、Node.js、Java 三种语言的入门示例，**挑你熟悉的那个看就行**。

## 0. 通用套路

不管什么语言，操作 Redis 都是四步：

1. 安装客户端库
2. 创建连接（指定 host、port、密码）
3. 调用与 Redis 命令同名的方法（`set` 命令 → `set()` 方法）
4. 生产环境使用连接池（库一般默认帮你管理）

由于方法名和命令名几乎一一对应，**你在命令行学的所有命令都能直接迁移到代码里**。

## 1. Python（redis-py）

```bash
pip install redis
```

```python
import redis

# decode_responses=True：返回 str 而不是 bytes（强烈建议加上）
r = redis.Redis(host="127.0.0.1", port=6379, db=0,
                password=None, decode_responses=True)

# ---- String ----
r.set("user:1:name", "张三", ex=3600)     # ex = 过期秒数
print(r.get("user:1:name"))               # 张三
r.incr("article:1:views")                 # 计数器 +1

# ---- Hash ----
r.hset("cart:1", mapping={"product:100": 2, "product:205": 1})
print(r.hgetall("cart:1"))                # {'product:100': '2', 'product:205': '1'}

# ---- List ----
r.lpush("queue", "task1")
print(r.rpop("queue"))                    # task1

# ---- Set ----
r.sadd("article:1:likes", 1001, 1002)
print(r.scard("article:1:likes"))         # 2

# ---- ZSet ----
r.zadd("rank", {"小明": 920, "小红": 990})
print(r.zrevrange("rank", 0, 9, withscores=True))  # [('小红', 990.0), ('小明', 920.0)]
```

缓存的经典写法（Cache-Aside 模式）：

```python
import json

def get_user(user_id):
    key = f"user:{user_id}"
    cached = r.get(key)
    if cached:                            # 1. 先查缓存
        return json.loads(cached)
    user = query_db(user_id)              # 2. 缓存没有，查数据库
    if user:
        r.set(key, json.dumps(user), ex=3600)  # 3. 写回缓存
    return user
```

## 2. Node.js（ioredis）

```bash
npm install ioredis
```

```javascript
const Redis = require("ioredis");
const redis = new Redis({ host: "127.0.0.1", port: 6379 });

async function main() {
  // ---- String ----
  await redis.set("user:1:name", "张三", "EX", 3600);
  console.log(await redis.get("user:1:name"));        // 张三
  await redis.incr("article:1:views");

  // ---- Hash ----
  await redis.hset("cart:1", "product:100", 2);
  console.log(await redis.hgetall("cart:1"));         // { 'product:100': '2' }

  // ---- List ----
  await redis.lpush("queue", "task1");
  console.log(await redis.rpop("queue"));             // task1

  // ---- ZSet ----
  await redis.zadd("rank", 920, "小明", 990, "小红");
  console.log(await redis.zrevrange("rank", 0, 9, "WITHSCORES"));
}

main().finally(() => redis.quit());
```

> 💡 Node 生态两个主流库：`ioredis` 和官方的 `node-redis`（包名 `redis`）。新手用哪个都行，示例以 ioredis 为准。所有方法都返回 Promise，记得 `await`。

## 3. Java（Spring Boot + Spring Data Redis）

Java 项目基本都用 Spring Boot，直接上最常见的用法：

**pom.xml：**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

**application.yml：**

```yaml
spring:
  data:
    redis:
      host: 127.0.0.1
      port: 6379
```

**使用 StringRedisTemplate：**

```java
@Service
public class DemoService {

    @Autowired
    private StringRedisTemplate redis;

    public void demo() {
        // ---- String ----
        redis.opsForValue().set("user:1:name", "张三", Duration.ofHours(1));
        String name = redis.opsForValue().get("user:1:name");
        redis.opsForValue().increment("article:1:views");   // 计数器

        // ---- Hash ----
        redis.opsForHash().put("cart:1", "product:100", "2");
        Map<Object, Object> cart = redis.opsForHash().entries("cart:1");

        // ---- List ----
        redis.opsForList().leftPush("queue", "task1");
        String task = redis.opsForList().rightPop("queue");

        // ---- ZSet ----
        redis.opsForZSet().incrementScore("rank", "小明", 50);
        Set<String> top10 = redis.opsForZSet().reverseRange("rank", 0, 9);
    }
}
```

对应关系：`opsForValue()` → String，`opsForHash()` → Hash，`opsForList()` → List，`opsForSet()` → Set，`opsForZSet()` → ZSet。

> 💡 存对象时建议：对象 → JSON 字符串 → 存入。取出时再反序列化。避免用 JDK 原生序列化（可读性差、跨语言不兼容）。

## 4. 新手常见坑

1. **忘记设过期时间**：代码里写缓存时永远问自己一句"这个 key 要不要过期"
2. **连接数爆炸**：不要每次请求都 new 一个连接，用连接池 / 全局单例（上面三个库默认都处理好了，别自己作）
3. **存中文乱码 / 拿到 bytes**：Python 记得 `decode_responses=True`
4. **本地能连服务器连不上**：检查 Redis 的 `bind` 配置、防火墙、密码，以及云服务器安全组

## 5. 动手练习

用你熟悉的语言实现一个"文章阅读量"小功能：

1. 写一个函数 `view(articleId)`：调用一次阅读量 +1，返回最新阅读量
2. 写一个函数 `top(n)`：用 ZSet 维护阅读排行榜，返回阅读量最高的 n 篇文章
3. 提示：`view` 里同时执行 `incr article:{id}:views` 和 `zincrby rank:articles 1 {id}`

---

下一章：把这些 API 组合成真实的业务场景 👉 [02 常见应用场景](02-常见应用场景.md)
