# 1.2 安装 MySQL

## 📖 本节导读

学完本节你将掌握：

- 在 Windows 上用官方 Installer 完整安装 MySQL 8.x 的步骤
- 在 macOS（Homebrew）和 Linux 上安装 MySQL 的方法
- 如何验证 MySQL 是否安装成功
- 遇到端口占用、忘记密码、服务启动失败等常见问题时怎么办

> 本教程以 **MySQL 8.x**（当前主流版本）为准。不同小版本的安装界面可能略有差异，但流程一致。

---

## 一、安装前你需要知道的几个词

- **root 用户**：MySQL 的"超级管理员"账号，拥有最高权限。安装时会让你给它设置密码，**这个密码务必记牢**，后面每次登录都要用。
- **服务（Service）**：安装后 MySQL 会作为一个后台程序常驻运行，随开机自动启动，这样你随时都能连接它。
- **端口（Port）**：可以理解为"程序在电脑上的门牌号"。MySQL 默认使用 **3306** 端口，程序通过这个门牌号找到它。

## 二、Windows 安装（官方 Installer 方式）

### 1. 下载安装包

1. 打开官方下载页：<https://dev.mysql.com/downloads/>
2. 点击 **MySQL Installer for Windows**（或 "MySQL Community Downloads" 中的 Installer）
3. 选择体积较大的**离线完整版**（如 `mysql-installer-community-8.x.x.msi`，约 400+ MB），避免安装过程中再联网下载
4. 点击 Download 后，页面会提示登录/注册 Oracle 账号——**不用理会**，直接点下方的小字 **"No thanks, just start my download"** 即可开始下载

### 2. 运行安装向导

双击下载好的 `.msi` 文件，按向导操作：

1. **Choosing a Setup Type（选择安装类型）**
   - 新手推荐选 **Server only**（只装数据库服务器，干净省事）
   - 想顺带安装图形化工具 Workbench 的可以选 **Default**（默认套装）
2. 点击 **Execute** 开始安装，等待进度条完成，然后 **Next** 进入配置阶段

### 3. 配置服务器（关键步骤）

1. **Type and Networking**：保持默认即可
   - Config Type 选 `Development Computer`（开发机，占用内存最少）
   - 端口保持默认 **3306**，勾选 "Open Windows Firewall ports"
2. **Authentication Method（认证方式）**：保持默认的 **Use Strong Password Encryption**（强密码加密，MySQL 8 的推荐方式）
3. **Accounts and Roles（设置 root 密码）**：
   - 在 "MySQL Root Password" 处输入并确认密码
   - 学习环境可以设置简单点（如 `123456`），但**一定要记住它**
4. **Windows Service（配置为服务）**：
   - 勾选 "Configure MySQL Server as a Windows Service"
   - 服务名默认 `MySQL80`，勾选 "Start the MySQL Server at System Startup"（开机自启）
5. 一路 **Next → Execute → Finish**，看到所有步骤打上绿勾即安装完成

### 4. 配置环境变量 PATH（重要！）

为什么要配？——安装完后，如果直接在命令行输入 `mysql`，系统会提示"不是内部或外部命令"，因为系统不知道 mysql.exe 在哪。把它所在目录加入 **PATH 环境变量**，就能在任何位置直接使用 `mysql` 命令。

步骤：

1. 找到 MySQL 的安装目录，默认为：
   `C:\Program Files\MySQL\MySQL Server 8.0\bin`
2. 按 `Win` 键搜索"**编辑系统环境变量**"并打开，点击右下角"**环境变量**"按钮
3. 在"系统变量"区域找到 **Path**，双击打开
4. 点击"**新建**"，粘贴上面的 bin 目录路径，一路确定保存
5. **重新打开**一个命令行窗口（旧窗口不会生效），输入 `mysql --version` 验证

## 三、macOS 安装（Homebrew 方式）

macOS 推荐用包管理器 Homebrew 安装（若未安装 Homebrew，可先到 <https://brew.sh> 按提示安装）。

打开"终端"，依次执行：

```
# 安装 MySQL
brew install mysql

# 启动 MySQL 服务（并设为开机自启）
brew services start mysql
```

Homebrew 安装的 MySQL 初始 root 密码为**空**，建议执行安全初始化脚本设置密码：

```
mysql_secure_installation
```

按提示设置 root 密码即可（其余问题新手一路选 Yes 就行）。

## 四、Linux 安装（简单了解）

Linux 服务器上通常一行命令即可安装：

```
# Debian / Ubuntu 系
sudo apt install mysql-server

# CentOS / RedHat 系
sudo yum install mysql-server

# 安装后启动服务
sudo systemctl start mysqld
```

Linux 下的初始密码获取方式因发行版而异（如 CentOS 会把随机初始密码写在 `/var/log/mysqld.log` 中），部署服务器时再深入了解即可，新手阶段在自己的 Windows/macOS 上练习就够了。

## 五、验证安装是否成功

打开命令行（Windows 的 CMD/PowerShell，或 macOS 的终端），输入：

```
mysql --version
```

如果看到类似下面的输出，说明安装成功、环境变量也配置正确：

```
mysql  Ver 8.0.36 for Win64 on x86_64 (MySQL Community Server - GPL)
```

再确认服务是否在运行：

- **Windows**：按 `Win + R` 输入 `services.msc` 回车，在服务列表中找到 `MySQL80`，状态应为"正在运行"
- **macOS**：执行 `brew services list`，mysql 一项应显示 `started`

