# 1.3 第一个 SQLAlchemy 程序

> 本节目标：写一个 50 行的完整程序，体验 SQLAlchemy 的全流程——**连接数据库 → 定义表 → 建表 → 存数据 → 查数据**。
> 先跑通、有个整体印象，细节留到第 2 章逐个拆解。**不要求现在就看懂每一行！**

## 一、完整代码

在项目目录下新建 `first_demo.py`，输入以下代码：

```python
"""我的第一个 SQLAlchemy 程序：一个极简用户管理"""
from sqlalchemy import create_engine, String, select
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session

# ========== 第 1 步：创建引擎（告诉 SQLAlchemy 数据库在哪） ==========
# sqlite:///first.db 表示使用当前目录下的 first.db 文件
# echo=True 会把生成的 SQL 打印出来，学习期间强烈建议开着
engine = create_engine("sqlite:///first.db", echo=True)


# ========== 第 2 步：定义模型（用 Python 类描述数据表长什么样） ==========
class Base(DeclarativeBase):
    """所有模型的基类，整个项目只需要定义一次"""
    pass


class User(Base):
    """User 类 ←→ users 表"""
    __tablename__ = "users"          # 对应的表名

    id: Mapped[int] = mapped_column(primary_key=True)       # 主键，自动递增
    name: Mapped[str] = mapped_column(String(50))           # 名字，最长50字符
    email: Mapped[str] = mapped_column(String(100))         # 邮箱
    age: Mapped[int]                                        # 年龄

    def __repr__(self) -> str:
        return f"User(id={self.id}, name={self.name!r}, age={self.age})"


# ========== 第 3 步：建表（根据模型在数据库里创建真实的表） ==========
Base.metadata.create_all(engine)


# ========== 第 4 步：插入数据 ==========
with Session(engine) as session:
    zhangsan = User(name="张三", email="zhangsan@example.com", age=25)
    lisi = User(name="李四", email="lisi@example.com", age=30)
    wangwu = User(name="王五", email="wangwu@example.com", age=17)

    session.add_all([zhangsan, lisi, wangwu])   # 放进会话
    session.commit()                            # 提交，真正写入数据库


# ========== 第 5 步：查询数据 ==========
with Session(engine) as session:
    # 查询所有成年用户（age >= 18），按年龄排序
    stmt = select(User).where(User.age >= 18).order_by(User.age)
    users = session.scalars(stmt).all()

    print("\n========== 查询结果 ==========")
    for user in users:
        print(f"  {user.name}，{user.age}岁，邮箱 {user.email}")
```

## 二、运行

```bash
python first_demo.py
```

你会看到大量 SQL 日志（这是 `echo=True` 的效果），最后是：

```
========== 查询结果 ==========
  张三，25岁，邮箱 zhangsan@example.com
  李四，30岁，邮箱 lisi@example.com
```

注意：17 岁的王五被 `where(User.age >= 18)` 过滤掉了。✔

同时项目目录下多了一个 `first.db` 文件——你的数据就真实地存在里面。用 DB Browser for SQLite 打开它，能看到 `users` 表和三行数据。

> 💡 **再运行一次会怎样？** 会再插入 3 条重复数据（张三会有两个）。因为 `create_all` 发现表已存在会跳过建表，但插入代码每次都执行。想重来就删掉 `first.db` 文件。

## 三、逐步解读（概览版）

### 第 1 步：`create_engine` —— 一切的起点

```python
engine = create_engine("sqlite:///first.db", echo=True)
```

Engine（引擎）代表"到某个数据库的连接方式"。整个程序**只创建一次**。`echo=True` 让它打印所有实际执行的 SQL——这是学习 ORM 的最佳窗口，你能亲眼看到每行 Python 代码变成了什么 SQL。

→ 详见 [2.1 Engine：数据库连接的起点](../02-核心基础/01-Engine数据库连接.md)

### 第 2 步：模型类 —— 表结构的 Python 化身

```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
```

- 继承 `Base` 的类会被 SQLAlchemy "登记注册"
- `Mapped[int]` 是类型注解，声明"这一列在 Python 里是 int"
- `mapped_column(...)` 补充数据库层面的细节（主键、长度等）

→ 详见 [2.2 定义模型：把 Python 类变成数据表](../02-核心基础/02-定义模型.md)

### 第 3 步：`create_all` —— 照图纸盖房子

```python
Base.metadata.create_all(engine)
```

扫描所有继承 `Base` 的模型类，在数据库里执行 `CREATE TABLE`（已存在的表会跳过）。看日志你能找到它生成的 SQL：

```sql
CREATE TABLE users (
    id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    age INTEGER NOT NULL,
    PRIMARY KEY (id)
)
```

### 第 4 步：Session + commit —— 操作数据的窗口

```python
with Session(engine) as session:
    session.add_all([zhangsan, lisi, wangwu])
    session.commit()
```

Session（会话）是所有增删改查的入口。关键理解：**`add` 只是"登记"，`commit` 才真正写入数据库**。`with` 语法保证会话用完自动关闭。

→ 详见 [2.3 Session：与数据库对话的窗口](../02-核心基础/03-Session会话详解.md)

### 第 5 步：`select` —— 2.0 风格的查询

```python
stmt = select(User).where(User.age >= 18).order_by(User.age)
users = session.scalars(stmt).all()
```

先用 `select()` **构建**一条查询语句（此时还没碰数据库），再交给 `session.scalars()` **执行**并拿回 User 对象列表。对应生成的 SQL：

```sql
SELECT users.id, users.name, users.email, users.age
FROM users
WHERE users.age >= ?
ORDER BY users.age
```

注意 `User.age >= 18` ——这不是普通的布尔比较！SQLAlchemy 重载了运算符，这个表达式会变成 SQL 里的 `WHERE age >= 18`。

→ 详见 [3.2 查：查询数据](../03-增删改查/02-查询数据.md)

## 四、你刚刚完成了什么

用不到 50 行代码，你完成了：

```
定义结构 (class User)
    → 建表 (create_all)
    → 写入 (add + commit)
    → 条件查询 (select + where)
```

而且**全程没有手写一句 SQL**。这就是 ORM。

## 📝 本节小结

- 五步流程：**Engine → 模型 → 建表 → Session 写入 → select 查询**
- `echo=True` 是学习神器，能看到每步生成的 SQL
- `add` 只登记、`commit` 才落盘
- `User.age >= 18` 是查询表达式，不是布尔值

有了整体印象，接下来逐个深挖 → [2.1 Engine：数据库连接的起点](../02-核心基础/01-Engine数据库连接.md)
