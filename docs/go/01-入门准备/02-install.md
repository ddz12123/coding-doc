# 1.2 安装 Go 开发环境

> 本节目标：在你的电脑上装好 Go，配置好国内代理与编辑器，并通过安装自查。

## 一、安装 Go

安装 Go，装的其实是三样东西：**编译器**（把你的代码翻译成机器码）、**标准库**（官方自带的常用代码）、**go 命令**（以后每天都要敲的命令行工具）。一个安装包全部搞定。

### 下载地址

- 官网：<https://go.dev/dl/>
- 国内镜像（官网慢时用）：<https://golang.google.cn/dl/>

下载**最新稳定版**即可。本教程内容适用于 Go 1.22 及以上任何版本——2.4 节会用到的 range 整数语法从 1.22 才有。

### 各系统安装步骤

**Windows**

1. 下载 `go1.xx.x.windows-amd64.msi` 安装包
2. 双击运行，一路"下一步"（默认安装到 `C:\Program Files\Go`）
3. 安装程序会自动配置好环境变量

**macOS**

方式一：下载 `go1.xx.x.darwin-arm64.pkg`（Apple 芯片）或 `darwin-amd64.pkg`（Intel 芯片），双击安装。

方式二：用 Homebrew：

```bash
brew install go
```

**Linux**

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

> 命令怎么读：`go version` 读作——报告当前安装的 Go 版本号。

输出类似下面的内容，说明安装成功：

```
go version go1.22.5 windows/amd64
```

> 出现"不是内部或外部命令"/"command not found"：环境变量没配置好。Windows 用户重启一下终端（或电脑）再试；Linux 用户检查 PATH 是否包含 `/usr/local/go/bin`。

## 三、三个必须认识的配置变量

终端输入 `go env` 会打印几十个配置项——它相当于 Go 的"设置面板"。全都不用背，但有 3 个必须认识，网上教程、报错信息、面试题里全是它们。

### GOROOT：Go 的安装目录

GOROOT 里面放着编译器、标准库的源码。查看：

```bash
go env GOROOT
# Windows 通常是 C:\Program Files\Go
# macOS/Linux 通常是 /usr/local/go
```

关于它只需要记一句话：**GOROOT 由安装程序自动设好，永远不要手动改它，也不要把你的代码放进去**。老教程让你配置 GOROOT 环境变量——现代 Go 完全不需要。

### GOPATH：依赖缓存与工具目录

GOPATH 存放"下载的依赖"和"安装的工具"，默认在用户目录下：

```bash
go env GOPATH
# Windows：C:\Users\你的用户名\go
# macOS/Linux：~/go
```

内部结构：

```
~/go
├── pkg/mod/    ← 下载的所有第三方库缓存在这（全部项目共用，不会重复下载）
└── bin/        ← go install 安装的命令行工具放这
```

⚠️ **辨别老教程的标志**：2016 年以前的 Go 要求把自己的代码放进 `GOPATH/src` 目录才能编译，还要配置 `GO111MODULE`。

现代 Go（1.16+）用 **Go Modules** 管理项目：代码想放哪就放哪，每个项目靠一个 `go.mod` 文件记录依赖（1.4 节细讲）。看到"把代码放到 GOPATH/src""配置 GO111MODULE"的教程，直接跳过。

今天的 GOPATH 只剩"依赖缓存 + 工具目录"一个角色，默认值就很好，**不需要配置**。

### GOPROXY：依赖下载源（中国大陆用户必改）

Go 下载第三方库时默认访问国外服务器，国内网络经常连不上。执行一条命令换成国内代理：

```bash
go env -w GOPROXY=https://goproxy.cn,direct
```

拆解一下这条命令：

```
go env -w GOPROXY=https://goproxy.cn,direct
       ↑
       -w = write —— 把后面的配置写进 Go 的设置，一次配置，永久生效
```

读作：把依赖下载源 GOPROXY 设置为 goproxy.cn（七牛云维护的国内镜像），镜像取不到时直连源站（direct）。

配置完验证：

```bash
go env GOPROXY
# 输出 https://goproxy.cn,direct 即生效
```

### 三个变量汇总