两项都通过，恭喜你，MySQL 已经在你的电脑上安家了！

## 六、安装常见问题排查

### 1. 端口 3306 被占用

**现象**：配置阶段提示端口冲突，或服务启动失败。多半是电脑上装过别的 MySQL 或某些软件占用了 3306。

**排查（Windows）**：

```
netstat -ano | findstr 3306
```

输出最后一列是占用端口的进程号（PID），再到任务管理器的"详细信息"里按 PID 找到对应程序。

**解决**：卸载/关闭旧的 MySQL 或占用程序；或者在安装配置时把 MySQL 的端口改成 3307 等其他端口（改了端口的话，以后连接时要显式指定端口，下一节会讲 `-P` 参数）。

### 2. 忘记 root 密码怎么办？

新手最常见的事故。简单指引（以 Windows 为例，思路是"跳过密码验证 → 进去改密码 → 恢复正常"）：

1. 以管理员身份打开命令行，停止服务：`net stop mysql80`
2. 以跳过权限验证的方式启动：`mysqld --console --skip-grant-tables --shared-memory`
3. **另开**一个命令行，输入 `mysql -u root` 直接免密登录
4. 执行修改密码的 SQL：

```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '新密码';
```

5. 关闭第 2 步的窗口，正常重启服务：`net start mysql80`，用新密码登录即可

记不住步骤没关系，知道"忘记密码是可以重置的、关键词是 skip-grant-tables"就行，需要时再搜索详细教程。

### 3. 服务启动失败

- **先看服务名对不对**：Windows 下默认是 `MySQL80`，`net start mysql` 可能会提示服务名无效，应使用 `net start mysql80`
- **权限不足**：启动/停止服务需要**以管理员身份**运行命令行
- **数据目录损坏或残留**：如果之前装过 MySQL 又没卸载干净，旧的数据目录（Windows 默认在 `C:\ProgramData\MySQL`）可能导致新版本起不来。彻底卸载时记得同时删除该目录（注意 `ProgramData` 是隐藏文件夹）
- **看错误日志**：数据目录下的 `.err` 文件记录了启动失败的具体原因，学会看日志是排错的第一步

### 4. 输入 mysql 提示"不是内部或外部命令"

99% 是 PATH 环境变量没配置，或配置后没有**重开命令行窗口**。回到本节"配置环境变量 PATH"部分重新检查。

## ⚠️ 新手常见坑

- **设置完 root 密码转头就忘**：安装时设的密码请立刻记在备忘录里。
- **改完环境变量在旧窗口里验证**：环境变量只对新打开的命令行窗口生效。
- **重复安装多个版本的 MySQL**：新手电脑上装一个就够了，多版本共存容易端口冲突、服务混乱。
- **在公司/生产服务器上用弱密码**：`123456` 只适合本机学习环境，真实项目务必用强密码。

## 📝 小结

- Windows 用官方 Installer 安装：下载 → Server only → 默认端口 3306 → 设置 root 密码 → 配置为 Windows 服务 → 配置 PATH 环境变量
- macOS 两条命令：`brew install mysql` + `brew services start mysql`
- Linux 一行命令：`apt/yum install mysql-server`
- 验证安装：`mysql --version` 有版本输出 + 服务处于运行状态
- 常见问题：端口 3306 冲突、忘记 root 密码（可用 skip-grant-tables 重置）、服务启动失败（看服务名/权限/日志）

## ✍️ 练习题

**1. MySQL 默认使用哪个端口？"端口"用生活中的什么东西来类比比较合适？**

<details><summary>参考答案</summary>

默认端口是 3306。端口可以类比为"门牌号"：一台电脑上运行着很多程序，端口号让外界能准确找到 MySQL 这个"住户"。

</details>

**2. 安装完成后，如何验证 MySQL 安装成功？请写出验证命令和预期结果。**

<details><summary>参考答案</summary>

在命令行执行 `mysql --version`，若输出类似 `mysql Ver 8.0.36 for Win64 on x86_64 (MySQL Community Server - GPL)` 的版本信息即说明安装且环境变量配置成功。另外还应确认 MySQL 服务处于"正在运行"状态（Windows 在 services.msc 中查看 MySQL80 服务）。

</details>

**3. 为什么要把 MySQL 的 bin 目录加入 PATH 环境变量？不加会怎样？**

<details><summary>参考答案</summary>

PATH 告诉系统去哪些目录寻找可执行程序。不把 bin 目录加入 PATH，在命令行输入 `mysql` 时系统找不到 mysql.exe，会提示"不是内部或外部命令"；加入后就可以在任意目录直接使用 mysql 命令。

</details>

**4. 你在命令行执行 `net start mysql` 提示"服务名无效"，最可能的原因是什么？**

<details><summary>参考答案</summary>

MySQL 8 在 Windows 上默认的服务名是 `MySQL80` 而不是 `mysql`，应执行 `net start mysql80`。另外启动服务需要以管理员身份运行命令行，否则会提示"拒绝访问"。

</details>

**5. 如果忘记了 root 密码，重置的核心思路是什么？（不要求默写命令）**

<details><summary>参考答案</summary>

核心思路分三步：① 停止 MySQL 服务，以跳过权限验证（--skip-grant-tables）的方式启动；② 免密登录后用 `ALTER USER` 语句修改 root 密码；③ 恢复正常方式重启服务，用新密码登录。

</details>
