# 6.3 Pydantic 与 ORM 模型的配合

> 项目里会同时存在两套"模型"：SQLAlchemy 模型和 Pydantic 模型。新手最大的困惑就是"为什么要写两遍、各管什么、怎么互转"。本节彻底理清。

## 一、为什么需要两套模型？

| | SQLAlchemy 模型（ORM） | Pydantic 模型（Schema） |
|--|----------------------|------------------------|
| 职责 | 数据**怎么存**：表结构、关系、持久化 | 数据**怎么进出 API**：校验入参、定义出参 |
| 面向 | 数据库 | HTTP / JSON |
| 文件惯例 | `models.py` | `schemas.py` |

为什么不能一套通吃？看这个例子就懂了——同一个"用户"，不同场景需要的字段完全不同：

```
数据库里的 User：id, name, email, hashed_password, is_active, created_at
注册接口的入参：      name, email, password        ← 没有id（数据库生成）；是明文password
注册接口的出参：  id, name, email,        created_at  ← 绝不能返回密码！
更新接口的入参：      name?, email?                 ← 全部可选（改哪个传哪个）
```

**一张表，四种数据形状。** Pydantic 模型（业内叫 **Schema**）就是给每种形状一个明确定义。这不是重复劳动，而是 API 的安全边界：**客户端不能塞的字段进不来，不该暴露的字段出不去。**

## 二、Schema 的标准分层写法

以用户为例，`schemas.py` 的典型结构：

```python
# schemas.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- 公共基类：进出都有的字段 ----------
class UserBase(BaseModel):
    name: str = Field(min_length=1, max_length=50, description="用户名")
    email: EmailStr


# ---------- 入参：创建 ----------
class UserCreate(UserBase):
    password: str = Field(min_length=6, description="明文密码，服务端负责哈希")


# ---------- 入参：更新（全部可选） ----------
class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = None


# ---------- 出参 ----------
class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)   # ← 关键配置，见下文

    id: int
    created_at: datetime
    # 注意：没有 password 相关字段 → 永远不可能泄漏
```

命名惯例：`XxxBase`（公共字段）→ `XxxCreate` / `XxxUpdate`（入参）→ `XxxOut`（出参）。继承减少重复。

## 三、关键配置：`from_attributes=True`

Pydantic 默认从**字典**构造模型。但 SQLAlchemy 查出来的是**对象**（属性访问）。`from_attributes=True` 就是打通这一层的开关：

```python
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
```

配上它之后，两件事成为可能：

```python
# ① 手动转换：ORM 对象 → Pydantic 对象
user_orm = session.get(User, 1)                      # SQLAlchemy 对象
user_out = UserOut.model_validate(user_orm)          # 读取同名属性完成转换
print(user_out.model_dump())                         # {'id': 1, 'name': '张三'}

# ② 自动转换（最常用）：接口配 response_model 后直接返回 ORM 对象
@app.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: DbSession):
    return db.get(User, user_id)     # 直接返回 ORM 对象，FastAPI 自动转成 UserOut → JSON
```

> 📌 老教程里的 `class Config: orm_mode = True` 是 Pydantic v1 写法，v2 改成了 `model_config = ConfigDict(from_attributes=True)`。看到 orm_mode 就知道那是老代码。

## 四、完整数据流：一个请求的旅程

以"注册用户"为例，看两套模型如何接力：

```mermaid
flowchart TD
    json["客户端 JSON<br/>{&quot;name&quot;:&quot;张三&quot;,&quot;email&quot;:&quot;zs@qq.com&quot;,&quot;password&quot;:&quot;123456&quot;}"]
    json -->|"① Pydantic 入场：校验"| pyd["UserCreate(name='张三', email='zs@qq.com', password='123456')"]
    pyd -->|"② 业务代码：转成 ORM 对象（密码要哈希！）"| orm["User(name='张三', email='zs@qq.com', hashed_password='$2b$...')"]
    orm -->|"③ SQLAlchemy 入场：入库"| db["db.add(user); db.commit()<br/>user.id、created_at 被数据库填好"]
    db -->|"④ Pydantic 再入场：过滤输出"| out["response_model=UserOut<br/>{&quot;id&quot;:1,&quot;name&quot;:&quot;张三&quot;,&quot;email&quot;:&quot;zs@qq.com&quot;,&quot;created_at&quot;:&quot;...&quot;}"]
```

代码实现：

```python
@app.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: DbSession):
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=fake_hash(data.password),   # 永远不存明文！
    )
    db.add(user)
    db.commit()
    return user     # ORM 对象 → response_model 自动转 UserOut
```

### 入参转 ORM 的简写技巧

字段多时逐个写太啰嗦，用 `model_dump()` 展开：

```python
# 字段名完全对应时：
user = User(**data.model_dump())

# 有差异字段时：排除掉再补
user = User(
    **data.model_dump(exclude={"password"}),
    hashed_password=fake_hash(data.password),
)
```

## 五、更新接口的标准姿势：exclude_unset

PATCH 语义——客户端传哪个字段就改哪个。`exclude_unset=True` 只导出**客户端实际传了的**字段：

```python
@app.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, data: UserUpdate, db: DbSession):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "用户不存在")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(user, key, value)

    db.commit()
    return user
```

> 💡 为什么不用 `exclude_none`？如果某字段业务上允许"清空为 null"，客户端显式传 `"nickname": null` 与"根本没传 nickname"是两种意图。`exclude_unset` 能区分，`exclude_none` 不能。

## 六、嵌套 Schema：返回带关系的数据

想返回"用户及其文章列表"？Schema 一样可以嵌套：

```python
class PostOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str


class UserWithPosts(UserOut):
    posts: list[PostOut] = []       # 对应 ORM 的 user.posts 关系
```

