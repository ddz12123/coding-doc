# 01 数据库与 ORM 入门

本章目标：搞懂数据库、SQL、ORM 这三个概念，以及它们之间的关系。纯概念章节，不用写代码。

## 1. 为什么需要数据库？

前面内存版 CRUD 有个致命问题：数据存在 Python 字典里，**服务一重启数据就没了**。真实项目的数据必须**持久化**保存，这就是数据库的职责。

数据库相比直接写文件的优势：高效查询（百万数据毫秒级检索）、并发安全（多人同时读写不乱）、事务保证（转账要么全成功要么全失败）。

## 2. 关系型数据库长什么样

最主流的是**关系型数据库**，数据组织成一张张**表（table）**，像 Excel：

**users 表**

| id | username | email | created_at |
|----|----------|-------|------------|
| 1 | xiaoming | xm@qq.com | 2026-01-01 |
| 2 | xiaohong | xh@qq.com | 2026-01-02 |

**posts 表**

| id | title | author_id |
|----|-------|-----------|
| 1 | 我的第一篇文章 | 1 |
| 2 | Python 学习笔记 | 1 |

术语对照：

- **表（table）**：一类数据的集合，如用户表、文章表
- **行（row）/ 记录**：一条数据，如一个用户
- **列（column）/ 字段**：一个属性，如 username
- **主键（primary key）**：唯一标识一行的字段，通常是自增的 `id`
- **外键（foreign key）**：指向另一张表主键的字段。`posts.author_id = 1` 表示这篇文章的作者是 users 表里 id 为 1 的用户——这就是「关系型」的含义

常见的关系型数据库：

| 数据库 | 特点 | 本教程 |
|--------|------|--------|
| SQLite | 零安装、一个文件就是一个数据库 | ✅ 教学主力 |
| MySQL | 最流行的开源数据库，国内公司主流 | 讲连接方法 |
| PostgreSQL | 功能最强的开源数据库，国外主流 | 讲连接方法 |

**教学用 SQLite 是完美选择**：不用装任何软件，代码和 MySQL/PostgreSQL 几乎完全一样（这正是 SQLAlchemy 的功劳），以后换数据库只改一行连接字符串。

## 3. SQL：操作数据库的语言

数据库不懂 Python，它只懂 **SQL**（Structured Query Language）。四个基本操作：

```sql
-- 查询（Read）
SELECT * FROM users WHERE age > 18;

-- 插入（Create）
INSERT INTO users (username, email) VALUES ('xiaoming', 'xm@qq.com');

-- 更新（Update）
UPDATE users SET email = 'new@qq.com' WHERE id = 1;

-- 删除（Delete）
DELETE FROM users WHERE id = 1;
```

这四类操作合称 **CRUD**（Create、Read、Update、Delete），后端开发 80% 的工作就是各种 CRUD。

> 你不需要精通 SQL 才能学本教程——ORM 会帮你生成 SQL。但建议了解基本语法，因为调试时经常要看 ORM 生成的 SQL 对不对。

## 4. ORM：用 Python 对象操作数据库

直接在 Python 里拼 SQL 字符串又丑又危险（SQL 注入漏洞）。**ORM**（Object Relational Mapping，对象关系映射）把两个世界对应起来：

| 数据库世界 | Python 世界 |
|-----------|-------------|
| 表 users | 类 `User` |
| 一行记录 | 一个对象 `user` |
| 一个字段 | 一个属性 `user.username` |

对比一下：

```python
# 不用 ORM：手写 SQL
cursor.execute(
    "INSERT INTO users (username, email) VALUES (?, ?)",
    ("xiaoming", "xm@qq.com"),
)

# 用 ORM（SQLAlchemy）
user = User(username="xiaoming", email="xm@qq.com")
db.add(user)
db.commit()
```

```python
# 不用 ORM
rows = cursor.execute("SELECT * FROM users WHERE age > ?", (18,)).fetchall()
name = rows[0][1]          # 用下标取字段，极易出错

# 用 ORM
users = db.scalars(select(User).where(User.age > 18)).all()
name = users[0].username   # 对象属性，编辑器有补全
```

ORM 的价值：

1. **不拼 SQL 字符串**，天然防注入
2. **面向对象**，代码可读、编辑器可补全
3. **跨数据库**：同一套代码，SQLite/MySQL/PostgreSQL 通用
4. **管理关系**：`post.author.username` 直接访问关联数据，不用手写 JOIN

代价是要学习 ORM 自己的 API——这正是接下来几章的内容。

## 5. SQLAlchemy 的两大组件

SQLAlchemy 分为两层，初学者容易被网上新旧教程混淆，这里说清楚：

- **Core**：底层，负责连接管理和 SQL 表达式构建
- **ORM**：高层，就是我们说的「类 ↔ 表」映射，构建在 Core 之上

我们主要学 ORM 层。另外注意**版本**：SQLAlchemy 2.0（2023 年发布）改进了大量语法。本教程全部使用 **2.0 风格**（`Mapped` / `mapped_column` / `select()`），如果你看到旧教程里的 `Column(...)`、`db.query(User)`，那是 1.x 老风格——能用，但新项目建议用新风格。

## 6. 接下来的学习路径

第三部分我们**先脱离 FastAPI**，用纯 Python 脚本学 SQLAlchemy（这样概念更清晰），路径是：

1. 连接数据库（engine 和 Session）→ [下一章](02-安装与连接数据库.md)
2. 定义模型（表结构）
3. CRUD 操作
4. 表关系（一对多、多对多）

学完后第四部分再把它装进 FastAPI。

## 本章小结

- 数据库负责持久化数据；关系型数据库以表存储，靠外键建立关联
- SQL 是数据库的操作语言，核心是 CRUD 四类操作
- ORM 把表映射成类、把行映射成对象，让你用 Python 风格操作数据库
- 本教程用 SQLAlchemy 2.0 语法 + SQLite 教学

下一章：[02-安装与连接数据库](02-安装与连接数据库.md)
