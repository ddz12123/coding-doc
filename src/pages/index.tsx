import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

type Course = {
  icon: string;
  title: string;
  description: string;
  to: string;
  tags: string[];
  accent: string;
};

const COURSES: Course[] = [
  {
    icon: '🐍',
    title: 'Python',
    description: '从零基础到实战项目，覆盖语法、数据结构、函数、面向对象与文件操作。',
    to: '/docs/python/',
    tags: ['零基础友好', '实战项目'],
    accent: '#3776ab',
  },
  {
    icon: '🐹',
    title: 'Go',
    description: '现代后端语言，学习切片、接口、goroutine 并发编程与工程实践。',
    to: '/docs/go/',
    tags: ['并发编程', '工程实践'],
    accent: '#00add8',
  },
  {
    icon: '🐬',
    title: 'MySQL',
    description: '最流行的关系型数据库，SQL 语法、多表查询、索引与事务全掌握。',
    to: '/docs/mysql/',
    tags: ['SQL 基础', '索引优化'],
    accent: '#e48e00',
  },
  {
    icon: '⚡',
    title: 'Redis',
    description: '高性能内存数据库，数据类型、持久化机制、缓存实战与高可用。',
    to: '/docs/redis/',
    tags: ['缓存实战', '高可用'],
    accent: '#d82c20',
  },
  {
    icon: '🚀',
    title: 'FastAPI',
    description: '现代 Python Web 框架，路由、Pydantic 模型、JWT 认证与部署上线。',
    to: '/docs/fastapi/',
    tags: ['Web 后端', 'JWT 认证'],
    accent: '#009688',
  },
  {
    icon: '🧩',
    title: 'SQLAlchemy',
    description: 'Python 最强 ORM，模型定义、增删改查、表关系与 FastAPI 集成。',
    to: '/docs/sqlalchemy/',
    tags: ['ORM', 'FastAPI 集成'],
    accent: '#7c4dff',
  },
  {
    icon: '🐳',
    title: 'DevOps',
    description: 'Docker 容器化、Compose 编排、项目部署实战与 Jenkins 自动化流水线。',
    to: '/docs/devops/Docker基础/认识Docker',
    tags: ['Docker', 'Jenkins'],
    accent: '#2496ed',
  },
];

type Path = {
  emoji: string;
  name: string;
  steps: string[];
  note: string;
};

const PATHS: Path[] = [
  {
    emoji: '🌱',
    name: 'Python 后端路线',
    steps: ['Python', 'MySQL', 'SQLAlchemy', 'FastAPI', 'DevOps'],
    note: '从语言基础到完整后端服务部署上线',
  },
  {
    emoji: '⚙️',
    name: 'Go 开发路线',
    steps: ['Go', 'MySQL', 'Redis', 'DevOps'],
    note: '掌握 Go 并发编程与常用存储组件',
  },
  {
    emoji: '🗄️',
    name: '数据库专精路线',
    steps: ['MySQL', 'Redis', 'SQLAlchemy'],
    note: '关系型 + 缓存 + ORM，吃透数据层',
  },
];

function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={clsx('container', styles.heroInner)}>
        <p className={styles.heroBadge}>📚 全中文 · 零基础友好 · 持续更新</p>
        <Heading as="h1" className={styles.heroTitle}>
          把编程技术
          <span className={styles.heroTitleAccent}>一次学明白</span>
        </Heading>
        <p className={styles.heroSubtitle}>
          编程语言 · 数据库 · Web 开发 · 运维部署
          <br />
          七套体系化教程，从第一行代码到项目部署上线
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.heroPrimaryBtn} to="/docs/python/">
            开始学习 Python
          </Link>
          <a className={styles.heroSecondaryBtn} href="#courses">
            浏览全部教程
          </a>
        </div>
        <div className={styles.heroStats}>
          <div className={styles.heroStat}>
            <strong>7</strong>
            <span>套体系教程</span>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <strong>180+</strong>
            <span>篇图文章节</span>
          </div>
          <div className={styles.heroStatDivider} />
          <div className={styles.heroStat}>
            <strong>100%</strong>
            <span>可动手实战</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function CourseCard({icon, title, description, to, tags, accent}: Course) {
  return (
    <Link to={to} className={styles.courseCard} style={{'--accent': accent} as React.CSSProperties}>
      <div className={styles.courseIcon}>{icon}</div>
      <Heading as="h3" className={styles.courseTitle}>
        {title}
      </Heading>
      <p className={styles.courseDesc}>{description}</p>
      <div className={styles.courseTags}>
        {tags.map((tag) => (
          <span key={tag} className={styles.courseTag}>
            {tag}
          </span>
        ))}
      </div>
      <span className={styles.courseMore}>开始学习 →</span>
    </Link>
  );
}

function Courses() {
  return (
    <section className={styles.section} id="courses">
      <div className="container">
        <div className={styles.sectionHead}>
          <Heading as="h2" className={styles.sectionTitle}>
            选择一门课程开始
          </Heading>
          <p className={styles.sectionSubtitle}>每套教程都按「入门 → 基础 → 进阶 → 实战」编排，跟着敲完就能上手</p>
        </div>
        <div className={styles.courseGrid}>
          {COURSES.map((course) => (
            <CourseCard key={course.title} {...course} />
          ))}
        </div>
      </div>
    </section>
  );
}

function LearningPaths() {
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <div className={styles.sectionHead}>
          <Heading as="h2" className={styles.sectionTitle}>
            不知道从哪学起？
          </Heading>
          <p className={styles.sectionSubtitle}>按目标挑一条路线，顺着学就行</p>
        </div>
        <div className={styles.pathGrid}>
          {PATHS.map((path) => (
            <div key={path.name} className={styles.pathCard}>
              <div className={styles.pathHead}>
                <span className={styles.pathEmoji}>{path.emoji}</span>
                <Heading as="h3" className={styles.pathName}>
                  {path.name}
                </Heading>
              </div>
              <div className={styles.pathSteps}>
                {path.steps.map((step, i) => (
                  <span key={step} className={styles.pathStepWrap}>
                    {i > 0 && <span className={styles.pathArrow}>→</span>}
                    <span className={styles.pathStep}>{step}</span>
                  </span>
                ))}
              </div>
              <p className={styles.pathNote}>{path.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="首页"
      description="Python / Go / MySQL / Redis / FastAPI / SQLAlchemy / DevOps 入门到实战教程">
      <Hero />
      <main>
        <Courses />
        <LearningPaths />
      </main>
    </Layout>
  );
}
