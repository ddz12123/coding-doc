# 5.3 Alembic 数据库迁移

> 项目上线后你想给 users 表加个 `phone` 字段——`create_all` 无能为力（它不改已存在的表），删库重建更不可能（生产数据！）。**数据库迁移工具 Alembic** 就是为此而生的。

## 一、迁移是什么？

**迁移（Migration）= 数据库结构的版本管理**，相当于"数据库界的 Git"：

- 每次表结构变更（加字段、建新表、改类型…）生成一个**迁移脚本**
- 脚本按顺序串成一条版本链，可以**升级（upgrade）**也可以**回滚（downgrade）**
- 团队成员和生产服务器执行同样的脚本链，保证所有环境的表结构一致

```
版本链：  a1b2c3 ──→ d4e5f6 ──→ 9f8e7d ──→ (head 最新)
          建users表   加phone字段  建posts表
```

Alembic 由 SQLAlchemy 作者亲自开发，是官方标配。安装：`pip install alembic`（1.2 节已装过）。

## 二、初始化（每个项目一次）

在项目根目录执行：

```bash
alembic init alembic
```

生成：

```
项目根目录/
├── alembic.ini          # 配置文件
└── alembic/
    ├── env.py           # 迁移运行环境（需要改两处）
    ├── script.py.mako   # 脚本模板（不用动）
    └── versions/        # 迁移脚本都生成在这里
```

### 配置第 1 处：数据库地址

编辑 `alembic.ini`，找到并改成你的连接串：

```ini
sqlalchemy.url = sqlite:///app.db
```

### 配置第 2 处：告诉 Alembic 你的模型在哪

编辑 `alembic/env.py`，找到 `target_metadata = None` 改为：

```python
from models import Base          # 导入你定义模型的模块
target_metadata = Base.metadata
```

这样 Alembic 才能对比"模型定义"和"数据库现状"的差异，自动生成迁移脚本。

> ⚠️ 如果报 `ModuleNotFoundError`，在 env.py 顶部加上项目路径：
> ```python
> import sys, os
> sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
> ```

## 三、日常工作流（背下来）

以后**每次改模型**都是这三步：

```bash
# ① 改完 models.py 后，自动生成迁移脚本
alembic revision --autogenerate -m "add phone to users"

# ② 打开 versions/ 下新生成的脚本，人工检查一遍（重要！）

# ③ 执行迁移，应用到数据库
alembic upgrade head
```

### 走一遍完整例子

假设 User 模型原来只有 id/name，现在加一个字段：

```python
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    phone: Mapped[Optional[str]] = mapped_column(String(20))    # ← 新加的
```

执行 `alembic revision --autogenerate -m "add phone to users"`，Alembic 对比后在 `versions/` 生成脚本：

```python
"""add phone to users

Revision ID: d4e5f6a7b8c9
Revises: a1b2c3d4e5f6
"""
from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "phone")
```

- `upgrade()`：向前升级做什么
- `downgrade()`：回滚时怎么撤销

执行 `alembic upgrade head` → 数据库里的 users 表就多了 phone 列，**已有数据一行不丢**。

## 四、常用命令速查

```bash
alembic revision --autogenerate -m "说明"   # 自动生成迁移脚本
alembic upgrade head                        # 升级到最新版本
alembic upgrade +1                          # 只升一级
alembic downgrade -1                        # 回滚一级
alembic downgrade base                      # 回滚到最初（表全没，慎用）
alembic current                             # 查看数据库当前版本
alembic history                             # 查看版本链
```

> 💡 Alembic 在数据库里建了一张 `alembic_version` 表记录当前版本号，靠它知道"这个库升到哪了、还差哪些脚本要跑"。

## 五、autogenerate 的边界（为什么要人工检查）

自动生成能识别：加/删表、加/删列、加/删索引和约束。但有几类它**看不出来或容易搞错**：

| 情况 | autogenerate 的表现 | 你要做的 |
|------|--------------------| ---------|
| **列改名** | 认为是"删旧列+加新列"→ **数据会丢！** | 手动改脚本为 `op.alter_column(..., new_column_name=...)` |
| 列类型变更 | 部分情况检测不到 | 检查、手写 `op.alter_column` |
| 给已有数据的表加 NOT NULL 列 | 生成的脚本执行会失败（旧行没值） | 加默认值，或先允许 NULL → 填数据 → 再改 NOT NULL |
| Python 侧 `default=` | 不体现在数据库 DDL 中，属正常现象 | 无需处理 |

所以**第②步"人工检查脚本"不是走过场**，尤其看到 `drop_column` 时要警惕是不是改名被误判了。

> ⚠️ SQLite 对 `ALTER TABLE` 支持很弱（不能删列、不能改列类型等），复杂迁移在 SQLite 上可能失败——需要在 env.py 的 `context.configure(...)` 里加 `render_as_batch=True` 开启"batch 模式"（Alembic 用建新表→拷数据→换名的方式模拟）。MySQL/PostgreSQL 没有这个问题。

## 六、有了 Alembic 之后，create_all 还要吗？

| 阶段 | 建表方式 |
|------|---------|
| 学习/实验/一次性脚本 | `Base.metadata.create_all()` 简单直接 |
| 正式项目 | **从第一天就用 Alembic**：初始建表就是第一个迁移脚本（`--autogenerate` 会生成全部 CREATE TABLE） |

两者别混用：用了 Alembic 就删掉代码里的 `create_all`，让版本链成为表结构的唯一事实来源。

## 七、团队协作要点

- **迁移脚本必须提交进 Git**——它们是代码的一部分
- 拉到同事的新迁移后，本地跑 `alembic upgrade head` 同步
- 部署流程标配：发布新代码前先跑 `alembic upgrade head`
- 两人同时生成迁移会产生分叉，用 `alembic merge` 合并（遇到再查文档）

## 📝 本节小结

- `create_all` 不能改已有表；正式项目的表结构变更靠 **Alembic**
- 一次性配置：`alembic init` → 配 `sqlalchemy.url` → env.py 里指 `target_metadata`
- 日常三步：**改模型 → `revision --autogenerate` → 检查脚本 → `upgrade head`**
- autogenerate 识别不了"改名"（会当成删+加），务必人工审查
- 迁移脚本进 Git，部署前先 upgrade

下一节 → [5.4 异步 SQLAlchemy](04-异步SQLAlchemy.md)
