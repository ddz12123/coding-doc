# 3.3 for 循环

`for` 循环是 Python 中**最常用**的循环，它的思路是：**把一堆东西挨个拿出来处理**。

## 基本结构

```python
for 变量 in 一堆东西:
    对变量做点什么
```

最直观的例子——遍历字符串（把每个字符挨个拿出来）：

```python live_py slim
for ch in "Python":
    print(ch)
```

输出：

```
P
y
t
h
o
n
```

每一轮循环，`ch` 会自动变成下一个字符，不需要你手动 `+= 1`，这就是 for 比 while 省心的地方。

## range()：生成一串数字

想循环固定次数，配合 `range()` 使用：

```python live_py slim
# range(5) 生成 0, 1, 2, 3, 4（从 0 开始，不含 5）
for i in range(5):
    print(f"第 {i} 次")
```

`range()` 有三种用法：

```python
range(5)          # 0, 1, 2, 3, 4          （只给结束值）
range(1, 6)       # 1, 2, 3, 4, 5          （开始值, 结束值）含头不含尾
range(1, 10, 2)   # 1, 3, 5, 7, 9          （开始, 结束, 步长）
range(10, 0, -1)  # 10, 9, 8, ..., 1       （步长为负数就是倒着数）
```

> 💡 又是"含头不含尾"！和字符串切片一样，这是 Python 的统一规则。

## 经典例子

**累加 1 到 100**（对比上一节的 while 版本，简洁多了）：

```python live_py title=累加1到100
total = 0
for i in range(1, 101):
    total += i
print(total)    # 5050
```

**打印乘法表的一行**：

```python live_py slim
for i in range(1, 10):
    print(f"{i} × 5 = {i * 5}")
```

**九九乘法表**（嵌套循环，外层每转一圈，内层转完一整轮）：

```python live_py title=九九乘法表
for i in range(1, 10):
    for j in range(1, i + 1):
        print(f"{j}×{i}={i*j}", end="\t")   # \t 是制表符，用于对齐
    print()                                  # 空 print 换行
```

## break 和 continue 同样适用

```python live_py title=break演示
for i in range(1, 10):
    if i == 5:
        break        # 遇到 5 就停，输出 1 2 3 4
    print(i)
```

## for 和 while 怎么选

| 场景 | 选择 |
|------|------|
| 已知循环次数 / 遍历一堆东西 | **for**（大多数情况） |
| 不知道循环几次，靠条件或事件决定何时停 | **while** |

例如"遍历列表里每个商品"用 for；"用户输错密码就一直重试"用 while。

## 练习

1. 用 for 循环打印 1~20 中所有能被 3 整除的数。
2. 输入一个正整数 n，计算 n 的阶乘（1×2×…×n）。
3. （挑战）打印如下图案（提示：`"*" * 数量` 可以重复字符串）：

```
*
**
***
****
*****
```

<details>
<summary>点击查看答案</summary>

```python
# 1
for i in range(3, 21, 3):
    print(i)
# 或者：
for i in range(1, 21):
    if i % 3 == 0:
        print(i)

# 2
n = int(input("输入正整数："))
result = 1
for i in range(1, n + 1):
    result *= i
print(result)

# 3
for i in range(1, 6):
    print("*" * i)
```

</details>

## 本章小结

- `for x in ...:` 挨个取出来处理，是最常用的循环
- `range(开始, 结束, 步长)` 生成数字序列，含头不含尾
- 已知次数用 for，未知次数用 while

流程控制学完了！有了判断和循环，你已经能写出真正"有逻辑"的程序。下一章学习怎么存放一堆数据：[4.1 列表 list](../04-数据结构/01-列表.md)
