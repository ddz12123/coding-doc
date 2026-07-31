# Docker 与 Docker Compose 零基础教程

> 一套面向新手的容器化教程，从「什么是容器」讲起，一步步学会用 Docker 打包应用、用 Docker Compose 编排多容器服务，最后完成真实项目的部署。

## 这套教程适合谁？

- 会基本的 Linux 命令（cd、ls、cat），但没接触过容器
- 写完了代码，不知道怎么部署到服务器
- 听说过 Docker，但被镜像、容器、卷这些概念绕晕了
- 想把开发环境（MySQL、Redis 等）用容器统一管理

## 环境版本说明

| 工具 | 版本 | 说明 |
|------|------|------|
| Docker Engine | 24.0+ | 容器运行时 |
| Docker Compose | v2（`docker compose` 命令） | 多容器编排，已内置于 Docker |
| 操作系统 | Linux / Windows(WSL2) / macOS | 教程命令以 Linux 为准 |

> 注意：本教程使用的是 Compose v2 的 `docker compose`（中间是空格）命令，而不是旧版的 `docker-compose`（中间是横线）。

## 目录结构与学习路线

请**按顺序**学习，每一章都建立在前一章的基础上。

### 第一部分：Docker 基础（`01-Docker基础/`）

| 文件 | 内容 |
|------|------|
| [01-认识Docker](01-Docker基础/01-认识Docker.md) | 容器是什么、为什么需要 Docker、核心概念 |
| [02-安装Docker](01-Docker基础/02-安装Docker.md) | Linux / Windows / macOS 安装、国内镜像加速 |
| [03-镜像与容器操作](01-Docker基础/03-镜像与容器操作.md) | 最常用的镜像、容器命令 |
| [04-Dockerfile编写](01-Docker基础/04-Dockerfile编写.md) | 把自己的应用打包成镜像 |
| [05-数据卷与网络](01-Docker基础/05-数据卷与网络.md) | 数据持久化、容器互联 |

### 第二部分：Docker Compose（`02-Docker-Compose/`）

| 文件 | 内容 |
|------|------|
| [01-认识Compose](02-Docker-Compose/01-认识Compose.md) | 为什么需要编排、compose.yaml 基本结构 |
| [02-Compose配置详解](02-Docker-Compose/02-Compose配置详解.md) | services、volumes、networks、environment 等常用配置 |
| [03-Compose常用命令](02-Docker-Compose/03-Compose常用命令.md) | up、down、logs、exec 等日常操作 |

### 第三部分：部署实战（`03-部署实战/`）

每一篇都是一个完整可跑的部署示例，可以按需查阅。

| 文件 | 内容 |
|------|------|
| [01-部署静态网站](03-部署实战/01-部署静态网站.md) | Nginx 部署前端静态站（以 Docusaurus 为例） |
| [02-部署FastAPI应用](03-部署实战/02-部署FastAPI应用.md) | Python 后端 + 多阶段构建 |
| [03-部署MySQL与Redis](03-部署实战/03-部署MySQL与Redis.md) | 数据库容器化、数据持久化、初始化脚本 |
| [04-全栈项目部署](03-部署实战/04-全栈项目部署.md) | 前端 + 后端 + 数据库 + 反向代理一套跑通 |

### 附录（`04-附录/`）

| 文件 | 内容 |
|------|------|
| [01-常见问题排查](04-附录/01-常见问题排查.md) | 端口占用、容器起不来、磁盘爆满等 |
| [02-常用命令速查](04-附录/02-常用命令速查.md) | Docker / Compose 命令速查表 |

## 学习建议

1. **一定要动手敲命令**。Docker 的命令不多，但只有敲过、看过输出才能记住。
2. **搞不清概念时回到「镜像 = 安装包，容器 = 运行中的程序」这个类比**，绝大多数疑惑都能解开。
3. **部署实战部分建议在一台干净的虚拟机或云服务器上完整做一遍**，比在本机上练更接近真实场景。
4. **遇到报错先 `docker logs 容器名`**，90% 的问题日志里都有答案，再配合 [常见问题排查](04-附录/01-常见问题排查.md)。

准备好了吗？从 [01-Docker基础/01-认识Docker.md](01-Docker基础/01-认识Docker.md) 开始吧！
