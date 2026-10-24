# 2.1 Engine：数据库连接的起点

> Engine 是 SQLAlchemy 与数据库之间的"总闸门"。本节讲清楚：连接字符串怎么写、Engine 该怎么用、连接池是什么。

## 一、创建 Engine

```python
from sqlalchemy import create_engine

engine = create_engine("sqlite:///app.db", echo=True)
```

`create_engine()` 接收一个**连接字符串（URL）**，返回一个 `Engine` 对象。

重要特性：**创建 Engine 时并不会真的连接数据库**（惰性连接）。第一次执行 SQL 时才会真正建立连接。

## 二、连接字符串详解

通用格式：

```
方言+驱动://用户名:密码@主机:端口/数据库名
dialect+driver://username:password@host:port/database
```

### 常用数据库写法对照

```python
# ---------- SQLite（文件型，无需账号密码） ----------
# 相对路径：当前目录下的 app.db（注意是三个斜杠）
create_engine("sqlite:///app.db")

# 绝对路径（Windows，三个斜杠后接盘符路径）
create_engine("sqlite:///D:/data/app.db")

# 内存数据库：程序退出即消失，适合测试
create_engine("sqlite:///:memory:")

# ---------- MySQL（需要 pip install pymysql） ----------
create_engine("mysql+pymysql://root:mypassword@localhost:3306/mydb?charset=utf8mb4")

# ---------- PostgreSQL（需要 pip install psycopg2-binary） ----------
create_engine("postgresql+psycopg2://postgres:mypassword@localhost:5432/mydb")
```

> ⚠️ **密码含特殊字符怎么办？** 如果密码里有 `@`、`#`、`/` 等字符，需要 URL 编码：
> ```python
> from urllib.parse import quote_plus
> password = quote_plus("p@ss#word")
> engine = create_engine(f"mysql+pymysql://root:{password}@localhost/mydb")
> ```

## 三、create_engine 的常用参数

```python
engine = create_engine(
    "sqlite:///app.db",
    echo=True,           # 打印所有执行的 SQL（生产环境务必关掉）
    pool_size=5,         # 连接池常驻连接数（SQLite 不需要，MySQL/PG 有用）
    max_overflow=10,     # 高峰期最多额外多开的连接数
    pool_recycle=3600,   # 连接使用多久后强制回收（秒），防止 MySQL "8小时断连"问题
    pool_pre_ping=True,  # 每次取连接前先测试是否可用，自动剔除失效连接（推荐开启）
)
```

新手阶段只需要记住 `echo=True`；连接池参数在部署 MySQL/PostgreSQL 项目时再回来查。

## 四、连接池：Engine 的核心价值

建立一个数据库连接是"昂贵"的操作（TCP 握手、认证等要花几十毫秒）。如果每次查询都新建连接、用完关闭，性能会很差。

Engine 内置了**连接池（Connection Pool）**：

```mermaid
flowchart LR
    sa[session A] -->|借| pool
    sb[session B] -->|借| pool
    sc[session C] -->|还| pool
    subgraph pool["Engine 连接池"]
        c1[连接1]
        c2[连接2]
        c3[连接3]
        c4[连接4]
    end
    pool --> db[(数据库)]
```

- 连接用完不销毁，而是**归还池子**，下次直接复用
- 这就是为什么**整个应用只需要一个 Engine**——它是全局共享的资源管理者

> 📌 **黄金法则：一个应用（一个数据库）只创建一个 Engine，模块级全局变量即可。** 不要在函数里反复调用 `create_engine`。

## 五、用 Engine 直接执行 SQL（Core 方式）

虽然日常用 ORM，但有时需要直接跑一句原生 SQL（比如复杂报表、性能调优）。用 `text()` 包裹：

```python
from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///app.db")

with engine.connect() as conn:
    result = conn.execute(text("SELECT id, name FROM users WHERE age > :min_age"),
                          {"min_age": 18})
    for row in result:
        print(row.id, row.name)   # 可以按属性名访问
```

要点：

1. **必须用 `text()` 包裹 SQL 字符串**，直接传字符串会报错
2. **参数用 `:名字` 占位，值用字典传**——永远不要用 f-string 拼 SQL（SQL 注入风险！）

```python
# ❌ 危险！SQL 注入漏洞
conn.execute(text(f"SELECT * FROM users WHERE name = '{user_input}'"))

# ✅ 安全：参数化查询
conn.execute(text("SELECT * FROM users WHERE name = :name"), {"name": user_input})
```

3. 写操作需要提交：

```python
with engine.begin() as conn:    # engine.begin() 结束时自动 commit
    conn.execute(text("UPDATE users SET age = age + 1"))
```

## 六、connect() vs begin() 的区别

| 写法 | 行为 |
|------|------|
| `with engine.connect() as conn:` | 结束时**回滚**未提交的更改（需手动 `conn.commit()`） |
| `with engine.begin() as conn:` | 结束时**自动提交**（出异常则回滚） |

只读查询用 `connect()`，写操作图省事用 `begin()`。

> 💡 不过别急着记这个——进入 ORM 世界后，你 95% 的时间面对的是 **Session** 而不是 Connection。这里了解即可。

