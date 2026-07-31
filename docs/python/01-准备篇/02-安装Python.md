# 1.2 安装 Python

本节教你在自己的电脑上安装 Python。请根据你的操作系统选择对应的部分。

## Windows 安装步骤

1. 打开官网下载页：<https://www.python.org/downloads/>
2. 点击黄色的 **Download Python 3.x.x** 按钮（版本号是多少都可以，只要是 3 开头）。
3. 双击下载好的安装包，**重点来了**：
   - ⚠️ 在第一个界面**务必勾选底部的 `Add python.exe to PATH`**（把 Python 加入环境变量）。新手 90% 的安装问题都出在没勾这个。
   - 然后点 **Install Now**。
4. 等待安装完成，点 Close。

### 验证是否安装成功

1. 按键盘 `Win + R`，输入 `cmd`，回车，打开一个黑色窗口（这叫"命令行"或"终端"）。
2. 输入下面的命令并回车：

```
python --version
```

如果显示类似 `Python 3.12.4` 的版本号，恭喜你，安装成功！

> ❓ **如果提示"python 不是内部或外部命令"**：说明第 3 步没勾选 Add to PATH。最简单的解决办法：卸载 Python，重新安装一遍，这次记得勾选。

## macOS 安装步骤

macOS 自带的 Python 版本较老，建议安装新版：

1. 打开 <https://www.python.org/downloads/>，下载 macOS 安装包。
2. 双击 `.pkg` 文件，一路"继续"直到安装完成。
3. 打开"终端"（用聚焦搜索 Terminal），输入：

```
python3 --version
```

显示版本号即成功。

> 💡 注意：macOS 上命令是 `python3` 而不是 `python`，后文遇到 `python` 命令时请自行替换成 `python3`。

## 什么是"终端 / 命令行"

刚才用到的黑色窗口叫**终端**（Terminal）或**命令行**。它是用打字的方式给计算机下指令的地方。学 Python 会经常用到它，现在只需要记住两点：

- Windows：`Win + R` → 输入 `cmd` → 回车
- macOS：聚焦搜索 → Terminal

## 试试 Python 交互模式

在终端输入 `python`（macOS 输 `python3`）然后回车，你会看到 `>>>` 开头的提示符——这是 Python 的**交互模式**，输入一行代码立刻执行一行：

```
>>> 1 + 1
2
>>> print("hello")
hello
```

想退出交互模式，输入 `exit()` 回车即可。

交互模式适合做快速小实验，但正式写程序我们会把代码存成文件，下一节详细讲。

## 本章小结

- Windows 安装时**必须勾选 Add to PATH**
- 用 `python --version` 验证安装
- 终端里输入 `python` 可进入交互模式，`exit()` 退出

下一节：[1.3 第一个程序](03-第一个程序.md)
