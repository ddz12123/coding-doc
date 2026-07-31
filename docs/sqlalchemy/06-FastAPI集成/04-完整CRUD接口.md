# 6.4 完整的 CRUD 接口

> 本节把 6.1~6.3 的所有零件组装成一个**可以直接运行**的完整项目：用户管理 API，含创建、列表（分页+搜索）、详情、更新、删除。这是第 7 章实战项目的"单文件预演"。

## 一、项目结构

```
user_api/
├── database.py    # 引擎、会话、Base、get_db 依赖
├── models.py      # SQLAlchemy 模型
├── schemas.py     # Pydantic 模型
└── main.py        # FastAPI 应用与路由
```

## 二、database.py

```python
# database.py
from typing import Annotated, Generator

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

engine = create_engine(
    "sqlite:///user_api.db",
    connect_args={"check_same_thread": False},
    echo=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session


DbSession = Annotated[Session, Depends(get_db)]
```

## 三、models.py

```python
# models.py
from datetime import datetime
from typing import Optional

from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), index=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    city: Mapped[Optional[str]] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    def __repr__(self) -> str:
        return f"User(id={self.id}, name={self.name!r})"
```

## 四、schemas.py

```python
# schemas.py
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    email: EmailStr
    city: str | None = Field(default=None, max_length=50)


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = None
    city: str | None = None


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class UserPage(BaseModel):
    """分页响应"""
    total: int
    page: int
    page_size: int
    items: list[UserOut]
```

## 五、main.py（核心）

```python
# main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import func, select

import schemas
from database import Base, DbSession, engine
from models import User


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
    engine.dispose()


app = FastAPI(title="用户管理 API", lifespan=lifespan)


# ---------- C：创建 ----------
@app.post("/users", response_model=schemas.UserOut, status_code=201)
def create_user(data: schemas.UserCreate, db: DbSession):
    # 邮箱查重（唯一约束是最后防线，这里给出友好错误）
    exists = db.scalar(select(User).where(User.email == data.email))
    if exists:
        raise HTTPException(409, "该邮箱已被注册")

    user = User(**data.model_dump())
    db.add(user)
    db.commit()
    return user


# ---------- R：分页列表 + 搜索 ----------
@app.get("/users", response_model=schemas.UserPage)
def list_users(
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    city: str | None = None,
    keyword: str | None = Query(default=None, description="按名字模糊搜索"),
):
    stmt = select(User)
    if city:
        stmt = stmt.where(User.city == city)
    if keyword:
        stmt = stmt.where(User.name.contains(keyword))

    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.order_by(User.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return {"total": total, "page": page, "page_size": page_size, "items": items}


# ---------- R：详情 ----------
@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(user_id: int, db: DbSession):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "用户不存在")
    return user


# ---------- U：部分更新 ----------
@app.patch("/users/{user_id}", response_model=schemas.UserOut)
def update_user(user_id: int, data: schemas.UserUpdate, db: DbSession):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "用户不存在")

    updates = data.model_dump(exclude_unset=True)
    if "email" in updates and updates["email"] != user.email:
        if db.scalar(select(User).where(User.email == updates["email"])):
            raise HTTPException(409, "该邮箱已被注册")

    for key, value in updates.items():
        setattr(user, key, value)
    db.commit()
    return user


# ---------- D：删除 ----------
@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int, db: DbSession):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "用户不存在")
    db.delete(user)
    db.commit()
```

## 六、运行与测试

```bash
fastapi dev main.py
```

打开 <http://127.0.0.1:8000/docs>，按顺序测试：

1. **POST /users** 创建几个用户（试试重复邮箱 → 409；非法邮箱格式 → 422）
2. **GET /users** 看分页；试 `?keyword=张`、`?city=北京&page=1&page_size=2`
3. **GET /users/1** 详情；**GET /users/999** → 404
4. **PATCH /users/1** 只传 `{"city": "上海"}`，确认其他字段没被动
5. **DELETE /users/1** → 204；再查 → 404

也可以用 curl：

```bash
curl -X POST http://127.0.0.1:8000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "张三", "email": "zs@example.com", "city": "北京"}'

curl "http://127.0.0.1:8000/users?page=1&page_size=5"
```

## 七、这个项目的知识地图

回看这 4 个文件，你已经把整个教程串起来了：

| 代码位置 | 用到的知识 | 出处 |
|---------|-----------|------|
| `create_engine` + `connect_args` | 引擎与连接 | 2.1 / 6.2 |
| `User` 模型 | 模型定义、索引、server_default | 2.2 / 2.4 |
| `get_db` + `DbSession` | Session 生命周期、依赖注入 | 2.3 / 6.2 |
| 邮箱查重 + 409 | 唯一约束处理 | 3.1 |
| 列表接口的动态 where | 动态拼条件 | 3.3 |
| `func.count` + subquery | 聚合统计 | 5.1 |
| offset/limit + order_by | 分页三定律 | 3.3 |
| `exclude_unset` 更新 | PATCH 语义 | 6.3 |
| `db.delete` | 删除 | 3.4 |
| Schema 四件套 + response_model | 两套模型分工 | 6.3 |

## 📝 本节小结

- 四文件结构：database（底座）/ models（存储）/ schemas（进出）/ main（路由）
- 创建前查重给 409，查不到给 404，校验失败 FastAPI 自动 422
- 列表接口标配：分页 + 排序 + 动态过滤 + total
- 这套结构就是第 7 章实战项目的雏形——实战版会把它扩展成多文件分层架构

进入最终实战 → [7.1 项目介绍与结构设计](../07-实战项目/01-项目介绍与结构设计.md)
