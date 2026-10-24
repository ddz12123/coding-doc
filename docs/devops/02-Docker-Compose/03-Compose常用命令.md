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
# 查看各服务状态（STATUS 列：Up 运行中，Exited 已退出；配了 healthcheck 的服务还会带 healthy 标记）
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

`docker compose ps` 的真实输出（沿用 01 章的 demo 项目）：

```text
NAME         IMAGE       COMMAND                  SERVICE   CREATED          STATUS                    PORTS
demo-api-1   myapi:1.0   "uvicorn main:app --…"   api       36 seconds ago   Up 35 seconds             0.0.0.0:8000->8000/tcp
demo-db-1    mysql:8.0   "docker-entrypoint.s…"   db        40 seconds ago   Up 39 seconds (healthy)   3306/tcp, 33060/tcp
```

比 `docker ps` 多一个 `SERVICE` 列；db 后面的 `(healthy)` 表示健康检查已通过（没配 healthcheck 的服务不会带这个标记）。

`docker compose logs -f api` 跟踪日志的效果——每行开头是**容器名**，多个服务的日志混在一起时靠它区分，`Ctrl+C` 退出：

```text
demo-api-1  | INFO:     Started server process [1]
demo-api-1  | INFO:     Waiting for application startup.
demo-api-1  | INFO:     Application startup complete.
demo-api-1  | INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
demo-api-1  | INFO:     192.168.65.1:52844 - "GET / HTTP/1.1" 200 OK
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

它的输出就是**变量替换完成后的最终 YAML**。假设 `compose.yaml` 里写了 `MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}`、同目录 `.env` 里是 `DB_PASSWORD=123456`，那么 `docker compose config` 输出的片段：

```yaml
name: demo
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: "123456"
    networks:
      demo_default: null
# ...(其余字段略)...
networks:
  demo_default:
    name: demo_default
```

`${DB_PASSWORD}` 已经被替换成了 `"123456"`——如果输出里仍是 `${DB_PASSWORD}` 字面量，说明变量没有来源（`.env` 不在当前目录、变量名拼写不一致），一眼就能定位问题。

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

`docker compose ls` 的输出——每个项目一行，容器、网络、卷都带着项目名前缀（如 `blog-api-1`、`blog_default`），同一台机器上多项目互不干扰：

```text
NAME                STATUS       CONFIG FILES
blog                running(4)   /opt/blog/compose.yaml
blog-test           running(4)   /opt/blog/compose.yaml
fullstack-demo      exited(4)    /home/me/fullstack-demo/compose.yaml
```

上面正是 `-p` 的用法效果：同一份 `/opt/blog/compose.yaml` 起了 `blog` 和 `blog-test` 两套互不影响的环境；`STATUS` 里的数字是该项目中的容器数。

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

## 动手练习

把 [04 篇的全栈项目](04-Compose全栈实战.md) `docker compose down` 掉，再 `docker compose up -d` 重新拉起，用 `ps` 和 `logs -f` 确认整套服务恢复如常。注意 `down` 不带 `-v`，数据卷保留，MySQL / Redis 里的数据不会丢。

<details>
<summary>参考答案</summary>

```bash
cd fullstack-demo          # 进入 compose.yaml 所在目录
docker compose down        # 容器和网络被删除，卷保留
docker compose up -d       # 重新创建并启动全部服务
docker compose ps          # 四个服务（nginx/api/mysql/redis）STATUS 都是 Up
docker compose logs -f api # 看到 uvicorn 的启动日志说明 api 已恢复，Ctrl+C 退出
```

再点几次页面按钮，然后 `docker compose exec redis redis-cli get visit_count`——次数在 down 之前的基础上继续增长，说明数据确实没丢，`down` 只动容器不动数据。

</details>

## 小结

- 日常 90% 的操作就是 `up -d`、`down`、`ps`、`logs -f`、`exec` 这五个
- 发布新版本：自建镜像 `up -d --build`，远程镜像 `pull` + `up -d`
- `docker compose config` 是排查配置问题的利器
- `down -v` 会删卷，敲之前想清楚

语法和命令都齐了，接下来动手做一个五服务的综合练习：[04-Compose全栈实战](04-Compose全栈实战.md)
