# 02 安装 Go 开发环境

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

## 三、配置国内代理（中国大陆用户必做）

Go 下载第三方库时默认访问国外服务器，国内网络经常连不上。执行下面**一条命令**配置国内代理：

```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

配置完可以用 `go env GOPROXY` 查看是否生效。这一步做完，以后下载依赖会又快又稳。

## 四、关于 GOPATH（新手可以跳过的历史包袱）

网上很多老教程会让你配置 `GOPATH`、把代码放在特定目录下——**这些都过时了**。

从 Go 1.16 开始，官方推荐使用 **Go Modules**（模块）管理项目：

- 代码想放哪个目录都行
- 不需要手动配置 GOPATH
- 每个项目用一个 `go.mod` 文件记录依赖（后面会学）

所以：看到要你配 GOPATH 的教程，说明它旧了，跳过即可。

## 五、安装编辑器：VS Code

新手强烈推荐 **VS Code**（免费、轻量、Go 支持极好）：

1. 下载安装 VS Code：<https://code.visualstudio.com/>
2. 打开 VS Code，点左侧扩展图标（四个方块），搜索 **Go**，安装 Go Team at Google 出品的官方扩展
3. 随便打开一个 `.go` 文件时，右下角会提示安装 `gopls` 等工具，点击 **Install All**，等待安装完成

装好之后你将获得：代码自动补全、保存时自动格式化、错误实时提示、点击跳转到定义等能力。

> 其他选择：JetBrains 的 **GoLand** 是最强的 Go IDE（收费，学生免费）；用惯 Vim/Neovim 的也有很好的 Go 插件。新手无脑选 VS Code 即可。

## 六、创建你的第一个项目目录

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
- 国内用户务必配置 `GOPROXY`
- 忽略老教程里的 GOPATH，现代 Go 用 Modules
- 编辑器选 VS Code + Go 官方扩展

环境就绪，下一节写你的第一个 Go 程序：[03 第一个程序 Hello World](03-hello-world.md)
