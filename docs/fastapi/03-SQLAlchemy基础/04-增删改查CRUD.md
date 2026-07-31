# 3.4 增删改查（CRUD）

本章目标：掌握 SQLAlchemy 2.0 的增删改查操作。这是使用频率最高的一章，建议边看边在 Python 脚本里逐段执行。

## 0. 准备

沿用上一章的 `User` 模型。本章代码统一放在这样的骨架里运行：

```python
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from models_demo import Base, User   # 上一章的文件

engine = create_engine("sqlite:///./app.db", echo=True)
SessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(engine)

with SessionLocal() as db:
    ...   # ← 本章的代码片段放这里
```

## 1. 增（Create）：add + commit

```python
# 创建对象（就是普通的类实例化）
user = User(username="xiaoming", email="xm@qq.com", age=18)

db.add(user)      # 把对象放进 Session（此时还没写数据库！）
db.commit()       # 提交，真正执行 INSERT

print(user.id)    # commit 后自增主键自动回填 → 1
```

批量添加：

```python
db.add_all([
    User(username="xiaohong", email="xh@qq.com", age=17),
    User(username="xiaogang", email="xg@qq.com", age=20),
])
db.commit()
```

要点：

- `add` 只是「登记」，`commit` 才落库。echo 日志里可以看到 INSERT 发生在 commit 时
- commit 后，数据库生成的值（自增 id、server_default 的时间）会自动填回对象

## 2. 查（Read）：select

2.0 风格的查询分两步：**用 `select()` 构建查询语句 → 用 Session 执行**。

### 按主键查一条：db.get

```python
user = db.get(User, 1)        # 主键查询的快捷方式
print(user)                   # <User id=1 username=xiaoming> 或 None（不存在时）
```

### 查所有：scalars(...).all()

```python
stmt = select(User)                 # 相当于 SELECT * FROM users
users = db.scalars(stmt).all()      # 执行，得到 User 对象列表
for u in users:
    print(u.id, u.username)
```

> **为什么是 `scalars` 不是 `execute`？** `db.execute(stmt)` 返回的每行是一个元组（哪怕只查一个模型）；`db.scalars(stmt)` 帮你把「每行元组的第一个元素」取出来，直接得到 User 对象。查整个模型时用 `scalars`，这是固定套路。

### 条件过滤：where

```python
# 单条件
stmt = select(User).where(User.age >= 18)

# 多条件（逗号分隔 = AND）
stmt = select(User).where(User.age >= 18, User.is_active == True)

# OR 条件
from sqlalchemy import or_
stmt = select(User).where(or_(User.username == "xiaoming", User.age > 19))

# 模糊搜索（LIKE），% 是通配符
stmt = select(User).where(User.username.like("%xiao%"))

# IN 查询
stmt = select(User).where(User.id.in_([1, 2, 3]))

# 判空
stmt = select(User).where(User.age.is_(None))       # IS NULL
stmt = select(User).where(User.age.is_not(None))    # IS NOT NULL

users = db.scalars(stmt).all()
```

> 注意条件里用的是**类属性** `User.age`，SQLAlchemy 重载了比较运算符，把 `User.age >= 18` 变成了 SQL 条件而非布尔值。

### 只取第一条 / 确保只有一条

```python
user = db.scalars(select(User).where(User.username == "xiaoming")).first()
# 没有结果时返回 None，最常用

user = db.scalars(select(User).where(User.email == "xm@qq.com")).one()
# 必须恰好一条，否则抛异常（适合按唯一键查询且确信存在时）
```

### 排序、去重、限量

```python
stmt = (
    select(User)
    .where(User.is_active == True)
    .order_by(User.age.desc(), User.id)   # 按年龄降序，同龄按 id 升序
    .offset(10)                           # 跳过前 10 条
    .limit(10)                            # 取 10 条 → 第 2 页
)
```

`offset + limit` 就是分页的底层原理：第 n 页 = `offset((n-1)*size).limit(size)`。

### 计数

```python
from sqlalchemy import func

total = db.scalar(select(func.count()).select_from(User))         # 全表数量
adults = db.scalar(
    select(func.count()).select_from(User).where(User.age >= 18)
)
```

（`db.scalar` 单数形式：执行后直接返回第一行第一列的值。）

## 3. 改（Update）：查出来 → 改属性 → commit

ORM 风格的更新非常自然：

```python
user = db.get(User, 1)
user.email = "new_email@qq.com"   # 直接改对象属性
user.age = 19
db.commit()                        # Session 检测到对象变脏，自动生成 UPDATE
```

不需要调用任何「update 方法」——Session 会**自动追踪**你对已加载对象的修改，commit 时统一生成 UPDATE 语句。看 echo 日志验证：它只更新被改过的列。

> 还有一种批量更新语法 `db.execute(update(User).where(...).values(...))`，适合一次改很多行，了解即可。

## 4. 删（Delete）：delete + commit

```python
user = db.get(User, 3)
if user:
    db.delete(user)
    db.commit()
```

## 5. 完整演练脚本

把 CRUD 串成一个可运行的脚本 `crud_demo.py`：

```python
from sqlalchemy import create_engine, select, func
from sqlalchemy.orm import sessionmaker
from models_demo import Base, User

engine = create_engine("sqlite:///./app.db", echo=False)  # 关掉 echo 让输出干净些
SessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(engine)

with SessionLocal() as db:
    # 清空旧数据，方便重复运行
    for u in db.scalars(select(User)).all():
        db.delete(u)
    db.commit()

    # 增
    db.add_all([
        User(username="xiaoming", email="xm@qq.com", age=18),
        User(username="xiaohong", email="xh@qq.com", age=17),
        User(username="xiaogang", email="xg@qq.com", age=20),
    ])
    db.commit()
    print("== 插入 3 个用户 ==")

    # 查
    adults = db.scalars(select(User).where(User.age >= 18).order_by(User.age)).all()
    print("成年用户：", adults)

    total = db.scalar(select(func.count()).select_from(User))
    print("用户总数：", total)

    # 改
    xm = db.scalars(select(User).where(User.username == "xiaoming")).first()
    xm.age = 19
    db.commit()
    print("小明改后年龄：", db.get(User, xm.id).age)

    # 删
    xh = db.scalars(select(User).where(User.username == "xiaohong")).first()
    db.delete(xh)
    db.commit()
    print("删除后总数：", db.scalar(select(func.count()).select_from(User)))
```

运行它，然后**把 echo 改回 True 再跑一遍**，观察每步生成的 SQL——这是理解 ORM 的最好方式。

## 6. 新旧语法对照（读旧代码时用）

网上大量教程还是 1.x 风格，对照表帮你翻译：

| 操作 | 1.x 旧风格 | 2.0 新风格（本教程） |
|------|-----------|---------------------|
| 查所有 | `db.query(User).all()` | `db.scalars(select(User)).all()` |
| 条件查询 | `db.query(User).filter(User.age > 18)` | `select(User).where(User.age > 18)` |
| 按主键 | `db.query(User).get(1)` | `db.get(User, 1)` |
| 第一条 | `.first()` | `db.scalars(stmt).first()` |

## 本章小结

- 增：`db.add(obj)` → `db.commit()`；id 在 commit 后回填
- 查：`db.get` 按主键；`select().where().order_by().offset().limit()` 构建查询，`db.scalars(stmt)` 执行
- 改：查出对象直接改属性再 commit，Session 自动追踪变化
- 删：`db.delete(obj)` → `db.commit()`
- 一切修改不 commit 不生效

下一章：[3.5 表关系：一对多与多对多](05-表关系.md) —— 一对多和多对多。
