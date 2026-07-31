# 附录 A：常见错误与解决方案

> 新手 90% 的报错都在这里。按报错信息关键字查找即可。

## 一、安装与连接类

### `ModuleNotFoundError: No module named 'sqlalchemy'`

包没装，或装在了别的环境里。确认虚拟环境已激活（命令行有 `(.venv)` 前缀）后重新 `pip install sqlalchemy`。VS Code 用户注意右下角选中的 Python 解释器要指向 `.venv`。

### `Could not parse SQLAlchemy URL from string ...`

连接字符串格式错了。SQLite 注意是**三个斜杠**：`sqlite:///app.db`。带账号密码的注意格式：`mysql+pymysql://user:pass@host:3306/dbname`。密码含 `@#/` 等特殊字符要先 `urllib.parse.quote_plus()` 编码。

### `ModuleNotFoundError: No module named 'MySQLdb'`

用了 `mysql://` 开头的连接串，SQLAlchemy 去找默认驱动 MySQLdb 了。改成显式指定驱动：`mysql+pymysql://...`，并确认 `pip install pymysql`。

### `sqlite3.OperationalError: unable to open database file`

数据库文件路径不对（目录不存在），或没有写权限。相对路径是相对于**运行命令的目录**，不是脚本所在目录——建议用绝对路径或先 `cd` 到项目目录再运行。

## 二、模型定义类

### `InvalidRequestError: Table 'users' is already defined for this MetaData instance`

同一个表名被注册了两次。常见原因：

- 模型文件被重复 import 且路径不一致（`import models` 和 `from app import models` 混用——Python 视为两个模块，类定义执行两次）
- Jupyter/交互环境里重复执行了类定义单元格（重启内核解决）
- 两个模型类写了相同的 `__tablename__`

### `CompileError: (in table 'users', column 'name'): VARCHAR requires a length on dialect mysql`

MySQL 上 `String` 必须给长度：`mapped_column(String(50))`。

### `ArgumentError: Mapper ... could not assemble any primary key columns`

模型没有主键。每个模型必须有 `primary_key=True` 的列。

### `NoReferencedTableError: Foreign key ... could not find table 'user'`

`ForeignKey("user.id")` 写的是**表名**不是类名——表名是 `__tablename__` 的值（通常是复数 `users.id`）。另外确保被引用的模型类在 `create_all` 之前已被 import（没被 import 的模型不会注册到 metadata）。

### 改了模型，数据库表却没变 / `OperationalError: no such column`

`create_all` **不会修改已存在的表**（2.2 节）。开发期删掉 .db 文件重建，或用 Alembic 迁移（5.3 节）。

## 三、Session 与事务类

### `PendingRollbackError: This Session's transaction has been rolled back due to a previous exception`

之前某次 commit/flush 失败后没有 rollback，Session 卡在故障状态。解决：在 except 分支里 `session.rollback()`（3.1 节）。这个错的根源永远是**更早的那个异常**，去日志里找第一个报错。

### `DetachedInstanceError: Instance <User at ...> is not bound to a Session`

Session 关闭后访问了懒加载属性（关系字段或 commit 后过期的属性）。解决三选一（4.4 节）：

1. 查询时预加载：`options(selectinload(User.posts))`
2. 在 Session 存活期间用完对象
3. 会话工厂加 `expire_on_commit=False`（对"commit 后属性过期"的情况）

### `IntegrityError: UNIQUE constraint failed: users.email`

插入/更新违反了唯一约束。业务上做"先查后插"给用户友好提示，同时 try/except 捕获兜底，**except 里记得 rollback**（3.1 节）。

### `IntegrityError: NOT NULL constraint failed`

必填列（非 Optional）没给值。检查是不是漏传字段，或该列是否应该改成 `Mapped[Optional[...]]`。

### `IntegrityError: FOREIGN KEY constraint failed`

