# 02 安装 Docker

本章把 Docker 环境装起来。三大平台的安装方式不同，选择你自己的系统看即可，服务器部署以 Linux 为准。

## 1. Linux 安装（推荐 Ubuntu / Debian）

生产服务器基本都是 Linux，这也是最标准的安装方式。

### 1.1 官方脚本一键安装

```bash
# 下载并执行官方安装脚本（国内网络可加 --mirror Aliyun）
curl -fsSL https://get.docker.com | sh

# 国内服务器建议：
curl -fsSL https://get.docker.com | sh -s -- --mirror Aliyun
```

### 1.2 启动并设置开机自启

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### 1.3 让普通用户免 sudo 使用（可选）

默认只有 root 能执行 docker 命令。把当前用户加入 docker 组：

```bash
sudo usermod -aG docker $USER
# 退出终端重新登录后生效
```

> 注意：加入 docker 组等同于给了该用户 root 级别的权限，多人共用的服务器请谨慎。

## 2. Windows 安装

Windows 上使用 **Docker Desktop**，底层跑在 WSL2（Windows 内置的 Linux 子系统）里。

1. 先启用 WSL2：以管理员身份打开 PowerShell，执行：

   ```powershell
   wsl --install
   ```

   完成后重启电脑。

2. 到官网下载 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) 并安装，安装时勾选「Use WSL 2 based engine」。

3. 启动 Docker Desktop，等左下角图标变绿即可。

之后在 PowerShell 或 WSL 终端里都可以直接使用 `docker` 命令。

## 3. macOS 安装

直接下载 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)，注意区分 Intel 芯片和 Apple 芯片（M 系列）两个版本。安装后启动 Docker Desktop 即可。

也可以用 Homebrew：

```bash
brew install --cask docker
```

## 4. 配置国内镜像加速

国内直连 Docker Hub 拉取镜像经常超时，建议配置镜像加速地址。

### Linux

编辑（不存在就新建）`/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.net"
  ]
}
```

然后重启 Docker：

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### Windows / macOS

打开 Docker Desktop → Settings → Docker Engine，在 JSON 配置里加入同样的 `registry-mirrors` 字段，点 Apply & Restart。

> 镜像加速地址会随时间失效，如果拉取仍然超时，搜索「docker 镜像加速 可用」找最新可用地址即可。

## 5. 验证安装

```bash
# 查看版本
docker version

# 查看详细信息（能看到镜像加速是否生效：Registry Mirrors 一栏）
docker info

# 跑一个测试容器
docker run hello-world
```

如果 `docker run hello-world` 输出了 `Hello from Docker!` 开头的一段文字，说明安装成功：Docker 成功拉取了镜像并启动了容器。

顺便确认 Compose v2 也已就绪（Docker 24+ 默认自带）：

```bash
docker compose version
# 输出类似：Docker Compose version v2.24.x
```

## 6. 常见安装问题

| 现象 | 原因与解决 |
|------|-----------|
| `permission denied ... docker.sock` | 没加 docker 组或没重新登录，见 1.3 节 |
| `Cannot connect to the Docker daemon` | Docker 服务没启动：`sudo systemctl start docker` |
| 拉镜像一直超时 | 没配镜像加速，见第 4 节 |
| Windows 提示 WSL2 相关错误 | 执行 `wsl --update` 更新 WSL 内核后重启 Docker Desktop |

## 小结

- Linux 用官方脚本安装，Windows/macOS 用 Docker Desktop
- 国内环境务必配置**镜像加速**
- `docker run hello-world` 成功即代表环境就绪
- Compose v2 已内置，命令是 `docker compose`（空格）

环境就绪，下一章开始学最常用的命令：[03-镜像与容器操作](03-镜像与容器操作.md)
