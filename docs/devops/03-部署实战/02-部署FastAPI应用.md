# 02 部署 FastAPI 应用

第二个实战：部署一个 Python 后端（以 FastAPI 为例，Flask / Django 思路完全一样），涵盖生产级 Dockerfile、环境变量管理和更新流程。

## 1. 项目结构

```text
myapi/
├── app/
│   ├── __init__.py
│   ├── main.py
│   └── ...
├── requirements.txt
├── Dockerfile
├── .dockerignore
├── .env                # 生产配置（不进 Git）
├── .env.example        # 配置模板（进 Git）
└── compose.yaml
```

## 2. 生产级 Dockerfile

```dockerfile
FROM python:3.12-slim

# 基础环境变量：不生成 pyc、日志直接输出不缓冲
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Shanghai

WORKDIR /app

# 先装依赖，利用缓存
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    -i https://pypi.tuna.tsinghua.edu.cn/simple

# 再拷代码
COPY . .

# 创建非 root 用户运行，安全性更好
RUN useradd -m appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

几个生产要点：

- `PYTHONUNBUFFERED=1`：让 `print` 和日志实时出现在 `docker logs` 里，不然日志会「延迟」
- 用国内 PyPI 镜像加速依赖安装
- **非 root 用户运行**：万一应用被攻破，攻击者拿到的也不是容器内 root
- `--workers 2`：多进程，一般设为 CPU 核数，1 核小服务器写 1 或 2

## 3. .dockerignore

```text
.git
.venv
__pycache__
*.pyc
.env
*.log
*.db
```

> `.env` 一定要排除——配置通过 Compose 的 `env_file` 注入，而不是打进镜像。镜像可能被推到仓库，里面藏着密码就泄露了。

## 4. 环境变量设计

`.env.example`（进 Git，给队友看要配哪些项）：

```text
DATABASE_URL=mysql+pymysql://user:password@db:3306/mydb
SECRET_KEY=change-me
DEBUG=false
```

服务器上复制一份改成真实值：

```bash
cp .env.example .env
vim .env
```

应用代码里用 `os.getenv()` 或 pydantic-settings 读取，做到**代码不改，换环境只换 .env**。

## 5. compose.yaml

```yaml
services:
  api:
    build: .
    image: myapi:1.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"   # 只绑本机，公网流量走 Nginx（见下文）
    env_file:
      - .env
    logging:
      options:
        max-size: "10m"
        max-file: "3"
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 30s
      timeout: 5s
      retries: 3
```

配套在 FastAPI 里加个健康检查接口：

```python
@app.get("/health")
def health():
    return {"status": "ok"}
```

## 6. 部署与验证

```bash
docker compose up -d --build

# 验证
docker compose ps                 # STATUS 应为 Up (healthy)
docker compose logs -f api        # 看启动日志
curl http://127.0.0.1:8000/health # {"status":"ok"}
```

## 7. 前面挡一层 Nginx（推荐）

后端一般不直接裸奔在公网，前面放 Nginx 做反向代理，好处：HTTPS 证书、限流、静态文件、多应用共用 80 端口。

宿主机 Nginx 的配置示例（Nginx 也可以容器化，见第 04 篇全栈部署）：

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

这就是为什么 compose 里端口绑的是 `127.0.0.1:8000`：公网只暴露 Nginx 的 80/443，后端藏在本机。

## 8. 日常更新流程

```bash
git pull
docker compose up -d --build
docker compose logs -f api    # 盯一眼启动日志确认没报错
```

有数据库迁移（Alembic）的话，在重建之后跑一次：

```bash
docker compose exec api alembic upgrade head
```

## 小结

- 生产 Dockerfile 四件事：`PYTHONUNBUFFERED`、国内源、非 root 用户、多 worker
- 配置走 `.env` + `env_file`，镜像里永远不放密码
- 端口只绑 `127.0.0.1`，公网流量经 Nginx 反代
- 加 `/health` 接口配合 healthcheck，`docker compose ps` 一眼看出服务是否健康

下一篇部署编译型语言的代表：[03-部署Go应用](03-部署Go应用.md)
