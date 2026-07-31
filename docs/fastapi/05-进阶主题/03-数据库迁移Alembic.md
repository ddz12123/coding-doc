# 03 数据库迁移（Alembic）

本章目标：学会用 Alembic 管理数据库表结构的变更——这是 `create_all` 的正式替代方案，上线项目必备。

## 1. 为什么需要迁移工具

回顾 `create_all` 的致命限制：**只建新表，不改旧表**。

现在你的项目上线了，users 表里有 1 万条真实数据，产品要求给用户加个 `phone` 字段。你不能删库重建，需要执行 `ALTER TABLE users ADD COLUMN phone ...`，而且：

- 开发、测试、生产三套环境都要执行，一个都不能漏
- 团队其他人拉了你的代码，他们的本地库也要同步
- 万一改错了要能回滚

**迁移工具**把每次表结构变更记录成一个版本化的脚本文件，像 git 管理代码一样管理表结构。Alembic 就是 SQLAlchemy 官方的迁移工具。

## 2. 安装与初始化

```bash
pip install alembic

# 在项目根目录（blog-api/）执行
alembic init alembic
```

生成：

```
blog-api/
├── alembic.ini          # 配置文件
└── alembic/
    ├── env.py           # 迁移运行环境（要改）
    └── versions/        # 迁移脚本存放处（自动生成）
```

## 3. 配置（两处修改）

### ① alembic.ini：数据库地址

找到 `sqlalchemy.url` 一行，改成你的数据库：

```ini
sqlalchemy.url = sqlite:///./blog.db
```

### ② alembic/env.py：告诉 Alembic 你的模型

找到 `target_metadata = None`，改为：

```python
from app.database import Base
from app import models  # noqa: F401  导入以注册所有模型

target_metadata = Base.metadata
```

这样 Alembic 才能对比「模型定义」和「数据库现状」的差异。

## 4. 核心工作流（背下来）

以后每次改动 models.py，就走这三步：

```bash
# 1. 自动生成迁移脚本（对比模型与数据库的差异）
alembic revision --autogenerate -m "add phone to users"

# 2. 打开 alembic/versions/ 下新生成的文件，人工检查（重要！）

# 3. 执行迁移，应用到数据库
alembic upgrade head
```

### 实际演练

给 User 模型加一个字段：

```python
# app/models.py 的 User 类中添加
phone: Mapped[str | None] = mapped_column(String(20))
```

执行第 1 步，会在 versions/ 下生成类似 `a1b2c3d4e5f6_add_phone_to_users.py` 的文件：

```python
def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=20), nullable=True))

def downgrade() -> None:
    op.drop_column("users", "phone")
```

- `upgrade()`：本次变更做什么
- `downgrade()`：如何撤销本次变更

检查无误后 `alembic upgrade head`，用 DB Browser 确认 users 表多了 phone 列，**已有数据完好无损**。

### 为什么第 2 步必须人工检查？

autogenerate 不是万能的：改列名会被识别成「删列+加列」（数据就丢了！）、某些约束变化检测不到。**生成的脚本必须过目**，必要时手改。

## 5. 常用命令

```bash
alembic upgrade head        # 升级到最新版本
alembic upgrade +1          # 只升一个版本
alembic downgrade -1        # 回退一个版本
alembic current             # 查看数据库当前处于哪个版本
alembic history             # 查看所有迁移历史
```

Alembic 会在数据库里建一张 `alembic_version` 表记录当前版本号，靠它知道「哪些脚本已经跑过」。

## 6. 与项目集成：告别 create_all

用了 Alembic 后，建表也交给它管理（首次迁移会生成所有建表语句），所以：

```python
# app/main.py 的 lifespan 中，删掉或注释这一行：
# Base.metadata.create_all(engine)
```

新环境部署流程变成：

```bash
pip install -r requirements.txt
alembic upgrade head        # 从零建出全部表 + 历史所有变更
fastapi run app/main.py
```

> **从头接入的正确姿势**（如果你的 blog.db 是 create_all 建的）：最简单的办法是删掉 blog.db，然后 `alembic revision --autogenerate -m "init"` 生成首个迁移，再 `alembic upgrade head`。已有生产数据的库接入 Alembic 需要用 `alembic stamp head` 标记基线，属于进阶操作，需要时再查文档。

## 7. 团队协作注意事项

- 迁移脚本（versions/ 目录）**必须提交到 git**——它是表结构的变更历史
- 拉取同事代码后，先 `alembic upgrade head` 同步本地库再开发
- 两人同时生成迁移可能产生分叉，Alembic 会报「Multiple heads」，用 `alembic merge heads` 合并（遇到再查即可）

## 本章小结

- `create_all` 不能改表；生产项目用 Alembic 管理表结构变更
- 三步工作流：`revision --autogenerate` 生成 → **人工检查脚本** → `upgrade head` 应用
- 迁移脚本提交 git；`downgrade` 提供回滚能力
- 接入 Alembic 后移除 create_all

下一章：[04-自动化测试](04-自动化测试.md)