```python
@app.get("/users/{user_id}/detail", response_model=UserWithPosts)
def get_user_detail(user_id: int, db: DbSession):
    stmt = select(User).options(selectinload(User.posts)).where(User.id == user_id)
    user = db.scalar(stmt)
    if user is None:
        raise HTTPException(404, "用户不存在")
    return user      # posts 关系自动逐个转成 PostOut
```

> ⚠️ 记得 `selectinload` 预加载！Pydantic 转换时会访问 `user.posts`——不预加载轻则触发 N+1，异步下直接报错（4.4 / 5.4 节的知识在这里闭环了）。

## 🎯 练习

**给图书管理写出 Schema 四件套 + 嵌套作者，并用 PATCH 验证"不传的字段不被覆盖"**

ORM 模型：`Author(id, name)`、`Book(id, title, price, author_id)`。要求：

1. 写出 `BookBase` / `BookCreate` / `BookUpdate` / `BookOut` 四件套，`BookOut` 里嵌套 `AuthorOut`
2. 实现 `PATCH /books/{book_id}`，只覆盖客户端**实际传了**的字段
3. 验证：先创建一本《SQLAlchemy 入门》price=59.9，再只 PATCH title，确认 price 还是 59.9 而不是被 None 覆盖

<details><summary>参考答案</summary>

```python
# models.py（ORM 侧，供参考）
from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import (DeclarativeBase, Mapped, mapped_column,
                            relationship)


class Base(DeclarativeBase):
    pass


class Author(Base):
    __tablename__ = "authors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))

    books: Mapped[list["Book"]] = relationship(back_populates="author")


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    author_id: Mapped[int] = mapped_column(ForeignKey("authors.id"))

    author: Mapped["Author"] = relationship(back_populates="books")
```

```python
# schemas.py（本题核心①：分层 Schema）
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class AuthorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class AuthorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str


class BookBase(BaseModel):                     # 公共字段：进出都有
    title: str = Field(min_length=1, max_length=200)
    price: Decimal = Field(gt=0)               # 价格必须为正


class BookCreate(BookBase):                    # 创建：全必填 + 关联
    author_id: int


class BookUpdate(BaseModel):                   # 更新：全部可选，改哪个传哪个
    title: str | None = Field(default=None, min_length=1, max_length=200)
    price: Decimal | None = Field(default=None, gt=0)
    author_id: int | None = None


class BookOut(BookBase):                       # 出参：带出嵌套作者
    model_config = ConfigDict(from_attributes=True)
    id: int
    author_id: int
    author: AuthorOut                          # 嵌套：一本书带出它的作者
```

```python
# main.py（本题核心②：exclude_unset）
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

from database import engine, get_db
from models import Author, Base, Book
from schemas import AuthorCreate, AuthorOut, BookCreate, BookOut, BookUpdate

Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.post("/authors", response_model=AuthorOut, status_code=201)
def create_author(data: AuthorCreate, db: Session = Depends(get_db)):
    author = Author(**data.model_dump())
    db.add(author)
    db.commit()
    return author


@app.post("/books", response_model=BookOut, status_code=201)
def create_book(data: BookCreate, db: Session = Depends(get_db)):
    if db.get(Author, data.author_id) is None:
        raise HTTPException(404, "作者不存在")
    book = Book(**data.model_dump())
    db.add(book)
    db.commit()
    return book


@app.patch("/books/{book_id}", response_model=BookOut)
def update_book(book_id: int, data: BookUpdate, db: Session = Depends(get_db)):
    book = db.get(Book, book_id)
    if book is None:
        raise HTTPException(404, "图书不存在")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(book, key, value)              # 只覆盖客户端实际传了的字段
    db.commit()
    return book
```

验证：

```bash
# ① 建作者
curl -X POST http://127.0.0.1:8000/authors -H "Content-Type: application/json" -d "{\"name\": \"张三\"}"
# {"id":1,"name":"张三"}

# ② 建书
curl -X POST http://127.0.0.1:8000/books -H "Content-Type: application/json" \
     -d "{\"title\": \"SQLAlchemy 入门\", \"price\": 59.9, \"author_id\": 1}"

# ③ 只改书名，不传 price
curl -X PATCH http://127.0.0.1:8000/books/1 -H "Content-Type: application/json" \
     -d "{\"title\": \"SQLAlchemy 入门（第2版）\"}"
# {"title":"SQLAlchemy 入门（第2版）","price":59.9,"id":1,"author_id":1,"author":{...}}
#                                          ↑ price 还是 59.9，没被覆盖！
```

两个核心点直击：

- **分层 Schema**：`Create` 管必填校验、`Update` 全可选、`Out` 管出参与嵌套——一张表四种形状各有其主，安全边界清晰（价格校验 `gt=0` 写在 Base，三个 Schema 一起继承）
- **exclude_unset**：区分"没传"与"传 null"。若误用不带参数的 `data.model_dump()`，没传的 price 会以 `None` 被 `setattr` 上去——轻则价格被清空，重则 NOT NULL 约束报错

</details>

## 📝 本节小结

- 两套模型分工：SQLAlchemy 管存储，Pydantic（Schema）管 API 进出与安全边界
- 标准四件套：`XxxBase` / `XxxCreate` / `XxxUpdate` / `XxxOut`
- 出参 Schema 配 `model_config = ConfigDict(from_attributes=True)`，接口配 `response_model`，直接 return ORM 对象
- 入参转 ORM：`User(**data.model_dump())`；更新用 `model_dump(exclude_unset=True)`
- 嵌套 Schema 输出关系数据，务必配合 selectinload

万事俱备，组装完整接口 → [6.4 完整的 CRUD 接口](04-完整CRUD接口.md)
