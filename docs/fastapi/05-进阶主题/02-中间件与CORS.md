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

### 用 curl 亲眼看到 Gzip 生效

中间件加了不等于生效了，实测是习惯。先发几篇文章，让 `/posts` 的响应超过 `minimum_size` 的 1000 字节，然后：

```bash
# 1) 不声明支持 gzip：拿到的是原始 JSON
curl -s http://127.0.0.1:8000/posts -o /dev/null -w "%{size_download} bytes\n"
# 9742 bytes

# 2) 请求头声明接受 gzip，-I 只看响应头
curl -H "Accept-Encoding: gzip" -I http://127.0.0.1:8000/posts
# HTTP/1.1 200 OK
# content-encoding: gzip        ← 关键证据：压缩已生效
# content-length: 1287          ← 压缩后只剩原来的一小部分
```

注意这是一场「协商」：客户端用 `Accept-Encoding: gzip` 声明自己支持，服务端才会压缩；响应小于 `minimum_size` 时也不会压（压不了几字节，白费 CPU）。浏览器发请求默认就带这个头，所以线上用户自动受益，前端一行代码都不用改。

## 5. 练习

### 练习 1：给所有响应加版本头

写一个中间件，让每个响应都带上 `X-App-Version: 1.0.0` 响应头。提示：`call_next` 返回的就是 response 对象，可以直接改它的 `headers`。完成后用 `curl -I` 验证。

<details><summary>参考答案</summary>

```python
# app/main.py
from fastapi import Request

APP_VERSION = "1.0.0"


@app.middleware("http")
async def add_version_header(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-App-Version"] = APP_VERSION
    return response
```

```bash
curl -I http://127.0.0.1:8000/
# HTTP/1.1 200 OK
# x-app-version: 1.0.0        ← 每个响应都带上了
```

实际用途：排查线上问题时先看这个头，就知道流量打到的是哪个版本；灰度发布新旧两套服务时，也能用它区分请求落在哪套上。

</details>

### 练习 2：日志中间件跳过 /docs 请求

第 3 节的日志中间件会把 /docs、/openapi.json 这类文档请求也记进日志，刷屏又没有分析价值。请给它加上「文档相关请求不打日志」的逻辑，但请求本身要正常放行。提示：`request.url.path.startswith(...)`。

<details><summary>参考答案</summary>

```python
@app.middleware("http")
async def log_requests(request: Request, call_next):
    # /docs 前缀同时覆盖 /docs 和 /docs/oauth2-redirect；startswith 可传元组
    if request.url.path.startswith(("/docs", "/openapi.json", "/redoc")):
        return await call_next(request)   # 放行，但不记日志

    start = time.perf_counter()
    response = await call_next(request)
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

两个细节：

1. 「跳过」指的是跳过**记日志**，不是拦掉请求——所以直接 `return await call_next(request)` 让它正常走完，而不是返回 404 或空响应
2. `startswith` 接受元组参数，一条判断就能覆盖多个前缀，比写一串 `or` 干净

</details>

## 本章小结

- 中间件包裹所有请求，适合日志、跨域、压缩等横切逻辑
- 前端浏览器调不通、Postman 能通 → 九成是 CORS，加 `CORSMiddleware` 解决
- 生产环境 `allow_origins` 必须写具体域名，不能用 `*`
- 自定义中间件的固定模板：处理前逻辑 → `await call_next(request)` → 处理后逻辑

下一章：[5.3 数据库迁移（Alembic）](03-数据库迁移Alembic.md)
