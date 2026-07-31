import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: '语言基础',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        从零开始的 <a href="/docs/python/">Python</a> 和{' '}
        <a href="/docs/go/">Go</a> 教程，覆盖基础语法、数据结构、并发编程与实战项目。
      </>
    ),
  },
  {
    title: '数据库与存储',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        <a href="/docs/mysql/">MySQL</a>、<a href="/docs/redis/">Redis</a> 与{' '}
        <a href="/docs/sqlalchemy/">SQLAlchemy</a>{' '}
        教程，从安装配置到查询优化、持久化与高可用。
      </>
    ),
  },
  {
    title: 'Web 后端实战',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        <a href="/docs/fastapi/">FastAPI</a>{' '}
        教程，涵盖路由、Pydantic 模型、数据库整合、JWT 认证与项目部署。
      </>
    ),
  },
];

function Feature({title, Svg, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
