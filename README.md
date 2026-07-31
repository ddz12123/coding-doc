# 编程学习文档

基于 [Docusaurus](https://docusaurus.io/) 搭建的中文编程教程站，包含 Python / Go / MySQL / Redis / FastAPI / SQLAlchemy 六套从入门到实战的系列教程。

## 目录结构

```
docs/
├── python/        # Python 教程
├── go/            # Go 教程
├── mysql/         # MySQL 教程
├── redis/         # Redis 教程
├── fastapi/       # FastAPI 教程
└── sqlalchemy/    # SQLAlchemy 教程
```

每套教程一个独立侧边栏（见 `sidebars.ts`），目录结构即侧边栏结构，按 `01-xxx` 数字前缀排序。

## 本地开发

环境要求：Node.js >= 20，pnpm 11。

```bash
# 安装依赖
pnpm install

# 启动开发服务（http://localhost:3000，热更新）
pnpm start

# 类型检查
pnpm typecheck

# 生产构建（产物在 build/，本地搜索索引在构建时生成）
pnpm build

# 本地预览构建产物
pnpm serve
```

> 注意：本地离线搜索（@easyops-cn/docusaurus-search-local）只在 `build` 后的产物中生效，`pnpm start` 开发模式下搜索不可用。

## 部署

部署方式：**本地构建 + 上传静态产物**。服务器只跑一个 nginx 容器，挂载 `build/` 目录（映射到 **8002** 端口），更新产物无需重启容器。

服务器目录约定（`/home/app/docs/`）：

```
/home/app/docs/
├── docker-compose.yml   # 从仓库复制
├── nginx.conf           # 从仓库复制
└── build/               # 本地 pnpm build 后上传的静态产物
```

```bash
# 1. 本地构建
pnpm build

# 2. 上传 build/ 到服务器 /home/app/docs/build（scp/rsync/FTP 均可）

# 3. 首次启动 nginx 容器（仅需一次，之后更新只重复第 1、2 步）
cd /home/app/docs
docker compose up -d
```

访问 `https://doc.ainotehub.top`（服务器 8002 端口，记得在防火墙/安全组放行）。

> 仓库中的 Dockerfile 保留了"构建进镜像"的备用方案（容器内完成构建，宿主机无需 Node），需要时可用 `docker build` 自行构建镜像。

## 写作约定

- 文档用 `.md`（按 CommonMark 解析），需要 JSX 时用 `.mdx`
- 死链会导致构建失败（`onBrokenLinks: 'throw'`），文档间互链请写相对路径到 `.md` 文件
- 新增一套教程：在 `docs/` 下建目录，并在 `sidebars.ts` 和 `docusaurus.config.ts` 的 navbar 中注册