| 变量 | 是什么 | 你要做什么 |
|------|--------|-----------|
| `GOROOT` | Go 的安装目录 | 什么都不做，别碰 |
| `GOPATH` | 依赖缓存 + 工具目录 | 什么都不做，默认就好 |
| `GOPROXY` | 依赖下载源 | 国内用户改成 goproxy.cn |

## 四、安装编辑器：VS Code

新手推荐 **VS Code**（免费、轻量、Go 支持极好）：

1. 下载安装 VS Code：<https://code.visualstudio.com/>
2. 打开 VS Code，点左侧扩展图标，搜索 **Go**，安装 Go Team at Google 出品的官方扩展
3. 随便打开一个 `.go` 文件时，右下角会提示安装 `gopls` 等工具，点击 **Install All**，等待安装完成

装好之后获得：代码自动补全、保存时自动格式化、错误实时提示、点击跳转到定义。

其他选择：JetBrains 的 **GoLand** 是最强的 Go IDE（收费，学生免费）；用惯 Vim/Neovim 的也有很好的 Go 插件。新手直接选 VS Code 即可。

## 五、创建学习目录

```bash
# Windows (PowerShell)
mkdir D:\go-learn    # mkdir = make directory：创建目录
cd D:\go-learn       # cd = change directory：切换到这个目录

# macOS / Linux
mkdir ~/go-learn
cd ~/go-learn
```

用 VS Code 打开这个目录（菜单：文件 → 打开文件夹），后面的学习代码都放这里。

## 六、安装自查清单

进入下一节之前，做完这 3 项检查：

1. `go version` —— 能打印出版本号，如 `go version go1.22.5 windows/amd64`
2. `go env GOPROXY` —— 国内用户确认输出为 `https://goproxy.cn,direct`
3. `go env GOPATH` —— 记住这个目录，以后下载的第三方库都缓存在它的 `pkg/mod` 里

## 新手常见坑

| 现象 | 原因 | 解决 |
|------|------|------|
| `go` 不是内部或外部命令 / `command not found` | 环境变量未生效或 PATH 缺失 | Windows 重启终端（或电脑）再试；Linux 检查 PATH 是否含 `/usr/local/go/bin` |
| 国内下载依赖超时或失败 | 默认 GOPROXY 指向国外服务器 | `go env -w GOPROXY=https://goproxy.cn,direct` |
| 跟着老教程把代码放进 `GOPATH/src`、配置 `GO111MODULE` | 2016 年前的旧规范，已废弃 | 现代 Go 用 Modules，代码放哪都行，这类教程直接跳过 |
| 手动修改 GOROOT 或把代码放进 GOROOT | 误解 GOROOT 的用途 | GOROOT 是安装目录，由安装程序管理，不要碰 |

## 练习

**1. 动手**：完成「安装自查清单」的三项检查。

**2. 判断**：某教程要求"把代码放到 GOPATH/src 下，并设置 GO111MODULE"。这套做法适用于现代 Go 吗？

**3. 动手**：把 GOPROXY 配置为国内镜像，并验证生效。

<details>
<summary>点击查看答案</summary>

**1.** 三条命令与期望输出：

```bash
go version        # go version go1.22.5 windows/amd64（版本号随安装版本不同）
go env GOPROXY    # https://goproxy.cn,direct（国内用户）
go env GOPATH     # 如 C:\Users\你的用户名\go 或 ~/go
```

**2.** 不适用。2016 年以前才要求代码放在 `GOPATH/src` 并配置 `GO111MODULE`；现代 Go（1.16+）默认用 Modules，项目放在任意目录，靠项目内的 `go.mod` 记录依赖。有这套要求的教程已经过时。

**3.**

```bash
go env -w GOPROXY=https://goproxy.cn,direct
go env GOPROXY    # 输出 https://goproxy.cn,direct 即生效
```

</details>

## 本节小结

- 从官网下载安装包，安装后用 `go version` 验证
- 三大环境变量：`GOROOT`（安装目录，别碰）、`GOPATH`（依赖缓存，默认就好）、`GOPROXY`（国内用户务必改成 goproxy.cn）
- "把代码放 GOPATH/src" 是老教程的标志，现代 Go 用 Modules，代码随便放
- 编辑器选 VS Code + Go 官方扩展

下一节：[1.3 第一个程序 Hello World](03-hello-world.md)
