# 1.3 第一个 API 程序

本章目标：写出并运行你的第一个 FastAPI 程序，学会使用自动生成的交互式文档。

## 1. Hello World

在项目目录下新建文件 `main.py`：

```python
from fastapi import FastAPI

# 创建应用实例，整个项目的核心对象
app = FastAPI()


# 定义一个接口：当有人用 GET 方法访问 "/" 时，执行下面的函数
@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}
```

逐行解释：

1. `from fastapi import FastAPI`：导入框架
2. `app = FastAPI()`：创建一个应用实例。你可以把它理解为「整个后端服务的总管家」
3. `@app.get("/")`：这是一个**装饰器**，意思是「把下面这个函数注册为一个接口，路径是 `/`，方法是 GET」。这样的函数叫**路径操作函数**（或叫视图函数、接口函数）
4. `return {"message": ...}`：直接返回 Python 字典，FastAPI 会自动转成 JSON 响应

## 2. 启动服务

在终端（确保虚拟环境已激活）执行：

```bash
fastapi dev main.py
```

> `fastapi dev` 是官方推荐的开发模式启动命令。你也会在很多教程里看到等价的老写法：
> ```bash
> uvicorn main:app --reload
> ```
> 其中 `main` 是文件名（main.py），`app` 是文件里的变量名，`--reload` 表示改代码后自动重启。两种方式效果一样。

看到类似输出说明启动成功：

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

## 3. 访问你的接口

打开浏览器访问 http://127.0.0.1:8000 ，你会看到：

```json
{"message": "Hello, FastAPI!"}
```

恭喜，你的第一个 API 跑起来了！🎉

几个说明：

- `127.0.0.1`（也叫 `localhost`）表示「本机」，`8000` 是端口号
- 浏览器地址栏访问 = 发送一个 GET 请求
- 停止服务：在终端按 `Ctrl+C`

## 4. 自动交互文档（FastAPI 的杀手锏）

保持服务运行，访问：

### http://127.0.0.1:8000/docs

这是 **Swagger UI** 交互文档。你写的每个接口都会自动出现在这里，而且**可以直接在页面上测试**：

1. 点开 `GET /` 这一条
2. 点击 `Try it out` 按钮
3. 点击 `Execute`
4. 下方会显示真实的请求和响应结果

以后我们调试接口基本都用这个页面，**请务必熟悉它**。

另外还有一个风格不同的只读文档：http://127.0.0.1:8000/redoc

## 5. 多加几个接口

修改 `main.py`，体验不同的路径和方法：

```python
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}


@app.get("/ping")
def ping():
    """健康检查接口，常用于确认服务是否存活"""
    return {"status": "ok"}


@app.get("/users")
def list_users():
    # 先用写死的假数据模拟，学了数据库后换成真数据
    return [
        {"id": 1, "name": "小明"},
        {"id": 2, "name": "小红"},
    ]


@app.post("/users")
def create_user():
    # POST 方法：注意在浏览器地址栏是无法直接测试 POST 的，要用 /docs 页面
    return {"message": "用户创建成功（假装的）"}
```

保存文件后服务会自动重启（开发模式的好处）。刷新 `/docs`，四个接口都出现了。

试着思考：

- `GET /users` 和 `POST /users` 路径相同但方法不同，是**两个不同的接口**
- 函数返回列表、字典、字符串、数字都可以，FastAPI 都能转成 JSON
- 函数的**文档字符串**（三引号注释）会显示在 `/docs` 里，养成写注释的习惯

## 6. 给文档加点信息（可选）

```python
app = FastAPI(
    title="我的第一个 API",
    description="跟着教程学习 FastAPI",
    version="0.1.0",
)
```

刷新 `/docs` 可以看到标题变了。

## 7. 常见问题

**Q: 端口被占用怎么办？**

```bash
fastapi dev main.py --port 8001
```

**Q: 改了代码没生效？**

确认用的是 `fastapi dev`（自带热重载）；看终端有没有报错，语法错误会导致重启失败。

**Q: 手机/别的电脑能访问吗？**

```bash
fastapi dev main.py --host 0.0.0.0
```

然后用你电脑的局域网 IP（如 `192.168.1.100:8000`）访问。

## 本章小结

- `app = FastAPI()` 创建应用，`@app.get("/路径")` 注册接口
- `fastapi dev main.py` 启动开发服务器，改代码自动重启
- 返回字典/列表会自动变成 JSON
- `/docs` 是自动生成的交互文档，是最重要的调试工具

下一章开始系统学习 FastAPI 的核心功能：[2.1 路径参数](../02-FastAPI基础/01-路径参数.md)