外键指向的记录不存在（如 `user_id=999` 但没有这个用户），或删除父记录时还有子记录引用它。注：SQLite 默认**不强制**外键检查，MySQL/PG 强制——开发时没报错上线才炸就是这个原因。

### 数据没存进数据库

忘了 `session.commit()`。`add` 只是登记，commit 才落库（2.3 节）。

## 四、查询类

### `Boolean value of this clause is not defined`

对查询表达式用了 Python 的 `and`/`or`/`not` 或 `if User.age > 18:` 这类布尔判断。组合条件用 `and_()`/`or_()`/多参数 where（3.3 节）。

### 查询结果是 `<sqlalchemy.engine.result.ChunkedIteratorResult>` 而不是数据

只执行了 `session.execute(stmt)` 没取结果。补上 `.all()` / `.first()` / `.scalars().all()`。

### 结果是元组 `(User(...),)` 而不是对象

用了 `session.execute(select(User))`。查整个对象请用 `session.scalars()`（3.2 节）。

### `MultipleResultsFound` / `NoResultFound`

`.one()` 要求恰好一条。可能为空用 `.one_or_none()` 或 `.first()`。

### `ObjectNotExecutableError: Not an executable object: 'SELECT ...'`

直接把 SQL 字符串传给了 execute。原生 SQL 必须 `text()` 包裹：`conn.execute(text("SELECT 1"))`（2.1 节）。

### 列表接口越来越慢

大概率 N+1 问题。开 `echo=True` 数一下一次请求发了几条 SQL，循环里访问的关系属性加 `selectinload`（4.4 节）。

## 五、FastAPI 集成类

### `ProgrammingError: SQLite objects created in a thread can only be used in that same thread`

SQLite 默认禁止跨线程使用连接，而 FastAPI 会用线程池。`create_engine` 加参数（6.2 节）：

```python
create_engine("sqlite:///app.db", connect_args={"check_same_thread": False})
```

### 返回 ORM 对象时报 `Unable to serialize unknown type: <class 'models.User'>` 或字段全丢

出参 Schema 忘了配 `model_config = ConfigDict(from_attributes=True)`，或接口忘了写 `response_model=`（6.3 节）。

### `ResponseValidationError: ... Field required`

response_model 里声明的字段在返回对象上不存在/为 None 但 Schema 没允许 None。检查字段名拼写、Schema 类型是否 `xxx | None`、关系字段是否预加载了。

### Pydantic 报 `orm_mode` 相关警告或不生效

`class Config: orm_mode = True` 是 Pydantic v1 写法。v2 用 `model_config = ConfigDict(from_attributes=True)`。

### 接口 422 Unprocessable Entity

不是 bug，是 FastAPI 的参数校验拒绝了请求。看响应体里的 `detail`，会精确指出哪个字段哪里不合法。

### `MissingGreenlet: greenlet_spawn has not been called` （异步项目）

异步模式下触发了隐式 IO——通常是懒加载关系或 commit 后过期属性。解决：关系显式预加载 + `async_sessionmaker(expire_on_commit=False)`（5.4 节）。

## 六、Alembic 类

### `Target database is not up to date`

数据库版本落后，先 `alembic upgrade head` 再生成新迁移。

### `Can't locate revision identified by 'xxxx'`

数据库 `alembic_version` 表里记录的版本号在 versions/ 目录里找不到对应脚本（脚本被删了或换了分支）。开发环境最简单的处理：删掉数据库重新 upgrade；或手动更新 `alembic_version` 表。

### autogenerate 生成了空迁移

Alembic 没看到你的模型。检查 env.py 里 `target_metadata = Base.metadata` 是否指向正确的 Base，模型模块是否被 import。

## 七、万能排查三板斧

1. **开 `echo=True`**，看最后执行的 SQL 是什么、和预期差在哪
2. **读完整异常栈的最后一行 + 第一行**：最后一行是错误类型，栈中第一处**你自己代码**的位置是案发现场
3. **最小复现**：把问题代码抽到一个 20 行小脚本里单独跑，一般抽着抽着就自己发现了
