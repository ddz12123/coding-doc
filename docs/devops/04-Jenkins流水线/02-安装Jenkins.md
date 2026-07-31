# 安装 Jenkins

本章用 **Docker Compose** 安装 Jenkins——正好把前面学的 Compose 知识用上，装、升级、迁移都比裸装省心。

## 1. 准备工作

- 一台 2 核 4G 以上的 Linux 服务器（Jenkins 是 Java 程序，比较吃内存，1G 的机器会很挣扎）
- 已安装 Docker 与 Compose（回看 [安装Docker](../01-Docker基础/02-安装Docker.md)）

## 2. 用 Compose 启动 Jenkins

新建目录并编写 `compose.yaml`：

```bash
mkdir -p /opt/jenkins && cd /opt/jenkins
```

```yaml title="/opt/jenkins/compose.yaml"
services:
  jenkins:
    image: jenkins/jenkins:lts-jdk17   # 官方 LTS（长期支持）版
    container_name: jenkins
    restart: unless-stopped
    ports:
      - "8080:8080"      # Web 界面
      - "50000:50000"    # Agent 节点连接用，单机可不开
    environment:
      - TZ=Asia/Shanghai # 时区，不设的话构建时间显示是 UTC
    volumes:
      - ./jenkins_home:/var/jenkins_home          # 所有数据都在这，务必挂出来
      - /var/run/docker.sock:/var/run/docker.sock # 让 Jenkins 能调用宿主机 Docker（后面构建镜像用）
      - /usr/bin/docker:/usr/bin/docker           # 借用宿主机的 docker 命令行
    user: root   # 简化处理：以 root 运行以获得 docker.sock 权限
```

启动：

```bash
docker compose up -d
docker compose logs -f jenkins   # 观察启动日志
```

> 两个挂载解释一下：
> - `jenkins_home` 是 Jenkins 的全部家当（配置、插件、任务、历史记录），挂出来后容器随便删，数据不丢
> - `docker.sock` 让容器里的 Jenkins 可以指挥宿主机的 Docker 构建镜像，即「Docker outside of Docker」，个人和小团队最常用的玩法

## 3. 初始化设置

浏览器访问 `http://服务器IP:8080`（记得安全组放行 8080，建议只对办公网/自己 IP 放行）。

**第 1 步：解锁。** 页面要求输入初始管理员密码，取法：

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

**第 2 步：装插件。** 选「**安装推荐的插件**」，等它装完（取决于网络，可能要几分钟）。

**第 3 步：创建管理员账号。** 设置自己的用户名密码，别用 admin/123456。

## 4. 补装常用插件

进入 `Manage Jenkins → Plugins → Available plugins`，搜索安装：

| 插件 | 用途 |
|------|------|
| **SSH Agent** | 流水线里用 SSH 私钥连服务器（部署必备） |
| **NodeJS** | 提供 Node 环境给前端构建 |
| **Docker Pipeline** | 流水线里把 Docker 容器当构建环境用 |
| Blue Ocean | 更好看的流水线可视化界面（可选） |
| Localization: Chinese (Simplified) | 中文界面（可选） |

装完勾选「安装完成后重启 Jenkins」。

## 5. 配置凭据（Credentials）

后面部署要连服务器、拉私有仓库，先把钥匙放进保险柜。

位置：`Manage Jenkins → Credentials → System → Global credentials → Add Credentials`

### 5.1 服务器 SSH 私钥（部署用）

- **Kind**：SSH Username with private key
- **ID**：`deploy-server`（流水线里靠这个 ID 引用，起个好记的）
- **Username**：登录服务器的用户，如 `root`
- **Private Key**：勾选 Enter directly，粘贴私钥全文

> 密钥对生成方法和 GitHub Actions 部署一样：`ssh-keygen -t ed25519` 生成，公钥追加到目标服务器的 `~/.ssh/authorized_keys`，私钥粘到这里。

### 5.2 Git 仓库凭据（拉私有仓库用）

- **Kind**：Username with password
- **ID**：`git-cred`
- **Username**：Git 账号
- **Password**：密码或 access token（GitLab/GitHub 现在基本都要求用 token）

公开仓库可以跳过这条。

## 6. 配置构建触发（Webhook）

让「git push 自动触发构建」跑起来，以 GitHub 为例：

1. Jenkins 任务配置里勾选 `GitHub hook trigger for GITScm polling`
2. GitHub 仓库 → Settings → Webhooks → Add webhook：
   - Payload URL：`http://你的Jenkins地址:8080/github-webhook/`
   - Content type：`application/json`
3. push 一次代码测试，Jenkins 应自动开始构建

GitLab 同理（装 GitLab 插件后，Webhook 地址是 `/project/任务名`）。

> **Jenkins 在内网、GitHub 够不着怎么办？** 用轮询代替：任务配置里勾选「Poll SCM」，日程表填 `H/2 * * * *`（每 2 分钟检查一次仓库有没有新提交）。不如 Webhook 及时，但内网环境最省事。

## 7. 升级与备份

```bash
# 升级：改镜像 tag 或直接拉最新 LTS，重建容器即可，数据在卷里不受影响
docker compose pull && docker compose up -d

# 备份：打包 jenkins_home 就是完整备份
tar czf jenkins-backup-$(date +%F).tar.gz jenkins_home/
```

## 小结

- 用 Compose 装 Jenkins：数据挂 `jenkins_home`，挂 `docker.sock` 让它能构建镜像
- 初始化三步：解锁密码 → 推荐插件 → 建管理员
- 必装插件：SSH Agent、NodeJS、Docker Pipeline
- 凭据里放好两把钥匙：服务器 SSH 私钥（`deploy-server`）、Git 凭据（`git-cred`）
- 触发方式：能用 Webhook 用 Webhook，内网用 Poll SCM 兜底

环境就绪，下一章学写 Jenkinsfile：[03-流水线基础](03-流水线基础.md)
