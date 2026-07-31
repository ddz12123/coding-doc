# 5.2 中间件与 CORS

本章目标：理解中间件的概念，解决前端联调必遇的 CORS 跨域问题，并写一个请求日志中间件。本章较短，但 CORS 部分实战中 100% 会用到。

## 1. 什么是中间件

中间件（Middleware）是一层「包在所有接口外面」的处理逻辑，**每个请求都会经过它**：

```
请求 → 中间件A前半 → 中间件B前半 → 接口函数 → 中间件B后半 → 中间件A后半 → 响应
```

典型用途：跨域处理、请求日志、统计耗时、全局限流、压缩响应。

和依赖注入的区别：依赖是「接口按需声明」，中间件是「无差别拦截所有请求」。

## 2. CORS：前端联调必过的坎

### 现象

前端同事用 `http://localhost:5173`（Vite 开发服务器）调你的 `http://localhost:8000` 接口，浏览器控制台报错：

```
Access to fetch at 'http://localhost:8000/posts' from origin 'http://localhost:5173'
has been blocked by CORS policy...
```

### 原因

浏览器的**同源策略**：网页默认只能请求「协议+域名+端口」都相同的地址。跨域请求需要**服务器明确声明允许**——这个声明机制就是 CORS（跨域资源共享）。

注意：这是浏览器的安全机制。curl、Postman、后端之间调用都不受影响，所以「Postman 能通、前端不通」几乎必是 CORS 问题。

### 解决：CORSMiddleware

在 `app/main.py` 中：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",     # 前端开发地址
        "https://www.example.com",   # 上线后的前端域名
    ],
    allow_credentials=True,
    allow_methods=["*"],     # 允许所有 HTTP 方法
    allow_headers=["*"],     # 允许所有请求头（包括 Authorization）
)
```

参数说明：

- `allow_origins`：允许哪些来源访问。**开发时图省事可以写 `["*"]`（允许所有），但生产环境必须列明具体域名**；且 `allow_credentials=True` 时规范禁止用 `*`
- `allow_methods` / `allow_headers`：一般 `["*"]` 即可

配置好后，前端的跨域请求就能正常返回了。

## 3. 自定义中间件：请求日志

用 `@app.middleware("http")` 装饰器写一个记录每个请求耗时的中间件：

```python
import logging
import time

from fastapi import Request

logger = logging.getLogger("app.access")
logging.basicConfig(level=logging.INFO)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()

    response = await call_next(request)   # ← 调用后续处理（其他中间件和接口）

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        "%s %s → %d (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response
```

结构固定：`call_next(request)` 之前的代码在请求阶段执行，之后的代码在响应阶段执行。重启后每个请求都会打印：

```
INFO:app.access:GET /posts → 200 (12.3ms)
INFO:app.access:POST /login → 401 (45.6ms)
```

> 中间件必须用 `async def`。里面别做耗时的同步操作。

## 4. 常用现成中间件（了解）

```python
# 响应压缩：大 JSON 自动 gzip，前端加载更快
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 强制 HTTPS 跳转（生产环境）
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# 限制 Host 头，防 Host 攻击（生产环境）
from fastapi.middleware.trustedhost import TrustedHostMiddleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["api.example.com"])
```

## 本章小结

- 中间件包裹所有请求，适合日志、跨域、压缩等横切逻辑
- 前端浏览器调不通、Postman 能通 → 九成是 CORS，加 `CORSMiddleware` 解决
- 生产环境 `allow_origins` 必须写具体域名，不能用 `*`
- 自定义中间件的固定模板：处理前逻辑 → `await call_next(request)` → 处理后逻辑

下一章：[5.3 数据库迁移（Alembic）](03-数据库迁移Alembic.md)
