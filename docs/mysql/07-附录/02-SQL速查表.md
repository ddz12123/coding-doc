# 附录 B：SQL 速查表

全书 SQL 命令一页汇总，按主题分区。忘了语法就来这里查，示例均基于全书统一的 `school` 库（class / student / course / score 四张表）。

## 一、数据库操作

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `SHOW DATABASES;` | 列出所有数据库 | `SHOW DATABASES;` |
| `CREATE DATABASE 库名;` | 创建数据库 | `CREATE DATABASE school DEFAULT CHARACTER SET utf8mb4;` |
| `USE 库名;` | 切换到某个数据库 | `USE school;` |
| `SELECT DATABASE();` | 查看当前所在数据库 | `SELECT DATABASE();` |
| `DROP DATABASE 库名;` | 删除数据库（不可恢复，慎用） | `DROP DATABASE school;` |

## 二、表操作

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `SHOW TABLES;` | 列出当前库的所有表 | `SHOW TABLES;` |
| `CREATE TABLE 表名 (列 类型, ...);` | 创建表 | `CREATE TABLE class (id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(20) NOT NULL);` |
| `DESC 表名;` | 查看表结构 | `DESC student;` |
| `SHOW CREATE TABLE 表名;` | 查看建表语句（含字符集） | `SHOW CREATE TABLE score;` |
| `ALTER TABLE 表 ADD 列 类型;` | 添加列 | `ALTER TABLE student ADD phone VARCHAR(20);` |
| `ALTER TABLE 表 MODIFY 列 新类型;` | 修改列类型 | `ALTER TABLE student MODIFY phone VARCHAR(30);` |
| `ALTER TABLE 表 CHANGE 旧列 新列 类型;` | 改列名（含类型） | `ALTER TABLE student CHANGE phone tel VARCHAR(30);` |
| `ALTER TABLE 表 DROP 列;` | 删除列 | `ALTER TABLE student DROP tel;` |
| `RENAME TABLE 旧名 TO 新名;` | 表改名 | `RENAME TABLE student TO stu;` |
| `TRUNCATE TABLE 表名;` | 清空表数据（快、不可回滚） | `TRUNCATE TABLE score;` |
| `DROP TABLE 表名;` | 删除整张表 | `DROP TABLE score;` |

## 三、增删改（INSERT / DELETE / UPDATE）

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `INSERT INTO 表 (列...) VALUES (值...);` | 插入一行 | `INSERT INTO class (name) VALUES ('三班');` |
| `INSERT INTO 表 (列...) VALUES (...),(...);` | 一次插入多行 | `INSERT INTO class (name) VALUES ('四班'),('五班');` |
| `UPDATE 表 SET 列=值 WHERE 条件;` | 修改数据（务必带 WHERE） | `UPDATE score SET score = 61.0 WHERE id = 9;` |
| `DELETE FROM 表 WHERE 条件;` | 删除行（务必带 WHERE） | `DELETE FROM score WHERE score IS NULL;` |
| `INSERT ... ON DUPLICATE KEY UPDATE ...` | 有则更新、无则插入 | `INSERT INTO score (student_id,course_id,score) VALUES (1,1,95.0) ON DUPLICATE KEY UPDATE score = 95.0;` |

## 四、查询（SELECT）

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `SELECT * FROM 表;` | 查询全部行和列 | `SELECT * FROM student;` |
| `SELECT 列1, 列2 FROM 表;` | 只查指定列 | `SELECT name, gender FROM student;` |
| `SELECT 列 AS 别名 FROM 表;` | 给列起别名 | `SELECT name AS 姓名 FROM student;` |
| `SELECT DISTINCT 列 FROM 表;` | 去重 | `SELECT DISTINCT class_id FROM student;` |
| `WHERE 条件` | 行过滤 | `SELECT * FROM student WHERE class_id = 1;` |
| `WHERE ... AND / OR / NOT` | 组合条件 | `SELECT * FROM score WHERE score >= 60 AND score < 80;` |
| `WHERE 列 BETWEEN a AND b` | 区间（含两端） | `SELECT * FROM score WHERE score BETWEEN 80 AND 90;` |
| `WHERE 列 IN (值...)` | 属于集合 | `SELECT * FROM student WHERE id IN (1, 3, 5);` |
| `WHERE 列 LIKE '模式'` | 模糊查询，`%` 任意多字符、`_` 单字符 | `SELECT * FROM student WHERE name LIKE '王%';` |
| `WHERE 列 IS NULL / IS NOT NULL` | 判断空值（不能用 `= NULL`） | `SELECT * FROM score WHERE score IS NULL;` |
| `ORDER BY 列 [ASC\|DESC]` | 排序，默认升序 | `SELECT * FROM score ORDER BY score DESC;` |
| `LIMIT n` / `LIMIT 偏移, n` | 截取前 n 行 / 分页 | `SELECT * FROM score ORDER BY score DESC LIMIT 3;` |

