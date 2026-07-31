# 5.4 异步 SQLAlchemy

> FastAPI 是异步框架，SQLAlchemy 2.0 提供了完整的异步支持。本节学会把前面的所有知识"翻译"成 async 版本——你会发现 90% 的代码原样不变。

> 前置知识：了解 Python 的 `async` / `await` 基本概念。如果还不熟悉，可以先跳过本节，用同步方式完成第 6、7 章（完全可行），以后再回来。

## 一、为什么需要异步？

同步模式下，一次数据库查询要 10ms，这 10ms 里整个线程**干等**。Web 服务并发一高，线程全在等数据库，吞吐量上不去。

异步模式下，`await` 等待数据库时，事件循环可以去处理**其他请求**——单线程也能同时"照看"成百上千个连接。这对 IO 密集的 Web 后端收益巨大。

```
同步：请求A查库(等10ms) → 处理A → 请求B查库(等10ms) → 处理B
异步：请求A查库(await) ┐
      请求B查库(await) ├ 等待期间交替推进，总耗时大幅缩短
      请求C查库(await) ┘
```

## 二、异步三件套：引擎、会话、驱动

异步版把三个组件换成 async 变体，**模型定义完全不用改**：

| 同步 | 异步 |
|------|------|
| `create_engine` | `create_async_engine` |
| `Session` / `sessionmaker` | `AsyncSession` / `async_sessionmaker` |
| 驱动 `sqlite3`（内置） | `aiosqlite`（pip 安装） |
| 驱动 `pymysql` | `asyncmy` 或 `aiomysql` |
| 驱动 `psycopg2` | `asyncpg` |

```python
from sqlalchemy.ext.asyncio import (async_sessionmaker, create_async_engine,
                                    AsyncSession)

# 注意连接串里的驱动变成了 aiosqlite
engine = create_async_engine("sqlite+aiosqlite:///async_app.db", echo=True)

AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)
```

> 📌 `expire_on_commit=False`：默认情况下 commit 后对象属性会"过期"，下次访问自动补查——但异步模式下这种**隐式 IO 是被禁止的**（会抛错），所以异步会话几乎总是配这个参数，commit 后对象属性保持可用。

## 三、完整对照示例

```python
# async_demo.py
import asyncio

from sqlalchemy import String, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class User(Base):                      # 模型定义与同步版一字不差！
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    age: Mapped[int]

    def __repr__(self) -> str:
        return f"User(id={self.id}, name={self.name!r})"


engine = create_async_engine("sqlite+aiosqlite:///async_app.db", echo=True)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


async def init_db():
    """异步建表：create_all 是同步函数，要用 run_sync 包一层"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def main():
    await init_db()

    # 写入
    async with AsyncSessionLocal() as session:
        session.add_all([
            User(name="张三", age=25),
            User(name="李四", age=30),
        ])
        await session.commit()                    # commit 要 await

    # 查询
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.age >= 18)     # 构建语句：与同步完全相同
        result = await session.scalars(stmt)          # 执行要 await
        for user in result.all():
            print(user)

        # 其他常用操作
        user = await session.get(User, 1)             # get 要 await
        user.age = 26
        await session.commit()

        count = await session.scalar(select(func.count()).select_from(User))


asyncio.run(main())
```

### 变与不变总结

**不变的（占代码大头）：**
- 模型定义（Base、Mapped、mapped_column、relationship）
- 语句构建（select / where / order_by / join / func 全套）
- 业务逻辑结构

**变的（机械替换）：**

| 同步写法 | 异步写法 |
|---------|---------|
| `with SessionLocal() as session:` | `async with AsyncSessionLocal() as session:` |
| `session.commit()` | `await session.commit()` |
| `session.get(User, 1)` | `await session.get(User, 1)` |
| `session.scalars(stmt).all()` | `(await session.scalars(stmt)).all()` |
| `session.execute(stmt)` | `await session.execute(stmt)` |
| `Base.metadata.create_all(engine)` | `await conn.run_sync(Base.metadata.create_all)` |

规律一句话：**凡是真正碰数据库的调用都加 await；纯内存操作（构建语句、add、改属性）不用。**

## 四、异步最大的坑：懒加载炸弹

同步模式下访问 `user.posts` 会悄悄发一条 SQL（懒加载）。**异步模式下隐式 IO 是非法的**，直接抛异常：

```python
async with AsyncSessionLocal() as session:
    user = await session.get(User, 1)
    print(user.posts)      # ❌ MissingGreenlet / 报错！懒加载在异步下不可用
```

解法：**关系必须显式预加载**（4.4 节的知识在异步下从"优化"变成了"必需"）：

```python
from sqlalchemy.orm import selectinload

async with AsyncSessionLocal() as session:
    stmt = select(User).options(selectinload(User.posts)).where(User.id == 1)
    user = await session.scalar(stmt)
    print(user.posts)      # ✅ 已预加载，纯内存访问
```

> 💡 副作用是好事：异步逼着你写出没有 N+1 问题的代码。

## 五、该选同步还是异步？

| 场景 | 建议 |
|------|------|
| 学习阶段 | **同步**。概念少一个 await 的干扰，坑也少 |
| 脚本、爬虫、数据处理、定时任务 | 同步，够用且简单 |
| FastAPI 小型项目 | 同步也完全可以（FastAPI 会把同步路由丢进线程池，不阻塞事件循环） |
| FastAPI 高并发生产项目 | 异步，吞吐优势明显 |

**本教程第 6、7 章采用同步方式教学**（对新手更友好），并在最后给出异步版本的改造对照。你已经看到了：改造是机械的。

## 📝 本节小结

- 三件套替换：`create_async_engine` + `async_sessionmaker` + 异步驱动（aiosqlite/asyncpg…）
- 模型和查询语句**零改动**；碰数据库的调用加 `await`
- `async_sessionmaker(expire_on_commit=False)` 是标配
- 异步下**懒加载直接报错**，关系必须 selectinload/joinedload 显式预加载
- 新手先学同步，异步是机械翻译的事

进阶篇完结！接下来把 SQLAlchemy 接上 Web → [6.1 FastAPI 快速入门](../06-FastAPI集成/01-FastAPI快速入门.md)
