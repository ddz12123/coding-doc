# 04 Dockerfile 编写

前面用的都是别人做好的镜像。这一章学习 Docker 最核心的技能：用 **Dockerfile** 把自己的应用打包成镜像。

## 1. Dockerfile 是什么

Dockerfile 是一个纯文本文件（文件名就叫 `Dockerfile`，没有后缀），里面按顺序写着「构建镜像的步骤」。Docker 读取它，一步步执行，最终产出一个镜像。

先看一个最小的例子——把一个 Python 脚本打包成镜像：

```dockerfile
# 基础镜像：在官方 Python 镜像的基础上构建
FROM python:3.12-slim

# 设置工作目录（后续命令都在这个目录下执行）
WORKDIR /app

# 把当前目录的 app.py 复制到镜像的 /app/ 下
COPY app.py .

# 容器启动时执行的命令
CMD ["python", "app.py"]
```

配套的 `app.py`：

```python
print("Hello from my first image!")
```

构建并运行：

```bash
# -t 给镜像起名字，最后的 . 表示构建上下文是当前目录
docker build -t my-app:1.0 .

docker run --rm my-app:1.0
# 输出：Hello from my first image!
```

## 2. 常用指令详解

| 指令 | 作用 | 示例 |
|------|------|------|
| `FROM` | 指定基础镜像，必须是第一条指令 | `FROM python:3.12-slim` |
| `WORKDIR` | 设置工作目录，不存在会自动创建 | `WORKDIR /app` |
| `COPY` | 把文件从构建上下文复制进镜像 | `COPY . .` |
| `RUN` | 构建时执行命令（装依赖、编译等） | `RUN pip install -r requirements.txt` |
| `ENV` | 设置环境变量 | `ENV TZ=Asia/Shanghai` |
| `EXPOSE` | 声明容器监听的端口（仅文档作用） | `EXPOSE 8000` |
| `CMD` | 容器启动时的默认命令，只能有一条 | `CMD ["uvicorn", "main:app"]` |
| `ENTRYPOINT` | 也是启动命令，与 CMD 配合使用 | `ENTRYPOINT ["python"]` |
| `ARG` | 构建时变量（只在构建阶段有效） | `ARG VERSION=1.0` |

几个容易混淆的点：

- **RUN vs CMD**：`RUN` 在**构建镜像时**执行（比如安装依赖），`CMD` 在**容器启动时**执行（比如启动服务）
- **COPY vs ADD**：功能类似，`ADD` 额外支持解压 tar 包和下载 URL，日常**用 COPY 就够了**
- **CMD 写成 JSON 数组形式**（exec 格式）是推荐写法，如 `CMD ["python", "app.py"]`

## 3. 一个真实的例子：打包 FastAPI 应用

项目结构：

```text
myapi/
├── main.py
├── requirements.txt
└── Dockerfile
```

`requirements.txt`：

```text
fastapi==0.110.0
uvicorn[standard]==0.29.0
```

`main.py`：

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello Docker"}
```

`Dockerfile`：

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# 先只复制依赖清单并安装 —— 利用构建缓存（见第 4 节）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 再复制项目代码
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

> 注意 `--host 0.0.0.0`：容器里的服务必须监听 `0.0.0.0` 而不是 `127.0.0.1`，否则从容器外面访问不到。这是新手第一大坑。

构建运行：

```bash
docker build -t myapi:1.0 .
docker run -d --name myapi -p 8000:8000 myapi:1.0
# 浏览器访问 http://localhost:8000
```

## 4. 构建缓存：为什么先 COPY requirements.txt

Dockerfile 的每条指令会生成一「层」，Docker 会缓存每一层。**只要某一层的输入没变，就直接用缓存**；一旦某层变了，它后面的所有层都要重新执行。

代码天天改，但依赖不常变。所以把「复制依赖清单 + 安装依赖」放在「复制代码」前面：

- 只改代码重新构建：依赖安装那层直接命中缓存，几秒钟构建完
- 如果写成先 `COPY . .` 再装依赖：每次改一行代码都要重新装一遍所有依赖

眼见为实。用第 3 节的 FastAPI 项目构建两次：

**第一次构建**，所有层都要执行，`pip install` 那层真的在下载安装，耗时接近一分钟：

```text
$ docker build -t myapi:1.0 .
[+] Building 58.3s (11/11) FINISHED
 => [internal] load build definition (Dockerfile)
 => [1/5] FROM docker.io/library/python:3.12-slim
 => [2/5] WORKDIR /app
 => [3/5] COPY requirements.txt .
 => [4/5] RUN pip install --no-cache-dir -r requirements.txt   32.1s
 => [5/5] COPY . .
 => exporting to image
 => => naming to docker.io/library/myapi:1.0