## 五、常用函数

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `CONCAT(a, b, ...)` | 字符串拼接 | `SELECT CONCAT(name, '同学') FROM student;` |
| `LENGTH(s)` / `CHAR_LENGTH(s)` | 字节长度 / 字符个数 | `SELECT CHAR_LENGTH(name) FROM student;` |
| `UPPER(s)` / `LOWER(s)` | 转大写 / 小写 | `SELECT UPPER('abc');` |
| `SUBSTRING(s, 起点, 长度)` | 截取子串（起点从 1 开始） | `SELECT SUBSTRING(name, 1, 1) FROM student;` |
| `ROUND(x, n)` | 四舍五入保留 n 位小数 | `SELECT ROUND(AVG(score), 1) FROM score;` |
| `CEIL(x)` / `FLOOR(x)` | 向上 / 向下取整 | `SELECT CEIL(81.2), FLOOR(81.8);` |
| `NOW()` / `CURDATE()` | 当前日期时间 / 当前日期 | `SELECT NOW();` |
| `YEAR(d)` / `MONTH(d)` / `DAY(d)` | 提取年 / 月 / 日 | `SELECT name, YEAR(birthday) FROM student;` |
| `DATEDIFF(d1, d2)` | 两日期相差天数（d1−d2） | `SELECT DATEDIFF(CURDATE(), birthday) FROM student;` |
| `TIMESTAMPDIFF(YEAR, d1, d2)` | 按年/月等计算差值（算年龄） | `SELECT TIMESTAMPDIFF(YEAR, birthday, CURDATE()) AS 年龄 FROM student;` |
| `IFNULL(a, b)` | a 为 NULL 时返回 b | `SELECT name, IFNULL(score, 0) FROM ...;` |
| `IF(条件, a, b)` | 条件成立返回 a，否则 b | `SELECT IF(score >= 60, '及格', '不及格') FROM score;` |
| `CASE WHEN ... THEN ... ELSE ... END` | 多分支判断 | `SELECT CASE WHEN score >= 90 THEN '优秀' WHEN score >= 60 THEN '及格' ELSE '不及格' END FROM score;` |

## 六、聚合与分组

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `COUNT(*)` / `COUNT(列)` | 计数；COUNT(列) 忽略 NULL | `SELECT COUNT(*) FROM student;` |
| `SUM(列)` / `AVG(列)` | 求和 / 平均（忽略 NULL） | `SELECT AVG(score) FROM score WHERE course_id = 1;` |
| `MAX(列)` / `MIN(列)` | 最大值 / 最小值 | `SELECT MAX(score), MIN(score) FROM score;` |
| `GROUP BY 列` | 按列分组 | `SELECT class_id, COUNT(*) FROM student GROUP BY class_id;` |
| `HAVING 条件` | 分组后过滤（可用聚合函数） | `SELECT student_id, AVG(score) FROM score GROUP BY student_id HAVING AVG(score) >= 80;` |
| 书写顺序 | SELECT→FROM→WHERE→GROUP BY→HAVING→ORDER BY→LIMIT | `SELECT course_id, AVG(score) FROM score WHERE score IS NOT NULL GROUP BY course_id HAVING AVG(score) > 75 ORDER BY AVG(score) DESC LIMIT 2;` |

