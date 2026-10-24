# 6.3 pip 与第三方库

标准库之外，全世界的开发者还写了几十万个**第三方库**，免费供你使用——爬虫、数据分析、AI，几乎你能想到的功能都有现成的库。

## pip：Python 的应用商店

`pip` 是 Python 自带的包管理工具，负责下载安装第三方库。**在终端里**（不是 Python 交互模式里！）执行：

```bash
pip install requests        # 安装名为 requests 的库
pip uninstall requests      # 卸载
pip list                    # 查看已安装的所有库
pip install requests==2.31.0   # 安装指定版本
```

> ⚠️ 新手高频错误：在 Python 交互模式（`>>>` 提示符）里输 `pip install`，会报 SyntaxError。pip 命令要在**系统终端**里执行。

> ⚠️ **Windows 头号坑：提示 `'pip' 不是内部或外部命令`。**
>
> 原因：pip 的路径没配进环境变量 PATH，或电脑装了多个 Python 互相打架。万能解法：用 `python -m pip install 库名` 代替 `pip install 库名`——意思是"用当前这个 Python 自带的 pip"，保证装到正确的地方。这招同时能避开下面"装了库却还报 No module named"的问题。

## 国内加速：换镜像源

pip 默认从国外服务器下载，国内可能很慢。换成清华镜像源，一条命令永久生效：

```bash
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
```

## 试装一个库：requests

`requests` 是最著名的网络请求库，用它三行代码就能访问网页：

```bash
pip install requests
```

```python
import requests

resp = requests.get("https://www.python.org")
print(resp.status_code)     # 200 表示访问成功
print(len(resp.text))       # 网页源代码的长度
```

## 值得知道的明星库

| 库名 | 用途 |
|------|------|
| requests | 网络请求（爬虫基础） |
| pandas | 数据分析、处理 Excel/CSV |
| openpyxl | 读写 Excel 文件 |
| matplotlib | 画统计图表 |
| pillow | 图片处理 |
| pygame | 写 2D 小游戏 |
| flask / django | 开发网站 |

现在不需要学它们，等基础打牢、有了具体目标再学对应的库。

## 遇到 "No module named xxx" 怎么办

运行代码报 `ModuleNotFoundError: No module named 'requests'`，意思是**这个库没安装**，执行 `pip install 库名` 即可。

如果安装了还报错，常见原因是电脑上有多个 Python，pip 装到了另一个 Python 里。最简单的排查：用 `python -m pip install 库名` 来安装，确保 pip 和运行代码的是同一个 Python。

## 练习

1. 换好清华镜像源，安装 `requests`，运行上面的示例代码。
2. 用 `pip list` 看看你现在装了哪些库。

<details>
<summary>点击查看答案</summary>

**第 1 题：** 安装成功、运行示例代码后，预期看到类似输出：

```
200
50985
```

第一行是 HTTP 状态码，`200` 代表访问成功。第二行是网页源代码的长度，数字和这里不一样很正常——网页内容一直在变。如果看到 404 之类，说明那个网址访问不到，检查网络或换个网址试试。

**第 2 题：** `pip list` 会列出所有已安装的库和版本号，至少能看到 `pip` 自己。

</details>

## 本章小结

- `pip install 库名` 安装第三方库，命令在终端执行
- 国内用户先换镜像源
- `No module named xxx` = 缺库，装上即可

下一节：[6.4 虚拟环境](04-虚拟环境.md)
