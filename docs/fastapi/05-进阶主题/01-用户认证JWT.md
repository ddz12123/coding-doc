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

删除接口同理加上作者检查。`crud.create_post` 相应改为接收 `author_id` 参数：

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

最后在 main.py 挂载 auth 路由：`app.include_router(auth.router)`。

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

## 本章小结

- 密码用 bcrypt 哈希存储，登录时 verify 比对；错误信息不区分「用户不存在」和「密码错」
- JWT = 服务器用密钥签名的通行证；载荷放 user_id 和过期时间，可读不可伪造
- `OAuth2PasswordBearer` 提取 Token → 自写依赖验签查用户 → `CurrentUser` 别名到处复用
- 鉴权 = 挂依赖（401 没登录），授权 = 业务检查（403 不是你的资源）
- SECRET_KEY 生产环境必须用随机值 + 环境变量

下一章：[5.2 中间件与 CORS](02-中间件与CORS.md)
