# 03 Compose 常用命令

Compose 的日常操作命令不多，本章按使用场景整理。所有命令都需要在 `compose.yaml` 所在目录执行（或用 `-f` 指定文件）。

## 1. 启动与停止

```bash
# 启动全部服务（自动创建网络、卷、容器）
docker compose up -d

# 只启动某个服务（及其依赖）
docker compose up -d api

# 停止并删除容器、网络（卷和镜像保留）
docker compose down

# 停止并连命名卷一起删（数据会丢！慎用）
docker compose down -v

# 只是暂停/恢复，不删容器
docker compose stop
docker compose start
docker compose restart          # 重启全部
docker compose restart api      # 只重启 api
```

`up` 和 `start` 的区别：`up` 会对比配置，配置变了会**重建**容器；`start` 只是把停止的容器再跑起来。日常改了 `compose.yaml` 之后直接再 `up -d` 就行，Compose 会智能地只重建有变化的服务。

## 2. 代码更新后的重新部署

最常用的组合拳，改完代码发布新版本：

```bash
# 用 build 构建的服务：重新构建并重建容器
docker compose up -d --build

# 用现成镜像的服务：先拉新镜像再重建
docker compose pull
docker compose up -d
```

只想强制重建某个服务：

```bash
docker compose up -d --build --force-recreate api
```

## 3. 查看状态与日志

```bash
# 查看各服务状态（State 列是 running / exited）
docker compose ps

# 看全部服务的日志
docker compose logs

# 实时跟踪某个服务的日志（最常用）
docker compose logs -f api

# 只看最后 100 行
docker compose logs --tail 100 api

# 查看各服务资源占用
docker compose stats
```

## 4. 在服务里执行命令

```bash
# 进入 api 服务的容器开 shell
docker compose exec api bash        # 没有 bash 就换 sh

# 直接执行单条命令
docker compose exec db mysql -uroot -p123456

# 起一个一次性容器跑命令（比如数据库迁移），跑完就删
docker compose run --rm api alembic upgrade head
```

`exec` 和 `run` 的区别：`exec` 是进入**正在运行**的容器；`run` 是**新起一个**临时容器来执行命令。

## 5. 构建相关

```bash
# 手动构建（不启动）
docker compose build

# 不用缓存，完全重新构建
docker compose build --no-cache api
```

## 6. 校验与调试

```bash
# 校验 compose.yaml 语法，并输出最终生效的完整配置
# （会把 .env 变量替换成实际值，排查配置问题超好用）
docker compose config

# 查看某服务最终生效的配置
docker compose config api
```

写完配置先 `docker compose config` 检查一遍，能提前发现缩进错误、变量没定义等问题。

## 7. 多环境：用 -f 叠加配置文件

开发和生产的差异（端口、挂载、环境变量）可以拆成多个文件叠加：

```bash
# 基础配置 + 生产覆盖
docker compose -f compose.yaml -f compose.prod.yaml up -d
```

`compose.prod.yaml` 里只写差异部分，同名字段会覆盖基础文件：

```yaml
services:
  api:
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"   # 生产只绑本机，前面挡 Nginx
```

## 8. 项目名的概念

Compose 用「项目名」隔离不同项目（默认是目录名）。容器、网络、卷都会带上项目名前缀，比如 `blog-api-1`、`blog_default`。

```bash
# 指定项目名（同一套配置起多套环境时有用）
docker compose -p blog-test up -d

# 查看机器上所有 compose 项目
docker compose ls
```

## 9. 命令速查表

| 场景 | 命令 |
|------|------|
| 启动 / 后台启动 | `docker compose up -d` |
| 停止并清理 | `docker compose down` |
| 发新版（自己构建的镜像） | `docker compose up -d --build` |
| 发新版（拉远程镜像） | `docker compose pull && docker compose up -d` |
| 看状态 | `docker compose ps` |
| 追日志 | `docker compose logs -f 服务名` |
| 进容器 | `docker compose exec 服务名 bash` |
| 一次性命令 | `docker compose run --rm 服务名 命令` |
| 检查配置 | `docker compose config` |

## 小结

- 日常 90% 的操作就是 `up -d`、`down`、`ps`、`logs -f`、`exec` 这五个
- 发布新版本：自建镜像 `up -d --build`，远程镜像 `pull` + `up -d`
- `docker compose config` 是排查配置问题的利器
- `down -v` 会删卷，敲之前想清楚

到这里 Docker 和 Compose 的知识都齐了。接下来进入部署实战，把学到的东西用在真实项目上：[01-部署静态网站](../03-部署实战/01-部署静态网站.md)