## 七、验证连接是否正常的小技巧

部署时想快速确认数据库连得上：

```python
from sqlalchemy import text

try:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    print("✅ 数据库连接正常")
except Exception as e:
    print(f"❌ 连接失败: {e}")
```

## 八、练习

### 练习 1：手写 MySQL 连接字符串（动手）

需求：连接 MySQL（pymysql 驱动），用户名 `root`，密码 `p@ss`（注意里面有 `@`），主机 `localhost`，端口 `3306`，库名 `shop`。请写出能正确创建 Engine 的代码。

<details><summary>参考答案</summary>

密码里的 `@` 和 URL 中"密码@主机"的分隔符撞车了，必须先用 `quote_plus` 编码：

```python
from urllib.parse import quote_plus

from sqlalchemy import create_engine

password = quote_plus("p@ss")
print(password)   # p%40ss —— @ 被编码成 %40

engine = create_engine(f"mysql+pymysql://root:{password}@localhost:3306/shop?charset=utf8mb4")
```

最终生效的连接字符串：

```
mysql+pymysql://root:p%40ss@localhost:3306/shop?charset=utf8mb4
```

如果直接把 `p@ss` 写进 URL，SQLAlchemy 会把第一个 `@` 当作"用户信息@主机"的分隔符，解析出错（把 `p` 当密码、`ss` 当主机名……），连接必然失败。

</details>

### 练习 2：text() 参数化查询（动手）

用 `engine.connect()` + `text()` 查出 `age > 20` 的用户并逐行打印。要求：SQL 里不许出现写死的 20，也不许用 f-string。

<details><summary>参考答案</summary>

```python
from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///:memory:")

# 先造表、造数据（列表里放多个字典 = executemany 批量插入）
with engine.begin() as conn:
    conn.execute(text("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            age INTEGER NOT NULL
        )
    """))
    conn.execute(
        text("INSERT INTO users (name, age) VALUES (:name, :age)"),
        [
            {"name": "张三", "age": 25},
            {"name": "李四", "age": 30},
            {"name": "王五", "age": 17},
        ],
    )

# 参数化查询：占位符 :min_age，值放字典里
with engine.connect() as conn:
    result = conn.execute(
        text("SELECT id, name, age FROM users WHERE age > :min_age"),
        {"min_age": 20},
    )
    for row in result:
        print(row.id, row.name, row.age)
```

预期输出（17 岁的王五被过滤）：

```
1 张三 25
2 李四 30
```

要点：占位符 `:名字` + 字典传值，SQLAlchemy 会把 20 作为**参数**安全地发给数据库，而不是拼进 SQL 文本。

</details>

### 练习 3：为什么严禁 f-string 拼 SQL？（说理）

两种写法查的都是"名字等于用户输入"的用户，而用户输入是恶意字符串 `"' OR '1'='1"`。先预测两种写法各返回几行，再看答案。

<details><summary>参考答案</summary>

```python
from sqlalchemy import create_engine, text

engine = create_engine("sqlite:///:memory:")

with engine.begin() as conn:
    conn.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, name VARCHAR(50))"))
    conn.execute(
        text("INSERT INTO users (name) VALUES (:name)"),
        [{"name": "张三"}, {"name": "李四"}],
    )

user_input = "' OR '1'='1"   # 模拟恶意输入

with engine.connect() as conn:
    # ❌ f-string 拼接：输入变成了 SQL 语法的一部分
    bad = conn.execute(text(f"SELECT * FROM users WHERE name = '{user_input}'")).all()
    print("拼接 SQL 返回行数:", len(bad))

    # ✅ 参数化：输入永远只是"数据"
    good = conn.execute(
        text("SELECT * FROM users WHERE name = :name"), {"name": user_input}
    ).all()
    print("参数化查询返回行数:", len(good))
```

预期输出：

```
拼接 SQL 返回行数: 2
参数化查询返回行数: 0
```

原因：拼接后的 SQL 文本变成了

```sql
SELECT * FROM users WHERE name = '' OR '1'='1'
```

`'1'='1'` 恒真，WHERE 条件形同虚设，全表数据被泄露——这就是 **SQL 注入**。更恶意的输入甚至可以拼出删库语句。参数化查询把输入当成纯数据传给数据库，永远不会被当作 SQL 执行，所以老实返回 0 行（库里没人叫这个名字）。

</details>

## 📝 本节小结

| 要点 | 说明 |
|------|------|
| Engine 是什么 | 数据库连接的工厂 + 连接池管理者 |
| 创建几个 | 一个数据库一个，全局唯一 |
| 连接字符串 | `方言+驱动://用户:密码@主机:端口/库名`，SQLite 是 `sqlite:///文件路径` |
| echo=True | 学习/调试神器，打印真实 SQL |
| 原生 SQL | 用 `text()` 包裹 + 参数化，严禁 f-string 拼接 |
| 惰性连接 | create_engine 不连库，首次执行 SQL 才连 |

下一节，用类描述表结构 → [2.2 定义模型：把 Python 类变成数据表](02-定义模型.md)
