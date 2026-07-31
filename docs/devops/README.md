# DevOps 零基础教程

> 一套面向新手的运维部署教程：从「什么是容器」讲起，学会用 Docker 打包应用、用 Docker Compose 编排多容器服务、完成前端 / Python / Go 真实项目的部署，最后用 Jenkins 把整个部署流程自动化。

## 这套教程适合谁？

- 会基本的 Linux 命令（cd、ls、cat），但没接触过容器和 CI/CD
- 写完了代码，不知道怎么部署到服务器
- 听说过 Docker、Jenkins，但被镜像、容器、流水线这些概念绕晕了
- 每次上线都在手动传文件、重启服务，想解放双手

## 环境版本说明

| 工具 | 版本 | 说明 |
|------|------|------|
| Docker Engine | 24.0+ | 容器运行时 |
| Docker Compose | v2（`docker compose` 命令） | 多容器编排，已内置于 Docker |
| Jenkins | LTS（2.4xx）+ JDK17 | CI/CD 服务器 |
| 操作系统 | Linux / Windows(WSL2) / macOS | 教程命令以 Linux 为准 |

> 注意：本教程使用的是 Compose v2 的 `docker compose`（中间是空格）命令，而不是旧版的 `docker-compose`（中间是横线）。

## 目录结构与学习路线

前三部分请**按顺序**学习，每一章都建立在前一章的基础上；第四部分 Jenkins 需要先掌握前三部分。

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
| [03-部署Go应用](03-部署实战/03-部署Go应用.md) | Go 多阶段构建出 15MB 小镜像、systemd 裸部署对比 |
| [04-部署MySQL与Redis](03-部署实战/04-部署MySQL与Redis.md) | 数据库容器化、数据持久化、初始化脚本 |
| [05-全栈项目部署](03-部署实战/05-全栈项目部署.md) | 前端 + 后端 + 数据库 + 反向代理一套跑通 |

### 第四部分：Jenkins 流水线（`04-Jenkins流水线/`）

把第三部分的手动部署升级为「git push 自动上线」。

| 文件 | 内容 |
|------|------|
| [01-认识Jenkins](04-Jenkins流水线/01-认识Jenkins.md) | CI/CD 是什么、和 GitHub Actions 的区别、核心概念 |
| [02-安装Jenkins](04-Jenkins流水线/02-安装Jenkins.md) | Compose 安装、插件、凭据、Webhook 触发 |
| [03-流水线基础](04-Jenkins流水线/03-流水线基础.md) | Jenkinsfile 声明式语法、docker agent、sshagent |
| [04-部署前端项目](04-Jenkins流水线/04-部署前端项目.md) | Vue/React 构建 + 静态文件发布到 Nginx |
| [05-部署Python项目](04-Jenkins流水线/05-部署Python项目.md) | FastAPI 镜像构建 → 推仓库 → 服务器拉取更新 |
| [06-部署Go项目](04-Jenkins流水线/06-部署Go项目.md) | 二进制 + systemd 原子替换部署、镜像路线对比 |

### 附录（`05-附录/`）

| 文件 | 内容 |
|------|------|
| [01-常见问题排查](05-附录/01-常见问题排查.md) | 端口占用、容器起不来、磁盘爆满等 |
| [02-常用命令速查](05-附录/02-常用命令速查.md) | Docker / Compose 命令速查表 |

## 学习建议

1. **一定要动手敲命令**。Docker 和 Jenkins 的知识点不多，但只有敲过、看过输出才能记住。
2. **搞不清概念时回到「镜像 = 安装包，容器 = 运行中的程序」这个类比**，绝大多数疑惑都能解开。
3. **部署实战和 Jenkins 部分建议在一台干净的虚拟机或云服务器上完整做一遍**，比在本机上练更接近真实场景。
4. **遇到报错先 `docker logs 容器名`**，90% 的问题日志里都有答案，再配合 [常见问题排查](05-附录/01-常见问题排查.md)。

准备好了吗？从 [01-Docker基础/01-认识Docker.md](01-Docker基础/01-认识Docker.md) 开始吧！
