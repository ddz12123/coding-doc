# 03 请求体与 Pydantic 模型

本章目标：学会用 Pydantic 模型接收和校验 JSON 请求体。这是 FastAPI 最核心的用法之一，务必掌握。

## 1. 什么是请求体

创建用户时，前端会通过 POST 请求发送一段 JSON 数据：

```json
POST /users
Content-Type: application/json

{
  "username": "xiaoming",
  "email": "xiaoming@example.com",
  "age": 18
}
```

这段随请求发送的数据就是**请求体（Request Body）**。查询参数适合少量简单数据，而结构化数据（尤其是创建/修改操作）都用请求体。

## 2. 用 Pydantic 模型声明请求体

在 FastAPI 中，接收 JSON 请求体的方式是：**定义一个 Pydantic 模型类，然后把它作为函数参数的类型**。

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


# 定义数据模型：继承 BaseModel，用类属性声明字段
class UserCreate(BaseModel):
    username: str
    email: str
    age: int
    bio: str | None = None   # 可选字段，默认 None


@app.post("/users")
def create_user(user: UserCreate):
    # 到这里，user 已经是校验通过的 Python 对象了
    # 用点号访问字段
    return {
        "message": f"用户 {user.username} 创建成功",
        "email": user.email,
        "age": user.age,
    }
```

打开 `/docs`，点开 `POST /users` → `Try it out`，你会看到一个 JSON 编辑框，里面已经填好了示例结构。点 Execute 发送试试。

FastAPI 自动帮你完成了：

1. 读取请求体的 JSON
2. 按模型校验每个字段（缺字段？类型不对？直接 422）
3. 把 JSON 转成 `UserCreate` 对象传给你的函数
4. 在 `/docs` 里生成请求体的结构文档

试试发一个缺 `email` 的请求，或者把 `age` 写成 `"abc"`，观察 422 错误信息——它会精确告诉你哪个字段错了、为什么错。

## 3. 字段校验：Field

类型注解只能保证「是个字符串/整数」，更细的规则用 `Field`：

```python
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=20, description="用户名，3-20个字符")
    email: str = Field(pattern=r"^[\w.-]+@[\w.-]+\.\w+$", description="邮箱")
    age: int = Field(ge=0, le=150, description="年龄")
    bio: str | None = Field(default=None, max_length=200, description="个人简介")
```

> **邮箱校验的更好方式**：Pydantic 内置了专门的邮箱类型，先 `pip install "pydantic[email]"`，然后：
> ```python
> from pydantic import BaseModel, EmailStr
>
> class UserCreate(BaseModel):
>     email: EmailStr
> ```

## 4. 模型嵌套

JSON 可以嵌套，模型也可以：

```python
class Address(BaseModel):
    city: str
    street: str


class UserCreate(BaseModel):
    username: str
    address: Address              # 嵌套单个对象
    hobbies: list[str] = []       # 字符串列表
```

对应的 JSON：

```json
{
  "username": "xiaoming",
  "address": {"city": "北京", "street": "中关村大街1号"},
  "hobbies": ["篮球", "编程"]
}
```

访问：`user.address.city`、`user.hobbies[0]`。

## 5. 路径参数 + 查询参数 + 请求体，同时使用

FastAPI 按规则自动识别每个参数的来源：

```python
@app.put("/users/{user_id}")
def update_user(
    user_id: int,          # 在路径模板里 → 路径参数
    user: UserCreate,      # Pydantic 模型 → 请求体
    notify: bool = False,  # 普通类型有默认值 → 查询参数
):
    return {"user_id": user_id, "notify": notify, "data": user}
```

识别规则总结：

| 参数特征 | 识别为 |
|----------|--------|
| 名字出现在路径 `{}` 里 | 路径参数 |
| Pydantic 模型类型 | 请求体 |
| 其他简单类型（int/str/bool...） | 查询参数 |

## 6. 模型的常用方法

```python
user = UserCreate(username="xiaoming", email="a@b.com", age=18)

user.model_dump()          # 转成 Python 字典
user.model_dump_json()     # 转成 JSON 字符串
user.model_dump(exclude_unset=True)   # 只包含调用方实际传了的字段（做部分更新时很有用，后面会用到）
UserCreate.model_validate({"username": "x", "email": "a@b.com", "age": 1})  # 从字典创建并校验
```

> 这些是 Pydantic v2 的方法名。如果你看到旧教程里写 `.dict()`、`.json()`、`parse_obj()`，那是 v1 的老写法，含义相同。

## 7. 为什么要为「创建」和「返回」定义不同的模型？

思考一个注册接口：

- **前端提交的数据**：用户名、邮箱、密码
- **接口返回的数据**：id、用户名、邮箱、注册时间 —— **绝不能返回密码！**

所以实际项目中，同一个「用户」概念通常会定义多个模型：

```python
class UserCreate(BaseModel):
    """创建时接收的数据"""
    username: str
    email: str
    password: str


class UserOut(BaseModel):
    """返回给前端的数据（没有 password）"""
    id: int
    username: str
    email: str
```

这个模式叫 **Schema 分离**，是后端开发的重要实践。`UserOut` 怎么用？下一章「响应模型」马上讲。

## 本章小结

- 请求体 = POST/PUT 携带的 JSON 数据
- 定义 `BaseModel` 子类 + 作为函数参数类型 = 自动解析校验请求体
- `Field()` 提供细粒度校验；模型可以嵌套
- 路径/查询/请求体参数可以混用，FastAPI 按类型自动识别
- 「输入模型」和「输出模型」要分开定义（如 UserCreate / UserOut）

下一章：[04-响应模型与状态码](04-响应模型与状态码.md)
