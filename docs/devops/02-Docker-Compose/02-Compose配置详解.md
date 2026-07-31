# 02 Compose 配置详解

本章系统过一遍 `compose.yaml` 里最常用的配置项。不用背，写的时候回来查即可，但每一项都建议看一遍知道有这个东西。

## 1. image 与 build：镜像从哪来

```yaml
services:
  # 方式一：直接用现成镜像
  db:
    image: mysql:8.0

  # 方式二：从 Dockerfile 现场构建
  api:
    build: .                      # 用当前目录的 Dockerfile

  # 方式二的完整写法
  web:
    build:
      context: ./frontend         # 构建上下文目录
      dockerfile: Dockerfile.prod # 指定 Dockerfile 文件名
    image: myweb:1.0              # 构建出来的镜像叫这个名字
```

用了 `build` 的服务，改了代码后要用 `docker compose up -d --build` 重新构建。

## 2. ports：端口映射

```yaml
services:
  api:
    ports:
      - "8000:8000"             # 宿主机:容器
      - "127.0.0.1:3306:3306"   # 只绑定本机，不对公网开放
```

> YAML 的坑：端口要**加引号**。`80:80` 不加引号在某些情况下会被 YAML 解析成六十进制数字。

## 3. environment 与 env_file：环境变量

```yaml
services:
  db:
    # 写法一：直接列出
    environment:
      MYSQL_ROOT_PASSWORD: "123456"
      MYSQL_DATABASE: blog
      TZ: Asia/Shanghai

  api:
    # 写法二：从文件读取（推荐，避免密码进 Git）
    env_file:
      - .env
```

`.env` 文件内容就是普通的 `KEY=VALUE`：

```text
DATABASE_URL=mysql+pymysql://root:123456@db:3306/blog
SECRET_KEY=your-secret-key
```

> 最佳实践：`.env` 加进 `.gitignore`，仓库里放一份 `.env.example` 模板。

另外，`compose.yaml` 本身也可以引用变量（来自 shell 环境或同目录的 `.env`）：

```yaml
services:
  db:
    image: mysql:${MYSQL_VERSION:-8.0}    # 冒号减号表示默认值
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
```

## 4. volumes：挂载

和 `docker run -v` 的规则一样，带 `/` 的是路径挂载，不带的是命名卷：

```yaml
services:
  db:
    volumes:
      - mysql-data:/var/lib/mysql                 # 命名卷
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro  # 绑定挂载，只读

# 用到的命名卷必须在顶层声明
volumes:
  mysql-data:
```

> 相对路径（`./xxx`）是相对于 `compose.yaml` 所在目录，这点比 `docker run` 方便，写相对路径就行。

## 5. restart：重启策略

```yaml
services:
  api:
    restart: unless-stopped
```

| 值 | 含义 |
|----|------|
| `no` | 默认值，不自动重启 |
| `always` | 总是重启（包括宿主机重启后） |
| `unless-stopped` | 同 always，但手动 stop 的不会被拉起（**生产推荐**） |
| `on-failure` | 只在异常退出（非 0 退出码）时重启 |

## 6. depends_on 与 healthcheck：启动顺序

上一章讲过基本用法，这里给一份可以直接抄的数据库等待模板：

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: "123456"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-p123456"]
      interval: 5s        # 每 5 秒检查一次
      timeout: 3s         # 单次检查超时时间
      retries: 10         # 连续失败 10 次才算不健康
      start_period: 30s   # 启动后前 30 秒失败不计数（给 MySQL 初始化时间）

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  api:
    build: .
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
```

## 7. networks：自定义网络

默认所有服务在同一个自动创建的网络里，一般够用。需要隔离时才自定义，比如「前端能访问后端，但不能直连数据库」：

```yaml
services:
  nginx:
    image: nginx:1.25
    networks: [frontend]

  api:
    build: .
    networks: [frontend, backend]   # 两边都在，充当桥梁

  db:
    image: mysql:8.0
    networks: [backend]             # 只在后端网络，nginx 摸不到它

networks:
  frontend:
  backend:
```

## 8. 其他常用配置

```yaml
services:
  api:
    container_name: blog-api    # 固定容器名（不写则是 项目名-服务名-1）
    command: ["uvicorn", "main:app", "--host", "0.0.0.0"]  # 覆盖镜像的 CMD
    working_dir: /app           # 覆盖工作目录
    user: "1000:1000"           # 以指定用户运行
    logging:                    # 限制日志大小，防止日志把磁盘吃满
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      resources:
        limits:                 # 资源上限
          cpus: "1.0"
          memory: 512M
```

## 9. 完整示例：一份带注释的生产级模板

```yaml
services:
  api:
    build: .
    image: blog-api:1.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
    logging:
      options:
        max-size: "10m"
        max-file: "3"

  db:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: blog
      TZ: Asia/Shanghai
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 30s
    # 注意：没有 ports —— 数据库不对外暴露，只有 api 能通过内部网络访问

volumes:
  mysql-data:
```

## 小结

- `image` 用现成镜像，`build` 从 Dockerfile 构建
- 端口加引号；数据库尽量不映射端口或只绑 `127.0.0.1`
- 敏感配置放 `.env`（记得 gitignore），模板放 `.env.example`
- `restart: unless-stopped` + `healthcheck` + 日志大小限制，是生产环境三件套

下一章学习日常操作命令：[03-Compose常用命令](03-Compose常用命令.md)
