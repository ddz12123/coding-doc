# 6.2 单元测试

> 本节目标：学会用 Go 内置的测试框架写单元测试，掌握 Go 特色的"表驱动测试"。

## 一、Go 的测试有多简单？

不需要装任何测试框架，Go 自带。只要遵守三条约定：

1. 测试文件以 `_test.go` 结尾（如 `calc_test.go`），和被测代码放同一目录
2. 测试函数以 `Test` 开头，参数固定为 `t *testing.T`
3. 运行 `go test` 自动执行

## 二、第一个测试

被测代码：

```go
// calc.go
package calc

func Add(a, b int) int {
    return a + b
}
```

测试代码：

```go
// calc_test.go
package calc

import "testing"

func TestAdd(t *testing.T) {
    got := Add(2, 3)
    want := 5

    if got != want {
        t.Errorf("Add(2, 3) = %d，期望 %d", got, want)
    }
}
```

运行：

```bash
go test           # 运行当前包的测试
```

通过时输出：

```
PASS
ok      myapp/calc    0.2s
```

故意把 `Add` 改错（`return a - b`）再跑，看失败输出：

```
--- FAIL: TestAdd (0.00s)
    calc_test.go:10: Add(2, 3) = -1，期望 5
FAIL
```

### 测试的逻辑很朴素

调用函数 → 比较"实际结果 got"和"期望结果 want" → 不一致就用 `t.Errorf` 报告。没有断言库也能干活（社区也常用 `testify` 库让断言更简洁，入门阶段标准库足够）。

## 三、常用命令

```bash
go test               # 当前包
go test ./...         # 整个项目所有包（最常用）
go test -v            # 显示每个测试的执行详情
go test -run TestAdd  # 只跑名字匹配的测试
go test -race         # 加上竞态检测（并发代码必备）
go test -cover        # 显示测试覆盖率
```

## 四、表驱动测试：Go 的招牌写法

要测多组输入输出，与其复制粘贴 N 个测试函数，不如把用例做成"表格"：

```go
func TestAdd(t *testing.T) {
    tests := []struct {
        name string      // 用例名称
        a, b int         // 输入
        want int         // 期望输出
    }{
        {"正数相加", 2, 3, 5},
        {"负数相加", -1, -2, -3},
        {"与零相加", 0, 7, 7},
        {"正负抵消", 5, -5, 0},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {   // 子测试：每行用例独立运行、独立报告
            got := Add(tt.a, tt.b)
            if got != tt.want {
                t.Errorf("Add(%d, %d) = %d，期望 %d", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

`go test -v` 的输出，每个用例一目了然：

```
=== RUN   TestAdd
=== RUN   TestAdd/正数相加
=== RUN   TestAdd/负数相加
...
--- PASS: TestAdd (0.00s)
```

好处：加用例只需加一行；哪组失败清清楚楚。**Go 社区 90% 的测试都是这个模式。**

## 五、测试含 error 的函数

```go
// 被测函数
func Divide(a, b float64) (float64, error) {
    if b == 0 {
        return 0, errors.New("除数不能为零")
    }
    return a / b, nil
}

// 测试
func TestDivide(t *testing.T) {
    tests := []struct {
        name    string
        a, b    float64
        want    float64
        wantErr bool       // 是否期望出错
    }{
        {"正常除法", 10, 2, 5, false},
        {"除以零", 10, 0, 0, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := Divide(tt.a, tt.b)

            if (err != nil) != tt.wantErr {
                t.Fatalf("错误情况不符：err = %v, wantErr = %v", err, tt.wantErr)
            }
            if !tt.wantErr && got != tt.want {
                t.Errorf("Divide(%v, %v) = %v，期望 %v", tt.a, tt.b, got, tt.want)
            }
        })
    }
}
```

> `t.Errorf` 报告错误但继续执行；`t.Fatalf` 报告错误并立刻终止当前测试（后续检查没意义时用它）。

## 六、基准测试与示例函数（了解）

测试文件里还能写性能测试和文档示例：

```go
// 基准测试：go test -bench=. 运行
func BenchmarkAdd(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Add(2, 3)
    }
}

// 示例函数：会出现在文档里，且 Output 注释会被当作断言验证！
func ExampleAdd() {
    fmt.Println(Add(2, 3))
    // Output: 5
}
```

## 七、为什么要写测试？（对新手说的心里话）

- 改代码不心慌：跑一遍 `go test ./...`，绿了就放心
- 测试是最好的文档：看测试用例就知道函数怎么用、边界在哪
- 好测的代码通常是好设计：函数难测往往说明它职责太杂

**建议**：从今天起，每写一个"有逻辑"的函数（不是简单打印），就顺手写个表驱动测试。这个习惯会让你受益终身。

---

## 新手常见坑

1. **测试文件名不带 `_test.go`** → go test 根本不认
2. **测试函数名 `Test` 后面跟小写字母**（如 `Testadd`）→ 不会被执行！必须 `TestAdd`
3. **只测"正常路径"**：边界（0、负数、空字符串、空切片）和错误路径才是 bug 高发区
4. **测试互相依赖执行顺序**：每个测试必须独立可运行

---

## 练习

1. 给你在上一节写的 `geometry` 包补上表驱动测试，覆盖正常值、零值、负数（负数宽高应该怎么处理？先想清楚行为，再写测试和实现）。
2. 写函数 `IsPalindrome(s string) bool` 判断回文串，先写测试用例（"aba"、""、"ab"、"中文文中"），再写实现，体验"测试先行"。
3. 用 `go test -cover` 看看你的测试覆盖率是多少。

下一节：[6.3 常用标准库速览](03-stdlib.md)