## 七、多表连接（JOIN）

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `A JOIN B ON 条件` | 内连接：只保留两边都匹配的行 | `SELECT s.name, c.name FROM student s JOIN class c ON s.class_id = c.id;` |
| `A LEFT JOIN B ON 条件` | 左连接：左表全保留，右表没匹配的补 NULL | `SELECT s.name, sc.score FROM student s LEFT JOIN score sc ON sc.student_id = s.id;` |
| `A RIGHT JOIN B ON 条件` | 右连接：右表全保留 | `SELECT sc.score, s.name FROM score sc RIGHT JOIN student s ON sc.student_id = s.id;` |
| 三表连接 | 依次 JOIN 下去 | `SELECT st.name, c.name, sc.score FROM score sc JOIN student st ON sc.student_id = st.id JOIN course c ON sc.course_id = c.id;` |
| 表别名 | 简化书写，`表名 别名` | `FROM student s JOIN class c ON s.class_id = c.id` |
| `UNION` / `UNION ALL` | 上下拼接结果集（UNION 去重） | `SELECT name FROM student WHERE class_id = 1 UNION SELECT name FROM student WHERE gender = '女';` |

## 八、子查询

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `WHERE 列 = (子查询)` | 子查询返回单个值 | `SELECT name FROM student WHERE id = (SELECT student_id FROM score ORDER BY score DESC LIMIT 1);` |
| `WHERE 列 IN (子查询)` | 子查询返回一列多值 | `SELECT name FROM student WHERE id IN (SELECT student_id FROM score WHERE score >= 90);` |
| `WHERE 列 NOT IN (子查询)` | 取反："没有……的" | `SELECT name FROM student WHERE id NOT IN (SELECT student_id FROM score WHERE course_id = 3);` |
| `WHERE EXISTS (子查询)` | 存在匹配行即为真 | `SELECT name FROM student s WHERE EXISTS (SELECT 1 FROM score WHERE student_id = s.id);` |
| `FROM (子查询) AS 别名` | 把子查询当临时表用（必须起别名） | `SELECT AVG(总分) FROM (SELECT SUM(score) AS 总分 FROM score GROUP BY student_id) AS t;` |
| 与聚合比较 | 拿聚合值当"标尺" | `SELECT * FROM score WHERE score > (SELECT AVG(score) FROM score);` |

## 九、约束

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `PRIMARY KEY` | 主键：唯一 + 非空，一表一个 | `id INT PRIMARY KEY AUTO_INCREMENT` |
| `AUTO_INCREMENT` | 自增，配合主键使用 | 同上 |
| `NOT NULL` | 不允许为空 | `name VARCHAR(20) NOT NULL` |
| `DEFAULT 值` | 默认值 | `gender CHAR(1) NOT NULL DEFAULT '男'` |
| `UNIQUE` | 唯一约束（可多列联合） | `CONSTRAINT uk_sc UNIQUE (student_id, course_id)` |
| `CHECK (条件)` | 值必须满足条件 | `CONSTRAINT chk_score CHECK (score BETWEEN 0 AND 100)` |
| `FOREIGN KEY ... REFERENCES ...` | 外键：值必须在父表中存在 | `CONSTRAINT fk_s FOREIGN KEY (class_id) REFERENCES class(id)` |
| `ON DELETE CASCADE` | 父行删除时子行级联删除 | `FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE` |

## 十、索引

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `CREATE INDEX 索引名 ON 表 (列);` | 创建普通索引 | `CREATE INDEX idx_name ON student (name);` |
| `CREATE UNIQUE INDEX 索引名 ON 表 (列);` | 创建唯一索引 | `CREATE UNIQUE INDEX uk_cname ON course (name);` |
| `CREATE INDEX 索引名 ON 表 (列1, 列2);` | 联合索引（注意最左前缀） | `CREATE INDEX idx_sc ON score (student_id, course_id);` |
| `SHOW INDEX FROM 表;` | 查看表上的索引 | `SHOW INDEX FROM score;` |
| `DROP INDEX 索引名 ON 表;` | 删除索引 | `DROP INDEX idx_name ON student;` |
| `EXPLAIN 查询语句;` | 查看执行计划，判断是否用到索引 | `EXPLAIN SELECT * FROM student WHERE name = '张三';` |

