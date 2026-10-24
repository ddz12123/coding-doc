# 6.1 FastAPI 快速入门

> 在把 SQLAlchemy 接进来之前，先用 30 分钟认识 FastAPI 本身：路由、参数、Pydantic 模型、自动文档。已会 FastAPI 的读者可跳到 [6.2 依赖注入：管理数据库会话](02-依赖注入与数据库会话.md)。

## 一、FastAPI 是什么？

FastAPI 是一个现代 Python Web 框架，用来写 **HTTP API**（接收请求、返回 JSON）。三大卖点：

1. **快**：性能位居 Python 框架第一梯队
2. **类型驱动**：用 Python 类型注解自动完成参数解析、数据校验、文档生成
3. **自动文档**：代码写完，交互式 API 文档同时生成，浏览器里直接点按钮测试接口

## 二、Hello World

新建 `main.py`：

```python
from fastapi import FastAPI

app = FastAPI(title="我的第一个 API")


@app.get("/")
def read_root():
    return {"message": "Hello FastAPI"}
```

启动（`fastapi[standard]` 自带 dev 服务器）：

```bash
fastapi dev main.py
# 或者传统方式: uvicorn main:app --reload
```

- 浏览器访问 <http://127.0.0.1:8000> → 看到 JSON
- 访问 **<http://127.0.0.1:8000/docs>** → 自动生成的交互式文档（Swagger UI）✨
- `dev` 模式带自动重载：改代码保存后服务自动重启

## 三、路由与 HTTP 方法

**路由** = "什么方法 + 什么路径 → 执行哪个函数"。HTTP 方法与 CRUD 的对应是 REST API 的通用约定：

| 装饰器 | HTTP 方法 | 语义 | 例子 |
|--------|----------|------|------|
| `@app.post(path)` | POST | **增** | POST /users 创建用户 |
| `@app.get(path)` | GET | **查** | GET /users/1 查用户 |
| `@app.put(path)` / `@app.patch(path)` | PUT/PATCH | **改** | PUT /users/1 更新用户 |
| `@app.delete(path)` | DELETE | **删** | DELETE /users/1 删除用户 |

## 四、三种接收参数的方式

### ① 路径参数：URL 里的动态部分

```python
@app.get("/users/{user_id}")
def get_user(user_id: int):        # 类型注解 int → 自动转换 + 校验
    return {"user_id": user_id}
```

访问 `/users/42` → `user_id` 自动变成整数 42；访问 `/users/abc` → FastAPI 自动返回 422 参数错误，你一行校验代码都不用写。

### ② 查询参数：URL 问号后面的部分

**函数参数中没出现在路径里的，自动成为查询参数：**

```python
@app.get("/users")
def list_users(city: str | None = None, page: int = 1, page_size: int = 20):
    return {"city": city, "page": page, "page_size": page_size}
```

访问 `/users?city=北京&page=2` → `city="北京"`, `page=2`, `page_size=20`（用了默认值）。

### ③ 请求体：POST/PUT 提交的 JSON

用 **Pydantic 模型**声明结构，参数注解成该模型即可：

```python
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    email: EmailStr                          # 自动校验邮箱格式
    age: int | None = Field(default=None, ge=0, le=150)


@app.post("/users")
def create_user(data: UserCreate):
    return {"received": data.model_dump()}
```

> ⚠️ **新手坑**：`EmailStr` 依赖第三方库 `email-validator`。裸装的 `fastapi` 不带它，第一次用到 `EmailStr` 的地方会直接报 `ImportError: email-validator is not installed, see https://github.com/JoshData/python-email-validator`。解决：`pip install email-validator`，或推荐直接 `pip install "fastapi[standard]"`（已包含）。不需要邮箱格式校验时，写普通的 `email: str` 也完全可以。

客户端 POST 这样的 JSON：

```json
{"name": "张三", "email": "zs@example.com", "age": 25}
```

FastAPI 自动：解析 JSON → 校验每个字段（邮箱格式、age 范围…）→ 不合法直接返回 422 与详细错误 → 合法则变成 `data` 对象传给你。

> 📌 **Pydantic 是 FastAPI 的数据守门员**。`BaseModel` 看起来像 SQLAlchemy 模型，但职责完全不同：Pydantic 管"网络数据的校验与序列化"，SQLAlchemy 管"数据库存取"。6.3 节详讲两者怎么配合。

## 五、响应模型与状态码

```python
class UserOut(BaseModel):
    id: int
    name: str
    email: str


@app.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate):
    fake_saved = {"id": 1, "name": data.name, "email": data.email, "password": "xxx"}
    return fake_saved      # password 字段会被 response_model 自动过滤掉！
```

