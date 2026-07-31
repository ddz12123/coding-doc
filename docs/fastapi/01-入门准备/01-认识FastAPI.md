# 1.1 认识 FastAPI

在写第一行代码之前，我们先花几分钟搞清楚几个基本概念。如果你已经知道什么是 API、什么是 HTTP，可以快速浏览本节。

## 1. 什么是 Web API？

想象你在用一个手机 App 查天气：

1. 你点击「刷新」按钮
2. App 向某个服务器发送一个请求：「给我北京今天的天气」
3. 服务器查询数据后，返回一段数据：`{"city": "北京", "temp": 25, "weather": "晴"}`
4. App 把这段数据渲染成漂亮的界面给你看

其中第 2、3 步之间的「约定」就是 **API**（Application Programming Interface，应用程序接口）。服务器上负责接收请求、返回数据的那个程序，就是我们要学着写的**后端**。

**我们学 FastAPI，就是学怎么写这个"接收请求、处理数据、返回结果"的服务器程序。**

## 2. HTTP 基础：请求和响应

浏览器（或 App）和服务器之间用 **HTTP 协议**通信。你只需要先记住这几个概念：

### 请求（Request）由这几部分组成

- **URL**：请求的地址，比如 `https://api.example.com/users/1`
- **方法（Method）**：表明你想干什么，最常用的有：

| 方法 | 语义 | 例子 |
|------|------|------|
| GET | 获取数据 | 查询用户列表 |
| POST | 创建数据 | 注册一个新用户 |
| PUT / PATCH | 修改数据 | 修改用户昵称 |
| DELETE | 删除数据 | 删除一篇文章 |

- **请求体（Body）**：POST/PUT 时携带的数据，通常是 JSON 格式
- **请求头（Headers）**：附加信息，比如身份令牌

### 响应（Response）由这几部分组成

- **状态码（Status Code）**：

| 状态码 | 含义 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 404 | 找不到资源 |
| 422 | 请求数据格式不对（FastAPI 校验失败时返回这个） |
| 500 | 服务器内部出错（你的代码抛异常了） |

- **响应体**：返回的数据，通常也是 JSON

### 什么是 JSON？

JSON 是前后端之间传数据最常用的格式，长得跟 Python 的字典非常像：

```json
{
  "id": 1,
  "name": "小明",
  "tags": ["python", "fastapi"],
  "is_active": true
}
```

区别只有几点：JSON 用 `true/false/null`，Python 用 `True/False/None`；JSON 的字符串必须用双引号。FastAPI 会自动帮你在 Python 对象和 JSON 之间转换，你几乎不用手动处理。

## 3. FastAPI 是什么？

FastAPI 是一个用 Python 编写 Web API 的**框架**。所谓框架，就是把大量重复的底层工作（解析 HTTP 请求、路由分发、数据转换等）都做好了，你只需要专注写业务逻辑。

一个最简单的 FastAPI 接口长这样（下一章会教你跑起来）：

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/hello")
def say_hello():
    return {"message": "你好，FastAPI！"}
```

就这几行，你就拥有了一个能通过 `http://localhost:8000/hello` 访问的接口。

## 4. 为什么选 FastAPI？

Python 的 Web 框架有很多（Django、Flask、FastAPI 等），FastAPI 是近几年最受欢迎的，因为：

1. **快**：性能在 Python 框架里名列前茅（基于异步的 Starlette）。
2. **自动数据校验**：你声明参数类型，FastAPI 自动校验请求数据，不合法直接返回清晰的错误信息，省掉大量 if-else。
3. **自动生成交互文档**：写完接口，浏览器打开 `/docs` 就有一个能直接点击测试的文档页面，前端同事会爱死你。
4. **类型提示友好**：全面拥抱 Python 类型注解，编辑器补全体验极佳。
5. **学习曲线平缓**：比 Django 简单得多，比 Flask 更现代。

## 5. SQLAlchemy 又是什么？

API 接收到数据后总要存起来（比如用户注册信息），这就需要**数据库**。

SQLAlchemy 是 Python 最流行的数据库工具库（ORM）。它让你**用 Python 类和对象来操作数据库**，而不用手写 SQL 语句。比如：

```python
# 不用写 SQL: INSERT INTO users (name) VALUES ('小明')
user = User(name="小明")
db.add(user)
db.commit()
```

关于数据库和 ORM 的详细介绍，我们放在第三部分再讲。现在你只需要知道：

> **FastAPI 负责「接收请求、返回响应」，SQLAlchemy 负责「读写数据库」，两者配合就是一个完整的后端。**

## 6. 学完能做什么？

学完本教程，你能独立开发：

- 各类管理系统的后端（用户管理、商品管理……）
- 小程序 / App 的服务端接口
- 博客、论坛类网站的 API
- 给你的 Python 脚本 / AI 模型套一层 HTTP 接口对外提供服务

## 本章小结

- API 就是服务器对外提供的「数据接口」，前端发请求，后端返回 JSON
- HTTP 方法：GET 查、POST 增、PUT 改、DELETE 删
- FastAPI 是写 API 的框架，SQLAlchemy 是操作数据库的库
- 两者结合 = 完整后端

下一章：[1.2 环境搭建](02-环境搭建.md)，把开发环境装好。
