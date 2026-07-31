# 01 认识 Compose

上一部分结尾我们遇到了一个问题：起一套「应用 + 数据库」，要建网络、建卷、敲好几条长长的 `docker run`。Docker Compose 就是解决这个麻烦的。

## 1. Compose 解决什么问题

回顾一下手动起一套服务要做的事：

```bash
docker network create mynet
docker volume create mysql-data
docker run -d --name db --network mynet -e MYSQL_ROOT_PASSWORD=123456 -v mysql-data:/var/lib/mysql mysql:8.0
docker run -d --name api --network mynet -p 8000:8000 myapi:1.0
```

问题很明显：

- 命令又长又难记，重装服务器时全靠翻笔记
- 启动顺序、参数全靠人脑维护
- 没法进版本控制，团队没法共享

**Docker Compose 的思路：把这一切写进一个 YAML 文件**，然后一条命令启动整套服务：

```bash
docker compose up -d
```

## 2. 第一个 compose.yaml

把上面那套命令翻译成 Compose 文件。在项目目录下创建 `compose.yaml`：

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: "123456"
    volumes:
      - mysql-data:/var/lib/mysql

  api:
    image: myapi:1.0
    ports:
      - "8000:8000"
    depends_on:
      - db

volumes:
  mysql-data:
```

然后：

```bash
# 启动全部服务（-d 后台运行）
docker compose up -d

# 查看状态
docker compose ps

# 全部停掉并删除容器
docker compose down
```

注意我们**没有手动建网络**——Compose 会自动为这个项目创建一个专属网络，所有服务都在里面，服务名（`db`、`api`）直接当主机名互相访问。

## 3. 文件名与版本说明

两个新手常见疑问：

**文件名**：官方推荐 `compose.yaml`，同时也兼容 `compose.yml`、`docker-compose.yml`、`docker-compose.yaml`。Compose 会按这个顺序自动查找。

**顶部要不要写 `version:`**：老教程里常见 `version: "3.8"` 这样的开头，**Compose v2 已经废弃了这个字段**，写了反而会有警告。直接从 `services:` 开始写即可。

**命令**：`docker compose`（空格，v2，推荐）和 `docker-compose`(横线，v1，已停止维护）。本教程全部使用 v2。

## 4. Compose 文件的骨架

一个 Compose 文件由四大块组成：

```yaml
services:    # 核心：每个容器是一个服务
  服务名1:
    ...
  服务名2:
    ...

volumes:     # 声明命名卷（可选）
  卷名:

networks:    # 声明自定义网络（可选，通常用默认的就够）
  网络名:

configs:     # 配置文件管理（可选，进阶用法）
  ...
```

对应关系很直白：

| docker run 参数 | Compose 字段 |
|----------------|--------------|
| 镜像名 | `image` |
| `--name` | `container_name`（或默认用服务名） |
| `-p 8000:8000` | `ports` |
| `-e KEY=VALUE` | `environment` |
| `-v xxx:/path` | `volumes` |
| `--restart` | `restart` |
| `--network` | `networks`（通常省略，用默认网络） |

也就是说：**你已经会的 docker run 知识，换个写法搬进 YAML 而已**。

## 5. 服务间如何互相访问

这是 Compose 最舒服的地方，规则只有一条：

> **服务名就是主机名。**

`api` 服务连数据库，连接串直接写服务名 `db`：

```text
mysql+pymysql://root:123456@db:3306/demo
```

不需要关心 IP，不需要手动建网络，Compose 全包了。

## 6. depends_on：控制启动顺序

`depends_on` 让 `api` 在 `db` **之后**启动。但注意默认它只保证「容器启动了」，不保证「MySQL 已经能接受连接了」。要等服务真正就绪，需要配合健康检查：

```yaml
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: "123456"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 10

  api:
    image: myapi:1.0
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy   # 等 db 健康检查通过才启动
```

这个写法在部署实战部分会反复用到。

## 小结

- Compose 把多容器的启动配置写进 `compose.yaml`，一条 `docker compose up -d` 拉起整套服务
- 不需要写 `version:` 字段，用 `docker compose`（空格）命令
- Compose 自动创建项目网络，**服务名即主机名**
- `depends_on` + `healthcheck` 才能真正做到「等数据库就绪再启动应用」

下一章系统过一遍常用配置项：[02-Compose配置详解](02-Compose配置详解.md)