- `response_model=UserOut`：声明返回结构。**多余字段自动剔除**（比如密码不小心带上也出不去）、缺字段会报错、文档里自动展示返回格式
- `status_code=201`：创建成功的标准状态码（默认 200）

### 错误响应：HTTPException

```python
from fastapi import HTTPException

@app.get("/users/{user_id}")
def get_user(user_id: int):
    if user_id > 100:      # 假装查不到
        raise HTTPException(status_code=404, detail="用户不存在")
    return {"user_id": user_id}
```

常用状态码：`200` 成功 / `201` 已创建 / `204` 无内容(删除成功) / `400` 请求有误 / `401` 未登录 / `403` 无权限 / `404` 不存在 / `409` 冲突(如重复注册) / `422` 参数校验失败(FastAPI 自动) / `500` 服务器错误。

## 六、综合小练习（纯内存版用户 API）

下面是不带数据库的完整 CRUD——下一节我们就把它换成 SQLAlchemy 真存储：

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="内存版用户管理")

fake_db: dict[int, dict] = {}
next_id = 1


class UserCreate(BaseModel):
    name: str
    email: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str


@app.post("/users", response_model=UserOut, status_code=201)
def create_user(data: UserCreate):
    global next_id
    user = {"id": next_id, **data.model_dump()}
    fake_db[next_id] = user
    next_id += 1
    return user


@app.get("/users", response_model=list[UserOut])
def list_users():
    return list(fake_db.values())


@app.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int):
    if user_id not in fake_db:
        raise HTTPException(404, "用户不存在")
    return fake_db[user_id]


@app.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: int):
    if user_id not in fake_db:
        raise HTTPException(404, "用户不存在")
    del fake_db[user_id]
```

跑起来后打开 `/docs`，把四个接口都点一遍——**创建两个用户、查列表、查单个、删一个**。感受一下不写一行前端也能完整测试 API。

（这个内存版的问题显而易见：重启数据全没。这正是 SQLAlchemy 登场的理由。）

## 🎯 练习：自己动手写两个接口

第六节的综合小练习是作者写好、带你跑的；下面两道题轮到**你**写了——都在内存版 `fake_db` 上实现，写完去 `/docs` 里自测。

**练习 1：实现 PUT /users/{user_id} 全量更新**

PUT 的语义是"整条替换"：客户端必须提交完整的 name 和 email，缺字段就该返回 422。写完想一想：它和 6.3 节将讲的 PATCH 有什么本质区别？

<details><summary>参考答案</summary>

```python
class UserReplace(BaseModel):
    name: str           # 必填：PUT 不传就 422，这正是"全量"的含义
    email: str


@app.put("/users/{user_id}", response_model=UserOut)
def replace_user(user_id: int, data: UserReplace):
    if user_id not in fake_db:
        raise HTTPException(404, "用户不存在")
    fake_db[user_id] = {"id": user_id, **data.model_dump()}   # 整条替换
    return fake_db[user_id]
```

测试：`PUT /users/1` 提交 `{"name": "张三改", "email": "new@example.com"}` → 返回更新后的用户；只提交 `{"name": "张三改"}` → 422（email 缺失，Pydantic 自动拦下）。

对比：PUT 要求字段全给、整条替换；PATCH 只传要改的字段、没传的不动（6.3 节用 `exclude_unset` 实现）。分清这两个语义，REST API 才规整。

</details>

**练习 2：给 GET /users 加 keyword 名字模糊筛选**

`GET /users?keyword=张` 只返回名字里含"张"的用户；不传 keyword 时返回全部。

<details><summary>参考答案</summary>

```python
@app.get("/users", response_model=list[UserOut])
def list_users(keyword: str | None = None):     # 不在路径里 → 自动成为查询参数
    users = list(fake_db.values())
    if keyword:                                 # 传了才过滤
        users = [u for u in users if keyword in u["name"]]
    return users
```

测试：先创建"张三"、"李四"两个用户，访问 `/users?keyword=张` → 只有张三；访问 `/users` → 全部。

要点：查询参数天然可选（默认值给 `None` 即可）；"有值才加过滤条件"正是 3.3 节动态查询思想在 Web 层的翻版——换成 SQLAlchemy 就是 `stmt = stmt.where(User.name.contains(keyword))`。

</details>

## 📝 本节小结

- 路由装饰器：`@app.get/post/put/delete("/路径")`，对应查/增/改/删
- 参数三来源：路径 `{}`、查询参数（带默认值）、请求体（Pydantic 模型）
- 类型注解 = 自动解析 + 自动校验 + 自动文档
- `response_model` 定义出参并过滤多余字段；错误用 `raise HTTPException`
- `/docs` 是你最好的调试伙伴

下一节，把数据库会话优雅地接进来 → [6.2 依赖注入：管理数据库会话](02-依赖注入与数据库会话.md)
