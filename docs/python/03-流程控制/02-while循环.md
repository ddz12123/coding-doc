# 3.2 while 循环

循环让程序**重复做事**。想打印 100 遍"你好"，总不能写 100 行 `print` 吧？

## while 的基本结构

`while` 的意思是：**只要条件成立，就一直重复执行缩进的代码**。

```python live_py title=while基本结构
count = 1

while count <= 5:
    print(f"第 {count} 次问好")
    count += 1        # 每次循环让 count 加 1

print("循环结束")
```

输出：

```
第 1 次问好
第 2 次问好
第 3 次问好
第 4 次问好
第 5 次问好
循环结束
```

执行过程：

1. 检查条件 `count <= 5`：成立 → 执行循环体
2. 循环体执行完，**回到开头再次检查条件**
3. 直到某次检查时 `count` 变成 6，条件不成立 → 跳出循环

循环三要素，写 while 时先想清楚：

1. **初始状态**：`count = 1`
2. **循环条件**：`count <= 5`
3. **让条件趋向结束的变化**：`count += 1`

## 死循环：新手必踩的坑

如果忘了第三要素，条件永远成立，程序就停不下来了：

```python
count = 1
while count <= 5:
    print("停不下来啦！")
    # 忘了写 count += 1，count 永远是 1
```

> 🆘 **程序停不下来怎么办**：在终端里按 `Ctrl + C` 强制终止程序。记住这个救命快捷键！

有时也会**故意**使用死循环 + 手动退出的模式，见下面的 `break`。

## break：立刻跳出循环

`break` 一执行，整个循环马上结束：

```python
while True:                      # 条件永远为真，故意的死循环
    word = input("输入内容（输入 q 退出）：")
    if word == "q":
        print("再见！")
        break                    # 跳出循环
    print(f"你输入了：{word}")
```

`while True` + `break` 是非常常用的写法，适合"不知道要循环多少次，由某个事件决定退出"的场景。

## continue：跳过本轮，进入下一轮

```python live_py title=continue演示
num = 0
while num < 10:
    num += 1
    if num % 2 == 1:      # 奇数
        continue          # 跳过下面的 print，直接回到循环开头
    print(num)            # 只打印偶数：2 4 6 8 10
```

- `break`：整个循环都不要了
- `continue`：只跳过这一轮，循环继续

## 综合例子：累加 1 到 100

```python live_py title=累加1到100
total = 0
num = 1

while num <= 100:
    total += num
    num += 1

print(f"1 加到 100 等于 {total}")    # 5050
```

## 练习

1. 用 while 打印 1 ~ 10 中的所有偶数。
2. 写一个"密码重试"程序：让用户输入密码，密码是 `123456`。输对了输出"欢迎"并结束；输错了提示"密码错误"并继续让他输（用 `while True` + `break`）。
3. （挑战）计算 1×2×3×…×10 的结果（阶乘）。

<details>
<summary>点击查看答案</summary>

```python
# 1
n = 2
while n <= 10:
    print(n)
    n += 2

# 2
while True:
    pwd = input("请输入密码：")
    if pwd == "123456":
        print("欢迎")
        break
    print("密码错误")

# 3
result = 1
n = 1
while n <= 10:
    result *= n
    n += 1
print(result)   # 3628800
```

</details>

## 本章小结

- `while 条件:` 条件成立就一直重复
- 写循环先想三要素：初始状态、条件、变化
- 死循环用 `Ctrl + C` 终止
- `break` 跳出整个循环，`continue` 跳过本轮

下一节：[3.3 for 循环](03-for循环.md)
