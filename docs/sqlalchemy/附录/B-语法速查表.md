# 附录 B：SQLAlchemy 2.0 语法速查表

> 日常开发的"字典"。全部为 2.0 现代语法，可直接复制使用。

## 一、基础设施

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# 引擎（全局一个）
engine = create_engine("sqlite:///app.db", echo=True)
engine = create_engine("mysql+pymysql://user:pass@localhost:3306/db?charset=utf8mb4")
engine = create_engine("postgresql+psycopg2://user:pass@localhost:5432/db")

# 会话工厂
SessionLocal = sessionmaker(bind=engine)

# 基类 + 建表/删表
class Base(DeclarativeBase): ...
Base.metadata.create_all(engine)
Base.metadata.drop_all(engine)

# 标准会话用法
with SessionLocal() as session:
    ...
    session.commit()

# 自动提交/回滚
with SessionLocal() as session, session.begin():
    ...
```

## 二、模型定义

```python
import enum
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Any
from sqlalchemy import String, Text, Numeric, JSON, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

class User(Base):
    __tablename__ = "users"

    # 主键
    id: Mapped[int] = mapped_column(primary_key=True)
    # 常用类型
    name: Mapped[str] = mapped_column(String(50))                 # VARCHAR(50) 非空
    nickname: Mapped[Optional[str]] = mapped_column(String(50))   # 可空
    content: Mapped[str] = mapped_column(Text)                    # 长文本
    age: Mapped[int]                                              # INTEGER
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))        # 金额
    is_active: Mapped[bool] = mapped_column(default=True)
    extra: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    # 约束与索引
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    # 时间戳标配
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(),
                                                 onupdate=func.now())

