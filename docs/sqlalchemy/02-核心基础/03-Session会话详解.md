# 2.3 Session：与数据库对话的窗口

> Session 是 ORM 世界里你打交道最多的对象——所有增删改查都经过它。它也是新手最容易犯迷糊的地方。本节把它的工作机制讲透。

## 一、Session 是什么？

可以把 Session 想象成一个**购物车 + 记账本**：

- 你把新对象 `add` 进来（放进购物车）
- 你修改已有对象的属性（记账本记下改动）
- 最后 `commit()` 一次性结算（把所有改动打包发给数据库）

```python
from sqlalchemy.orm import Session

with Session(engine) as session:
    user = User(name="张三", email="zs@example.com", age=25)
    session.add(user)      # 放入购物车（数据库还没变！）
    session.commit()       # 结算（此刻才真正执行 INSERT）
```

## 二、两种创建方式

### 方式一：直接创建（脚本、简单场景）

```python
from sqlalchemy.orm import Session

with Session(engine) as session:
    ...
```

### 方式二：sessionmaker 工厂（正式项目标准做法）

```python
from sqlalchemy.orm import sessionmaker

# 程序启动时创建一次"会话工厂"
SessionLocal = sessionmaker(bind=engine)

# 之后随处使用工厂生产会话
with SessionLocal() as session:
    ...
```

`sessionmaker` 的好处是把配置（绑定哪个 engine 等）集中在一处。**FastAPI 项目里用的就是这种方式**（第 6 章见）。

> 📌 与 Engine 相反：**Engine 全局只要一个，而 Session 用完就扔**——每个请求/每个任务单元创建一个新 Session，短暂使用后关闭。千万不要搞一个全局 Session 到处用（并发时会出大乱子）。

## 三、核心方法总览

| 方法 | 作用 |
|------|------|
| `session.add(obj)` | 登记一个新对象（待插入） |
| `session.add_all([obj, ...])` | 批量登记 |
| `session.get(User, 主键)` | 按主键查一个对象 |
| `session.execute(stmt)` | 执行查询/更新语句，返回 Result |
| `session.scalars(stmt)` | 执行查询，直接返回对象序列（最常用） |
| `session.delete(obj)` | 登记删除 |
| `session.commit()` | 提交：把所有待办真正写入数据库 |
| `session.rollback()` | 回滚：撤销本次事务的所有未提交改动 |
| `session.refresh(obj)` | 从数据库重新加载该对象的最新数据 |
| `session.flush()` | 把待办 SQL 发给数据库执行，但**不提交**事务 |
| `session.close()` | 关闭会话（with 语法会自动调用） |

## 四、关键机制：改对象属性 = 自动记账

Session 有个"魔法"：**从它查出来的对象，你直接改属性，它自己就知道**，commit 时会自动生成 UPDATE。

```python
with Session(engine) as session:
    user = session.get(User, 1)     # 查出 id=1 的用户
    user.age = 26                   # 直接改属性——Session 已悄悄记下这笔账
    session.commit()                # 自动执行 UPDATE users SET age=26 WHERE id=1
```

不需要什么 `session.update(user)`（根本没有这个方法）。这个机制叫**脏数据追踪（dirty tracking）**。

## 五、对象的四种状态（理解 Session 的钥匙）

一个模型对象相对于 Session 有四种状态：

```mermaid
flowchart LR
    t["Transient（游离态）<br/>刚 new 出来，和数据库无关"]
    p["Pending（待定态）<br/>进了购物车，还没写库"]
    per["Persistent（持久态）<br/>数据库里有对应行，且被 session 跟踪"]
    d["Detached（脱管态）<br/>数据库里有行，但没有 session 跟踪它了"]
    t -->|"session.add()"| p
    p -->|"session.commit() / flush()"| per
    per -->|"session.close()"| d
```

```python
user = User(name="张三", age=25)   # Transient：纯内存对象
print(user.id)                     # None

with Session(engine) as session:
    session.add(user)              # Pending：已登记，未入库
    session.commit()               # Persistent：已入库
    print(user.id)                 # 1  ← commit 后自动拿到数据库分配的主键！

# with 结束，session 关闭
print(user.name)                   # Detached：仍可读到已加载的属性
```

### 新手最常撞的坑：Detached 对象

```python
with Session(engine) as session:
    user = session.get(User, 1)

# session 已关闭
print(user.posts)   # ❌ 可能报错 DetachedInstanceError！
```

为什么？`user.posts` 这类**关系属性是懒加载的**——访问时才去查数据库，而此时 Session 已经关了，没法查了。解决办法在 [4.4 关系加载策略与 N+1 问题](../04-表关系/04-关系加载策略.md) 详讲。现在先记住现象：**尽量在 Session 存活期间用完对象**。

## 六、commit / rollback / flush 深入理解

### commit：提交事务

```python
session.commit()
```

做了三件事：① 把所有待办 SQL 发给数据库（即 flush）② 提交事务，改动永久生效 ③ 让所有对象过期（下次访问属性时自动重新查询，保证拿到最新值）。

### rollback：出错时回滚

```python
with Session(engine) as session:
    try:
        session.add(user1)
        session.add(user2)          # 假设这条违反唯一约束
        session.commit()
    except Exception:
        session.rollback()          # user1、user2 都不会入库——要么全成，要么全不成
        raise
```

这就是**事务（Transaction）**：一组操作作为整体成败。详见 [5.2 事务处理](../05-进阶主题/02-事务处理.md)。

### 更优雅的写法：session.begin()

