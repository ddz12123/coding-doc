# 5.1 用户认证（JWT）

本章目标：给博客项目加上真正的注册登录：密码加密存储、登录颁发 JWT Token、接口鉴权（发文章必须登录，且只能改删自己的文章）。这是本教程最有挑战性的一章，慢慢来。

## 1. 原理：Token 认证是怎么回事

HTTP 是无状态的——服务器不会「记住」你登录过。主流解决方案是 **Token**：

```
1. 登录：客户端发用户名密码 → 服务器验证通过 → 签发一个 Token（一串加密字符串）
2. 之后每次请求：客户端在请求头带上 Token
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
3. 服务器验证 Token 有效 → 知道你是谁 → 放行
```

**JWT**（JSON Web Token）是最常用的 Token 格式，由三段组成：`头部.载荷.签名`。载荷里存着用户标识和过期时间；签名用服务器的**密钥**生成——没有密钥就伪造不了，所以服务器不用存储 Token，验签即可信任。

> 注意：JWT 的载荷只是 Base64 编码，**不是加密**，任何人都能解码看到内容。所以载荷里只放用户 id 这类标识，绝不放敏感信息。

## 2. 安装依赖

```bash
pip install pyjwt "pwdlib[bcrypt]"
```

- `pyjwt`：生成和验证 JWT
- `pwdlib[bcrypt]`：密码哈希库（FastAPI 官方文档当前推荐；老教程用的 passlib 已停止维护）

## 3. 为什么密码必须哈希存储

**绝不能明文存密码**。数据库一旦泄露，用户在其他网站的同密码账号全部遭殃。正确做法：存储密码的 **bcrypt 哈希**——单向、不可逆、每次加盐（同一密码两次哈希结果不同），验证时用专门的 verify 函数比对。

## 4. app/security.py（新文件）

把安全相关的工具集中在一个文件：

```python
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

# ---------- 密码哈希 ----------

password_hash = PasswordHash.recommended()   # 默认使用 bcrypt 系算法


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return password_hash.verify(plain, hashed)


# ---------- JWT ----------

# 密钥：签名用。生产环境必须换成随机长字符串并放环境变量！
# 生成方法：python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24   # Token 有效期：1 天


def create_access_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),   # subject：JWT 规范要求是字符串
        "exp": datetime.now(timezone.utc)
        + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """验证 Token，成功返回 user_id，失败（过期/伪造）返回 None"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None
```

然后**替换掉 crud.py 里的假哈希函数**：

```python
# app/crud.py 顶部删掉原来的 hash_password，改为导入真实现
from app.security import hash_password
```

> 注意：之前用假哈希创建的用户没法用新逻辑登录，学习环境直接删掉 blog.db 重来即可。

## 5. 登录接口：app/routers/auth.py（新文件）

FastAPI 对 OAuth2 密码模式有内置支持，登录接口按规范接收**表单**（这就是第二部分表单章节的伏笔）：

```python
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app import crud
from app.database import SessionDep
from app.security import create_access_token, verify_password

router = APIRouter(tags=["认证"])


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=Token)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: SessionDep,
):
    """登录：用户名 + 密码 → Token"""
    user = crud.get_user_by_username(db, form.username)
    # 注意：用户不存在和密码错误返回同一句话，不给攻击者探测用户名的机会
    if user is None or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="账号已被禁用")
    return Token(access_token=create_access_token(user.id))
```

`OAuth2PasswordRequestForm` 是 FastAPI 内置的依赖，自动解析表单里的 `username` 和 `password` 字段。

## 6. 鉴权依赖：获取当前登录用户

这是本章的核心——写一个依赖，任何接口挂上它就自动要求登录：

```python
# app/deps.py（新文件，存放公共依赖）
from typing import Annotated

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer

from app import crud, models
from app.database import SessionDep
from app.security import decode_access_token

# tokenUrl 指向登录接口，让 /docs 知道去哪拿 Token（右上角会出现 Authorize 按钮）
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: SessionDep,
) -> models.User:
    """从请求头解析 Token → 返回当前登录用户。失败一律 401。"""
    user_id = decode_access_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="无效或过期的登录凭证",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = crud.get_user(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="用户不存在或已禁用")
    return user


# 类型别名：接口里写 current_user: CurrentUser 即可
CurrentUser = Annotated[models.User, Depends(get_current_user)]
```

`OAuth2PasswordBearer` 做的事很简单：从请求头 `Authorization: Bearer xxx` 里取出 xxx；没带这个头直接 401。后面的验签、查用户是我们自己写的。

