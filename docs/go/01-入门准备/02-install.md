# 1.2 安装 Go 开发环境

> 本节目标：在你的电脑上装好 Go，并配置一个顺手的编辑器。

## 一、下载安装 Go

### 下载地址

- 官网：<https://go.dev/dl/>
- 国内镜像（官网慢时用这个）：<https://golang.google.cn/dl/>

下载**最新稳定版**即可（本教程内容适用于 Go 1.21 及以上任何版本）。

### Windows

1. 下载 `go1.xx.x.windows-amd64.msi` 安装包
2. 双击运行，一路"下一步"即可（默认安装到 `C:\Program Files\Go`）
3. 安装程序会自动配置好环境变量

### macOS

方式一：下载 `go1.xx.x.darwin-arm64.pkg`（Apple 芯片）或 `darwin-amd64.pkg`（Intel 芯片），双击安装。

方式二：用 Homebrew：

```bash
brew install go
```

### Linux

```bash
# 下载并解压到 /usr/local（版本号换成最新的）
wget https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz

# 把 go 加入 PATH（写入 ~/.bashrc 或 ~/.zshrc）
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
```

## 二、验证安装

打开终端（Windows 上用 PowerShell 或 CMD），输入：

```bash
go version
```

如果输出类似下面的内容，说明安装成功：

```
go version go1.22.5 windows/amd64
```

> **如果提示"不是内部或外部命令" / "command not found"**：说明环境变量没配置好。Windows 用户重启一下终端（或电脑）再试；Linux 用户检查 PATH 是否包含 `/usr/local/go/bin`。

## 三、认识 Go 的环境配置：go env

装好 Go 之后，它自带一套环境配置。终端输入：

```bash
go env
```

会打印几十个配置项，全都不用背，但有 3 个你必须认识——网上教程、报错信息、面试题里全是它们：

### GOROOT：Go 自己住哪

**GOROOT 是 Go 的安装目录**，里面放着编译器、标准库的源码。查看：

```bash
go env GOROOT
# Windows 通常是 C:\Program Files\Go
# macOS/Linux 通常是 /usr/local/go
```

关于它只需要记一句话：**GOROOT 是安装程序自动设好的，永远不要手动改它，也不要把你的代码放进去**。老教程让你配置 GOROOT 环境变量——现代 Go 完全不需要。

### GOPATH：Go 的工作间

**GOPATH 是 Go 存放"下载的依赖"和"安装的工具"的目录**，默认在你的用户目录下：

```bash
go env GOPATH
# Windows：C:\Users\你的用户名\go
# macOS/Linux：~/go
```

它内部长这样：

```
~/go
├── pkg/mod/    ← 下载的所有第三方库都缓存在这（全部项目共用，不会重复下载）
└── bin/        ← go install 安装的命令行工具放这
```

> ⚠️ **辨别老教程的试金石**：2016 年以前的 Go 要求把**你自己的代码**也放进 `GOPATH/src` 目录才能编译——这是无数老教程的由来。**这套早就废弃了**。现代 Go（1.16+）用 **Go Modules** 管理项目：代码想放哪就放哪，每个项目靠一个 `go.mod` 文件记录依赖（下下节细讲）。所以看到"把代码放到 GOPATH/src""配置 GO111MODULE"的教程，直接关掉，它旧了。
>
> 今天的 GOPATH 只剩"依赖缓存 + 工具目录"这一个角色，默认值就很好，**不需要配置**。

### GOPROXY：从哪下载依赖（中国大陆用户必改）

Go 下载第三方库时默认访问国外服务器，国内网络经常连不上。执行下面**一条命令**换成国内代理：

```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

- `go env -w` 的意思是"写入配置"（w = write），配置一次永久生效
- `https://goproxy.cn` 是七牛云维护的国内镜像；`direct` 表示镜像取不到时直连源站

配置完验证一下：

```bash
go env GOPROXY
# 输出 https://goproxy.cn,direct 即生效
```

这一步做完，以后下载依赖又快又稳。

### 三个变量一张表

| 变量 | 是什么 | 你要做什么 |
|------|--------|-----------|
| `GOROOT` | Go 的安装目录 | 什么都不做，别碰 |
| `GOPATH` | 依赖缓存 + 工具目录 | 什么都不做，默认就好 |
| `GOPROXY` | 依赖下载源 | 国内用户改成 goproxy.cn |

## 四、安装编辑器：VS Code

新手强烈推荐 **VS Code**（免费、轻量、Go 支持极好）：

1. 下载安装 VS Code：<https://code.visualstudio.com/>
2. 打开 VS Code，点左侧扩展图标（四个方块），搜索 **Go**，安装 Go Team at Google 出品的官方扩展
3. 随便打开一个 `.go` 文件时，右下角会提示安装 `gopls` 等工具，点击 **Install All**，等待安装完成

装好之后你将获得：代码自动补全、保存时自动格式化、错误实时提示、点击跳转到定义等能力。

> 其他选择：JetBrains 的 **GoLand** 是最强的 Go IDE（收费，学生免费）；用惯 Vim/Neovim 的也有很好的 Go 插件。新手无脑选 VS Code 即可。

## 五、创建你的第一个项目目录

找个你喜欢的位置，创建一个学习目录，比如：

```bash
# Windows (PowerShell)
mkdir D:\go-learn
cd D:\go-learn

# macOS / Linux
mkdir ~/go-learn
cd ~/go-learn
```

用 VS Code 打开这个目录（菜单：文件 → 打开文件夹），后面的学习代码都放这里。

---

## 小结

- 从官网下载安装包，安装后用 `go version` 验证
- 三大环境变量：`GOROOT`（安装目录，别碰）、`GOPATH`（依赖缓存，默认就好）、`GOPROXY`（国内用户务必改成 goproxy.cn）
- "把代码放 GOPATH/src" 是老教程的标志，现代 Go 用 Modules，代码随便放
- 编辑器选 VS Code + Go 官方扩展

环境就绪，下一节写你的第一个 Go 程序：[1.3 第一个程序 Hello World](03-hello-world.md)