## 十一、事务

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `START TRANSACTION;`（或 `BEGIN;`） | 开启事务 | `START TRANSACTION;` |
| `COMMIT;` | 提交：让改动真正生效 | `COMMIT;` |
| `ROLLBACK;` | 回滚：撤销事务内的所有改动 | `ROLLBACK;` |
| `SAVEPOINT 名;` / `ROLLBACK TO 名;` | 设置 / 回滚到保存点 | `SAVEPOINT sp1; ROLLBACK TO sp1;` |
| `SET autocommit = 0;` | 关闭自动提交 | `SET autocommit = 0;` |
| 典型用法 | 多条语句要么全成功要么全失败 | `START TRANSACTION; UPDATE ...; UPDATE ...; COMMIT;` |

## 十二、视图

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `CREATE VIEW 视图名 AS 查询;` | 创建视图（把查询"存名字"） | `CREATE VIEW v_score_report AS SELECT st.name, c.name AS course, sc.score FROM score sc JOIN student st ON sc.student_id = st.id JOIN course c ON sc.course_id = c.id;` |
| `SELECT * FROM 视图名;` | 像查表一样查视图 | `SELECT * FROM v_score_report;` |
| `CREATE OR REPLACE VIEW ... AS ...;` | 修改（覆盖）视图定义 | `CREATE OR REPLACE VIEW v_score_report AS SELECT ...;` |
| `SHOW CREATE VIEW 视图名;` | 查看视图定义 | `SHOW CREATE VIEW v_score_report;` |
| `DROP VIEW 视图名;` | 删除视图（不影响底层表数据） | `DROP VIEW v_score_report;` |

## 十三、用户与权限

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `CREATE USER '用户'@'主机' IDENTIFIED BY '密码';` | 创建用户 | `CREATE USER 'teacher'@'localhost' IDENTIFIED BY 'Teach@2026';` |
| `GRANT 权限 ON 库.表 TO '用户'@'主机';` | 授权（权限如 SELECT、INSERT、ALL） | `GRANT SELECT ON school.v_score_report TO 'teacher'@'localhost';` |
| `SHOW GRANTS FOR '用户'@'主机';` | 查看某用户的权限 | `SHOW GRANTS FOR 'teacher'@'localhost';` |
| `REVOKE 权限 ON 库.表 FROM '用户'@'主机';` | 收回权限 | `REVOKE SELECT ON school.v_score_report FROM 'teacher'@'localhost';` |
| `ALTER USER '用户'@'主机' IDENTIFIED BY '新密码';` | 修改密码 | `ALTER USER 'teacher'@'localhost' IDENTIFIED BY 'New@2026';` |
| `DROP USER '用户'@'主机';` | 删除用户 | `DROP USER 'teacher'@'localhost';` |
| `FLUSH PRIVILEGES;` | 刷新权限 | `FLUSH PRIVILEGES;` |

## 十四、备份与恢复（系统命令行执行，不是 SQL）

| 语法 | 说明 | 示例 |
| --- | --- | --- |
| `mysqldump -u 用户 -p 库名 > 文件.sql` | 备份单个库 | `mysqldump -u root -p school > school_backup.sql` |
| `mysqldump -u 用户 -p 库名 表名 > 文件.sql` | 备份单张表 | `mysqldump -u root -p school score > score_backup.sql` |
| `mysqldump -u 用户 -p --databases 库1 库2 > 文件.sql` | 备份多个库（含建库语句） | `mysqldump -u root -p --databases school > school_full.sql` |
| `mysqldump -u 用户 -p --all-databases > 文件.sql` | 备份全部数据库 | `mysqldump -u root -p --all-databases > all.sql` |
| `mysql -u 用户 -p 库名 < 文件.sql` | 恢复到指定库（库需先存在） | `mysql -u root -p school < school_backup.sql` |
| `SOURCE 文件路径;` | 在 mysql 客户端内执行 SQL 文件 | `SOURCE D:/backup/school_backup.sql;` |

---

## 使用小贴士

- 忘记语法先来这里查，查不到再去对应章节复习——速查表帮你"想起来"，章节帮你"搞明白"。
- 所有写操作（UPDATE / DELETE / DROP / TRUNCATE）动手前默念三遍：**有没有 WHERE？有没有备份？**
- 判断 NULL 只能用 `IS NULL` / `IS NOT NULL`；聚合函数会自动忽略 NULL。
- 建库建表统一 `utf8mb4`，中文、emoji 通吃，一劳永逸。