## 7. 改造文章接口：登录才能发、只能动自己的

修改 `app/routers/posts.py`：

```python
from app.deps import CurrentUser

# 发文章：不再让前端传 author_id，作者就是当前登录用户
# （记得把 schemas.PostCreate 里的 author_id 字段删掉）
@router.post("", response_model=schemas.PostOut, status_code=status.HTTP_201_CREATED)
def create_post(post_in: schemas.PostCreate, db: SessionDep, current_user: CurrentUser):
    return crud.create_post(db, post_in, author_id=current_user.id)


# 改文章：必须是作者本人
@router.patch("/{post_id}", response_model=schemas.PostOut)
def update_post(
    post_id: int, post_in: schemas.PostUpdate, db: SessionDep, current_user: CurrentUser
):
    post = crud.get_post(db, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="文章不存在")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能修改自己的文章")
    return crud.update_post(db, post, post_in)
```

删除接口同理加上作者检查，完整代码如下（对照 4.4 章，就是在原有 404 检查后面多一层 403）：

```python
@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: SessionDep, current_user: CurrentUser):
    """删除文章（仅作者本人）"""
    post = crud.get_post(db, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="文章不存在")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能删除自己的文章")
    crud.delete_post(db, post)
```

改完后 DELETE /posts/{post_id} 一共四种结果，层层递进：

| 请求情况 | 状态码 | 由谁拦下 |
|---|---|---|
| 没带 Token | 401 | `CurrentUser` 依赖 |
| 文章不存在 | 404 | 第一层 if |
| 登录了但不是作者 | 403 | 第二层 if |
| 作者本人删除 | 204 | 成功 |

`crud.create_post` 相应改为接收 `author_id` 参数：

```python
def create_post(db: Session, post_in: schemas.PostCreate, author_id: int) -> models.Post:
    post = models.Post(
        title=post_in.title,
        content=post_in.content,
        published=post_in.published,
        author_id=author_id,
        tags=get_or_create_tags(db, post_in.tags),
    )
    ...
```

再加一个经典的「我是谁」接口（放 routers/users.py，注意放在 `/{user_id}` 之前！）：

```python
from app.deps import CurrentUser

@router.get("/me", response_model=schemas.UserOut)
def read_me(current_user: CurrentUser):
    return current_user
```

最后在 main.py 挂载 auth 路由。在原有代码基础上加 `auth` 一处导入、一行挂载：

```python
# app/main.py
from app.routers import auth, posts, users   # ← 导入列表里加上 auth

app.include_router(users.router)
app.include_router(posts.router)
app.include_router(auth.router)              # ← 新增：提供 POST /login
```

挂载后重启服务，打开 /docs 能看到「认证」分组下多了 POST /login；因为 deps.py 里配了 `tokenUrl="/login"`，页面右上角也出现了 Authorize 按钮——三处配置环环相扣。

## 8. 在 /docs 里测试完整流程

1. POST /users 注册一个新用户
2. 点击页面**右上角的 Authorize 按钮**，输入用户名密码 → 登录成功后，Swagger 会自动在后续请求带上 Token
3. GET /users/me → 返回你自己的信息
4. POST /posts 发文章 → 成功，author 是你
5. 点 Authorize 里的 Logout 后再发 → 401
6. 用另一个账号登录，PATCH 第一个人的文章 → 403

也可以用命令行体验原始流程：

```bash
# 登录拿 token（表单格式）
curl -X POST http://127.0.0.1:8000/login -d "username=xiaoming&password=123456"

# 带 token 访问
curl http://127.0.0.1:8000/users/me -H "Authorization: Bearer <粘贴token>"
```

## 9. 练习

### 练习 1：实现 PATCH /users/me（只能改自己的资料）

4.3 章的 PATCH /users/{user_id} 谁都能改任何用户，配上本章的认证后明显不合理。请用 `CurrentUser` 依赖实现一个「修改自己资料」的接口。提示：路由要放在 `/{user_id}` 之前；schemas 里已有现成的 `UserUpdate` 可直接复用。

<details><summary>参考答案</summary>

```python
# app/routers/users.py 新增（放在 @router.get("/{user_id}") 之前！）
# 文件顶部确保有：from app.deps import CurrentUser

@router.patch("/me", response_model=schemas.UserOut)
def update_me(
    user_in: schemas.UserUpdate, current_user: CurrentUser, db: SessionDep
):
    """修改自己的资料（用户名/邮箱，只改传了的字段）"""
    # 改用户名要先查重，逻辑与 4.3 章的 update_user 相同
    if user_in.username and user_in.username != current_user.username:
        if crud.get_user_by_username(db, user_in.username):
            raise HTTPException(status_code=409, detail="用户名已存在")
    return crud.update_user(db, current_user, user_in)
```