```

然后只改一行 `main.py`，**再构建一次**：依赖层前面没有任何变化，直接命中缓存：

```text
$ docker build -t myapi:1.0 .
[+] Building 2.4s (11/11) FINISHED
 => [internal] load build definition (Dockerfile)
 => [1/5] FROM docker.io/library/python:3.12-slim
 => [2/5] WORKDIR /app
 => [3/5] COPY requirements.txt .
 => CACHED [4/5] RUN pip install --no-cache-dir -r requirements.txt
 => [5/5] COPY . .
 => exporting to image
 => => naming to docker.io/library/myapi:1.0
```

对比关键行：第一次是 `=> [4/5] RUN pip install ... 32.1s`（真跑了 32 秒），第二次变成 `=> CACHED [4/5] RUN pip install ...`（0 秒，直接复用）。整个构建从一分钟缩短到两秒——这就是 Dockerfile 最重要的优化技巧。

反过来想也一样：如果要求你改 `requirements.txt` 里任何一个字符，第 4 层缓存立即失效，它后面所有层（包括 `COPY . .`）都会重跑。

## 5. .dockerignore：别把垃圾打进镜像

构建时 Docker 会把整个构建上下文（`docker build` 最后那个目录）发送给 Docker 引擎。在项目根目录创建 `.dockerignore` 文件排除不需要的内容：

```text
.git
.venv
__pycache__
*.pyc
node_modules
.env
*.log
```

好处：构建更快、镜像更小，还能避免把 `.env` 这类敏感文件打进镜像。

## 6. 多阶段构建：让镜像瘦下来

编译型语言（Go、前端项目等）构建时需要一大堆工具链，但运行时并不需要。**多阶段构建**用一个镜像负责编译，把产物拷贝到一个干净的小镜像里运行。

以 Go 项目为例：

```dockerfile
# ---- 第一阶段：编译 ----
FROM golang:1.22 AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server .

# ---- 第二阶段：运行 ----
FROM alpine:3.19
WORKDIR /app
# 只把编译产物从上一阶段拷过来
COPY --from=builder /src/server .
EXPOSE 8080
CMD ["./server"]
```

效果对比：直接用 `golang:1.22` 镜像跑，体积约 1GB+；多阶段构建后最终镜像只有 20MB 左右。

前端项目同理：Node 镜像里 `npm run build`，产物拷进 Nginx 镜像（部署实战第 01 篇就是完整例子）。

## 7. 镜像标签管理

```bash
# 构建时打多个标签
docker build -t myapi:1.2.0 -t myapi:latest .

# 给已有镜像追加标签（推送到私有仓库前常用）
docker tag myapi:1.2.0 registry.example.com/team/myapi:1.2.0

# 推送到仓库
docker push registry.example.com/team/myapi:1.2.0
```

推送也按层进行，回显里能看到每一层的进度；仓库里已有的层会显示 `Layer already exists`，秒过：

```text
The push refers to repository [registry.example.com/team/myapi]
d4f1a2b3c4d5: Pushed
e5a6b7c8d9e0: Pushed
f0a1b2c3d4e5: Layer already exists
a1b2c3d4e5f6: Layer already exists
1.2.0: digest: sha256:8b3f1c2d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1 size: 1163
```

最后一行的 `digest` 是镜像内容的指纹：别人拉取这个镜像时看到的 digest 与这里一致，就说明拿到的是同一份镜像。

## 动手练习

把一个最简 Flask 应用打包成镜像并跑通。要求：`app.py` 只有一个路由、返回一句话；依赖和代码分开复制（用上构建缓存）；构建后运行容器，用 `curl` 验证返回内容。

<details>
<summary>参考答案</summary>

`app.py`：

```python
from flask import Flask

app = Flask(__name__)

@app.get("/")
def index():
    return "Hello Flask in Docker"
```

`requirements.txt`：

```text
flask==3.0.3
```

`Dockerfile`（结构和第 3 节的 FastAPI 完全一致：先复制依赖清单装依赖，再复制代码）：

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000
CMD ["flask", "run", "--host", "0.0.0.0", "--port", "5000"]
```

构建并验证：

```bash
docker build -t myflask:1.0 .
docker run -d --name myflask -p 5000:5000 myflask:1.0
curl http://localhost:5000
# Hello Flask in Docker
```

注意 `--host 0.0.0.0` 是传给 `flask run` 的参数——和第 3 节 uvicorn 是同一个坑，漏了它 curl 会连不上。

</details>

## 小结

- Dockerfile 描述构建步骤：`FROM` 打底 → `COPY`/`RUN` 装依赖放代码 → `CMD` 定启动命令
- **先复制依赖清单装依赖，再复制代码**，充分利用构建缓存
- 服务必须监听 `0.0.0.0`，否则容器外访问不到
- 用 `.dockerignore` 排除无关文件，用**多阶段构建**减小镜像体积

下一章解决数据保存和容器互联问题：[05-数据卷与网络](05-数据卷与网络.md)