```python
with Session(engine) as session:
    with session.begin():       # 块结束自动 commit；有异常自动 rollback
        session.add(user1)
        session.add(user2)
```

### flush：发送但不提交

`flush` 把 SQL 发到数据库执行（比如让新对象拿到自增 id），但事务还没提交，随时可回滚：

```python
with Session(engine) as session:
    user = User(name="张三", email="zs@example.com", age=25)
    session.add(user)
    session.flush()          # 执行 INSERT，但未提交
    print(user.id)           # 1 ← 已经拿到 id 了
    session.rollback()       # 反悔！这条 INSERT 被撤销
```

典型用途：先拿到主对象的 id，再用这个 id 创建关联对象，最后一起 commit。

## 七、session.get()：按主键查询的捷径

```python
user = session.get(User, 1)       # 按主键查，查不到返回 None
if user is None:
    print("用户不存在")
```

它还有一层缓存优化：如果这个对象**本次会话已经加载过**，`get` 直接返回内存中的对象，不再查库（这块缓存叫 **Identity Map**，同一个 Session 内，同一行数据永远只对应同一个 Python 对象）。

## 八、标准使用模式总结

**脚本模式**（本教程前几章使用）：

```python
with Session(engine) as session:
    # ...增删改查...
    session.commit()
```

**事务块模式**（推荐，异常自动回滚）：

```python
with Session(engine) as session, session.begin():
    ...   # 结束自动 commit，异常自动 rollback
```

**Web 应用模式**（第 6 章 FastAPI 会用依赖注入实现）：

```
请求到达 → 创建 session → 处理业务 → commit → 关闭 session → 返回响应
                                └── 出异常 → rollback → 关闭 session
```

## 九、练习（先猜再跑）

以下三题都是**预测题**：先写下你的答案，再运行代码验证。三题共用下面的准备代码：

```python
from sqlalchemy import String, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, Session


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))


engine = create_engine("sqlite:///:memory:")
Base.metadata.create_all(engine)
```

### 练习 1：flush 之后 rollback

`flush()` 之后对象拿到了 `id=1`，接着马上 `rollback()`。问：这时数据库里到底有没有这行数据？

<details><summary>参考答案</summary>

**没有。** flush 只是把 INSERT 发给数据库执行、让对象提前拿到自增 id，但**事务并没有提交**；rollback 会把整个未提交的事务连同这条 INSERT 一起撤销。验证（新开一个 session 去查）：

```python
with Session(engine) as session:
    user = User(name="张三")
    session.add(user)
    session.flush()
    print("flush 后拿到的 id:", user.id)   # 1 —— id 是真拿到了
    session.rollback()

with Session(engine) as session:          # 新开 session 查证
    print("rollback 后再查:", session.get(User, 1))
```

预期输出：

```
flush 后拿到的 id: 1
rollback 后再查: None
```

</details>

### 练习 2：改了属性不 commit

查出 id=1 的用户，把 `name` 改成 "李四"，然后**不 commit 直接让 with 块结束**。问：数据库里这行更新了吗？

<details><summary>参考答案</summary>

**没有更新，还是"张三"。** 改属性只是 Session 在"记账本"上记了一笔，只有 `commit()` 才会把 UPDATE 发给数据库；带着未提交的改动关闭 session，等于把账本扔了（等效回滚）。验证：

```python
# 先准备一条数据
with Session(engine) as session:
    session.add(User(name="张三"))
    session.commit()

# 改属性但不 commit
with Session(engine) as session:
    user = session.get(User, 1)
    user.name = "李四"        # 只改了内存里的对象

# with 结束，session 已关闭。重新查证：
with Session(engine) as session:
    print("数据库里的名字:", session.get(User, 1).name)
```

预期输出：

```
数据库里的名字: 张三
```

</details>

### 练习 3：get 两次，几条 SQL？

在**同一个 session** 里连续 `session.get(User, 1)` 两次，echo 日志里会出现几条 `SELECT`？

<details><summary>参考答案</summary>

**1 条。** 第二次 `get` 命中了 Session 的 **Identity Map** 缓存：同一会话里同一行数据永远只对应同一个 Python 对象，`get` 发现对象已在内存中就直接返回，不再发 SQL。验证：把准备代码里的 engine 改成 `create_engine("sqlite:///:memory:", echo=True)`，先插入一条数据，再运行：

```python
with Session(engine) as session:
    a = session.get(User, 1)   # ← 日志里唯一的 SELECT
    b = session.get(User, 1)   # ← 不发 SQL，直接命中缓存
    print(a is b)
```

预期输出（建表、插入的日志已省略）：

```
SELECT users.id, users.name FROM users WHERE users.id = ?
True
```

`a is b` 是 `True`——不是"两个相等的对象"，而是**同一个对象**，这是 Identity Map 最直接的证据。注意：缓存的范围是**单个 Session**，换个新 session 再 get，还是会发 SELECT。

</details>

## 📝 本节小结

- Session = 购物车 + 记账本：`add`/属性修改只是登记，`commit` 才落库
- Engine 全局一个；**Session 短命多个**，用完即关
- 查出来的对象改属性会被自动追踪，commit 时自动 UPDATE
- 四种状态：Transient → Pending → Persistent → Detached
- `commit` 提交事务；`rollback` 回滚；`flush` 发送 SQL 但不提交
- `session.get(User, id)` 是按主键查询的最快方式

下一节，认识更多字段类型 → [2.4 常用字段类型与列参数](04-字段类型与列参数.md)