# 枚举列
class Status(enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"
status: Mapped[Status] = mapped_column(default=Status.ACTIVE)

# 联合索引
__table_args__ = (Index("ix_user_time", "user_id", "created_at"),)
```

## 三、关系定义

```python
# ---------- 一对多：User 1—N Post ----------
class User(Base):
    posts: Mapped[list["Post"]] = relationship(
        back_populates="author", cascade="all, delete-orphan")

class Post(Base):
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    author: Mapped["User"] = relationship(back_populates="posts")

# ---------- 一对一：外键加 unique，注解用单数 ----------
class Profile(Base):
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    user: Mapped["User"] = relationship(back_populates="profile")
class User(Base):
    profile: Mapped[Optional["Profile"]] = relationship(back_populates="user")

# ---------- 多对多：中间表 + secondary ----------
post_tags = Table("post_tags", Base.metadata,
    Column("post_id", ForeignKey("posts.id"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id"), primary_key=True))

class Post(Base):
    tags: Mapped[list["Tag"]] = relationship(secondary=post_tags,
                                             back_populates="posts")
class Tag(Base):
    posts: Mapped[list["Post"]] = relationship(secondary=post_tags,
                                               back_populates="tags")
```

## 四、增删改查

```python
from sqlalchemy import select, insert, update, delete, func

# ---------- 增 ----------
session.add(obj)
session.add_all([obj1, obj2])
session.flush()                    # 发SQL不提交（拿自增id）
session.commit()
session.execute(insert(User), [{"name": "a"}, {"name": "b"}])   # 批量

# ---------- 查 ----------
session.get(User, 1)                                   # 按主键
session.scalars(select(User)).all()                    # 对象列表
session.scalars(stmt).first()                          # 第一条或 None
session.scalars(stmt).one()                            # 恰好一条否则异常
session.scalars(stmt).one_or_none()                    # 至多一条
session.scalar(stmt)                                   # 单值/单对象
session.execute(select(User.name, User.age)).all()     # 指定列 → Row

# ---------- 改 ----------
user = session.get(User, 1); user.age = 26; session.commit()   # 对象式
session.execute(update(User).where(User.city == "北京")
                .values(age=User.age + 1)); session.commit()    # 批量

# ---------- 删 ----------
session.delete(user); session.commit()                          # 对象式
session.execute(delete(User).where(User.age < 18)); session.commit()  # 批量
```

## 五、过滤 / 排序 / 分页

```python
# 比较
.where(User.age == 25)  .where(User.age != 25)  .where(User.age >= 18)
.where(User.age.between(18, 35))
# NULL
.where(User.age.is_(None))  .where(User.age.is_not(None))
# 集合
.where(User.city.in_(["北京", "上海"]))  .where(User.city.not_in([...]))
# 模糊
.where(User.name.like("张%"))  .where(User.name.contains("三"))
.where(User.name.startswith("张"))  .where(User.name.endswith("三"))
# 组合
.where(cond1, cond2)                       # AND
from sqlalchemy import and_, or_, not_
.where(or_(cond1, cond2))                  # OR（不能用 Python 的 or！）
# 关系过滤
.where(User.posts.any(Post.title.contains("x")))    # 列表关系
.where(User.profile.has(Profile.bio.contains("x"))) # 单对象关系
# 排序分页去重
.order_by(User.created_at.desc(), User.id)
.offset((page - 1) * size).limit(size)
.distinct()
```

## 六、连接 / 聚合 / 子查询

```python
# JOIN
select(Post).join(Post.author).where(User.name == "张三")
select(User.name, Post.title).outerjoin(User.posts)

# 聚合
select(func.count()).select_from(User)
func.count(User.id)  func.sum(X)  func.avg(X)  func.max(X)  func.min(X)
func.coalesce(X, 0)  func.date(User.created_at)

# 分组
(select(User.city, func.count(User.id).label("cnt"))
 .group_by(User.city).having(func.count(User.id) > 2))

# 子查询
sq = select(Post.user_id, func.count().label("cnt")).group_by(Post.user_id).subquery()
select(User.name, sq.c.cnt).join(sq, User.id == sq.c.user_id)
```

## 七、预加载（防 N+1）

```python
from sqlalchemy.orm import selectinload, joinedload

select(User).options(selectinload(User.posts))          # 列表关系
select(Post).options(joinedload(Post.author))           # 单对象关系
select(User).options(selectinload(User.posts)
                     .selectinload(Post.tags))          # 嵌套
```

## 八、原生 SQL

```python
from sqlalchemy import text
session.execute(text("SELECT * FROM users WHERE age > :age"), {"age": 18})
```

## 九、异步对照

```python
from sqlalchemy.ext.asyncio import (create_async_engine, async_sessionmaker,
                                    AsyncSession)

engine = create_async_engine("sqlite+aiosqlite:///app.db")
SessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)

async with SessionLocal() as session:
    user = await session.get(User, 1)
    result = await session.scalars(select(User))
    users = result.all()
    await session.commit()

async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

## 十、FastAPI 集成模板

```python
# database.py
from typing import Annotated, Generator
from fastapi import Depends

engine = create_engine("sqlite:///app.db",
                       connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)

def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session

DbSession = Annotated[Session, Depends(get_db)]

# schemas.py
from pydantic import BaseModel, ConfigDict
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str

# 路由
@app.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: DbSession):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "不存在")
    return user

# PATCH 更新
for k, v in data.model_dump(exclude_unset=True).items():
    setattr(user, k, v)
```

## 十一、Alembic 命令

```bash
alembic init alembic                          # 初始化（一次）
alembic revision --autogenerate -m "说明"     # 生成迁移
alembic upgrade head                          # 应用到最新
alembic downgrade -1                          # 回滚一级
alembic current / history                     # 查看状态/历史
```

## 十二、1.x → 2.0 语法对照（读老代码用）

| 1.x 老写法 | 2.0 新写法 |
|-----------|-----------|
| `Base = declarative_base()` | `class Base(DeclarativeBase)` |
| `Column(Integer, primary_key=True)` | `Mapped[int] = mapped_column(primary_key=True)` |
| `session.query(User).all()` | `session.scalars(select(User)).all()` |
| `.filter(...)` / `.filter_by(x=1)` | `.where(...)` |
| `.query(User).get(1)` | `session.get(User, 1)` |
| `.query(func.count(User.id)).scalar()` | `session.scalar(select(func.count()).select_from(User))` |
| `backref="posts"` | 两侧显式 `back_populates` |
| Pydantic `orm_mode = True` | `ConfigDict(from_attributes=True)` |