验证流程：登录 → PATCH /users/me 传 `{"email": "new@qq.com"}` → 返回 200 → GET /users/me 确认邮箱变了；再试试不登录直接改 → 401。

这个接口天然「只能改自己」——它根本不接收 user_id 参数，操作对象永远是 `current_user`，别人想改你的资料，连指定目标的入口都没有。这就是设计上的安全：不靠检查「是不是本人」，而是「只可能操作本人」。

</details>

### 练习 2：验证过期 Token 返回 401

把 `app/security.py` 里的 `ACCESS_TOKEN_EXPIRE_MINUTES` 改成 `0`，重启后重新登录拿 Token，立刻访问 GET /users/me，观察返回什么？测完记得改回原值。进阶：能说清这个 401 是从哪一步抛出来的吗？

<details><summary>参考答案</summary>

```python
# app/security.py
ACCESS_TOKEN_EXPIRE_MINUTES = 0   # Token 一签发就过期
```

```bash
# 1. 登录照常拿到 token（签发时不检查有效期，所以这一步不会报错）
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/login \
  -d "username=xiaoming&password=123456" \
  | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. 立刻访问
curl -i http://127.0.0.1:8000/users/me -H "Authorization: Bearer $TOKEN"
# HTTP/1.1 401 Unauthorized
# {"detail":"无效或过期的登录凭证"}
```

401 的来路：Token 签名虽然合法，但 `jwt.decode` 发现 `exp` 已过，抛出 `ExpiredSignatureError`（`InvalidTokenError` 的子类）→ `decode_access_token` 捕获后返回 None → `get_current_user` 里第一个检查把它变成 401。

不想重启改配置的话，也可以手工签发一个「昨天就过期」的 Token 来测：

```python
# make_expired_token.py，放项目根目录，运行：python make_expired_token.py
from datetime import datetime, timedelta, timezone

import jwt

from app.security import ALGORITHM, SECRET_KEY

payload = {
    "sub": "1",   # 假装是 1 号用户
    "exp": datetime.now(timezone.utc) - timedelta(seconds=1),
}
print(jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM))
```

把输出的 Token 塞进请求头，同样得到 401——签名能对上，但过期就是不行。

</details>

### 练习 3（思考题）：JWT 如何实现「退出登录」？

传统 Session 登录是「退出 = 删服务器上的会话记录」。但 JWT 的服务器根本不存 Token——那「退出登录」该怎么实现？再想深一层：客户端删了 Token，万一 Token 已经泄露，还能防住吗？

<details><summary>参考答案</summary>

JWT 是无状态的：服务器只验签，不记录「谁还登录着」，所以标准做法是纯客户端行为：

1. **客户端删除 Token**——清掉 localStorage（或内存）里保存的值，之后的请求不再带 `Authorization` 头，等效于退出
2. **配合较短的过期时间**（如 30 分钟～2 小时），即使 Token 残留或泄露，能作恶的窗口也有限；敏感操作可再加二次验证

但这有个天生缺口：Token 在过期前始终有效，一旦泄露，即使用户点了「退出」，拿到 Token 的人照样能用。要做到「服务端立刻作废」，需要**黑名单机制**——退出时把该 Token（或载荷里的 jti 标识）写入 Redis 并设置与 Token 相同的剩余存活时间，`get_current_user` 验签之后再查一步「是否在黑名单」。

黑名单等于给无状态 JWT 加回了状态，增加了一跳查询成本，通常只有支付、账号安全这类高要求场景才值得上。日常项目：客户端删 Token + 短过期时间，已经够用。

</details>

## 本章小结

- 密码用 bcrypt 哈希存储，登录时 verify 比对；错误信息不区分「用户不存在」和「密码错」
- JWT = 服务器用密钥签名的通行证；载荷放 user_id 和过期时间，可读不可伪造
- `OAuth2PasswordBearer` 提取 Token → 自写依赖验签查用户 → `CurrentUser` 别名到处复用
- 鉴权 = 挂依赖（401 没登录），授权 = 业务检查（403 不是你的资源）
- SECRET_KEY 生产环境必须用随机值 + 环境变量

下一章：[5.2 中间件与 CORS](02-中间件与CORS.md)
