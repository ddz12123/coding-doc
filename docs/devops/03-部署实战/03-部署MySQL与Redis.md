# 03 部署 MySQL 与 Redis

第三个实战：用容器跑数据库。重点是**数据持久化**、**初始化脚本**和**安全配置**——数据库容器一旦配错，轻则数据丢失，重则被勒索。

## 1. compose.yaml 完整配置

```yaml
services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:3306:3306"     # 只允许本机连接；纯容器互访可整段删掉
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: blog                    # 首次启动自动建库
      MYSQL_USER: bloguser                    # 自动建业务账号
      MYSQL_PASSWORD: ${MYSQL_USER_PASSWORD}
      TZ: Asia/Shanghai
    volumes:
      - mysql-data:/var/lib/mysql             # 数据持久化（命名卷）
      - ./mysql/init:/docker-entrypoint-initdb.d:ro   # 初始化 SQL 脚本
      - ./mysql/my.cnf:/etc/mysql/conf.d/my.cnf:ro    # 自定义配置
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 30s

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "127.0.0.1:6379:6379"     # 同样只绑本机
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}", "--appendonly", "yes"]
    volumes:
      - redis-data:/data          # AOF/RDB 文件的持久化目录
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  mysql-data:
  redis-data:
```

`.env`：

```text
MYSQL_ROOT_PASSWORD=一个足够复杂的密码
MYSQL_USER_PASSWORD=另一个复杂密码
REDIS_PASSWORD=再来一个复杂密码
```

## 2. 逐项解释关键配置

### 2.1 MySQL 环境变量

官方 MySQL 镜像**首次启动**（数据卷为空时）会按环境变量自动初始化：

| 变量 | 作用 |
|------|------|
| `MYSQL_ROOT_PASSWORD` | root 密码，必填 |
| `MYSQL_DATABASE` | 自动创建的数据库 |
| `MYSQL_USER` / `MYSQL_PASSWORD` | 自动创建的业务账号，并授予上面那个库的全部权限 |

> 注意「首次」二字：这些变量只在数据卷为空时生效。改了密码变量再重启是**不会**改掉已有密码的，这是高频疑惑点。

应用连接时用业务账号 `bloguser`，不要用 root。

### 2.2 初始化脚本

挂载到 `/docker-entrypoint-initdb.d/` 的 `.sql`、`.sh` 文件会在**首次初始化**时按文件名顺序自动执行，适合放建表语句和种子数据：

```text
mysql/init/
├── 01-schema.sql     # 建表
└── 02-seed.sql       # 初始数据
```

### 2.3 自定义 MySQL 配置

`mysql/my.cnf`：

```ini
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
max_connections = 200
# 小内存服务器可以调低 InnoDB 缓冲池（默认 128M）
innodb_buffer_pool_size = 256M
```

### 2.4 Redis 的两个必配项

- `--requirepass`：**必须设密码**。无密码的 Redis 暴露公网，几小时内就会被写入挖矿任务（真实高发事故）
- `--appendonly yes`：开启 AOF 持久化，重启不丢数据

## 3. 启动与验证

```bash
docker compose up -d

# 等 healthcheck 变绿
docker compose ps

# 验证 MySQL：登进去看库建好没有
docker compose exec mysql mysql -ubloguser -p blog -e "SHOW TABLES;"

# 验证 Redis
docker compose exec redis redis-cli -a "你的密码" ping
# 返回 PONG
```

应用容器（同一个 compose 项目里）的连接串：

```text
mysql+pymysql://bloguser:密码@mysql:3306/blog
redis://:密码@redis:6379/0
```

宿主机上的程序则连 `127.0.0.1:3306` / `127.0.0.1:6379`。

## 4. 备份与恢复

数据库容器化后，备份依然不能少。

### 4.1 MySQL 备份

```bash
# 导出整库（在宿主机执行）
docker compose exec mysql mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" blog > backup_$(date +%F).sql

# 恢复
docker compose exec -T mysql mysql -uroot -p"$MYSQL_ROOT_PASSWORD" blog < backup_2026-07-31.sql
```

配合 crontab 每天凌晨自动备份：

```bash
# crontab -e 添加：
0 3 * * * cd /srv/myapp && docker compose exec -T mysql mysqldump -uroot -p密码 blog | gzip > /backup/blog_$(date +\%F).sql.gz
```

### 4.2 Redis 备份

Redis 的数据文件就在 `redis-data` 卷里，直接备份卷内容：

```bash
docker run --rm -v myapp_redis-data:/data -v /backup:/backup alpine \
  tar czf /backup/redis_$(date +%F).tar.gz -C /data .
```

## 5. 安全清单

- [ ] 端口绑定 `127.0.0.1`，或干脆不映射端口（应用在容器网络里直接访问）
- [ ] 所有密码放 `.env`，不写死在 compose 文件里
- [ ] Redis 必须 `requirepass`
- [ ] 应用使用业务账号连 MySQL，不用 root
- [ ] 自动备份 + 定期验证备份能恢复
- [ ] 升级镜像版本前先备份（`docker compose pull` 之前）

## 小结

- 数据库容器的命根子是**命名卷**：`mysql-data`、`redis-data` 在，数据就在
- MySQL 环境变量和初始化脚本只在**数据卷为空的首次启动**生效
- Redis 无密码 = 服务器送人，`requirepass` 必配
- 备份要自动化（crontab + mysqldump），并且真的试过能恢复

最后一篇把前面三篇串起来：[04-全栈项目部署](04-全栈项目部署.md)
