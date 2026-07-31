import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: '编程学习文档',
  tagline: 'Python / Go / MySQL / Redis / FastAPI / SQLAlchemy 入门到实战教程',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  onBrokenLinks: 'warn',

  markdown: {
    // .md 按 CommonMark 解析，.mdx 按 MDX 解析，避免教程中的 <、{ 等字符触发 MDX 编译错误
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: '编程学习文档',
      logo: {
        alt: 'Logo',
        src: 'img/logo.svg',
      },
      items: [
        {type: 'docSidebar', sidebarId: 'pythonSidebar', position: 'left', label: 'Python'},
        {type: 'docSidebar', sidebarId: 'goSidebar', position: 'left', label: 'Go'},
        {type: 'docSidebar', sidebarId: 'mysqlSidebar', position: 'left', label: 'MySQL'},
        {type: 'docSidebar', sidebarId: 'redisSidebar', position: 'left', label: 'Redis'},
        {type: 'docSidebar', sidebarId: 'fastapiSidebar', position: 'left', label: 'FastAPI'},
        {type: 'docSidebar', sidebarId: 'sqlalchemySidebar', position: 'left', label: 'SQLAlchemy'},
        {type: 'docSidebar', sidebarId: 'devopsSidebar', position: 'left', label: 'DevOps'},
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '语言基础',
          items: [
            {label: 'Python 教程', to: '/docs/python/'},
            {label: 'Go 教程', to: '/docs/go/'},
          ],
        },
        {
          title: '数据库',
          items: [
            {label: 'MySQL 教程', to: '/docs/mysql/'},
            {label: 'Redis 教程', to: '/docs/redis/'},
            {label: 'SQLAlchemy 教程', to: '/docs/sqlalchemy/'},
          ],
        },
        {
          title: 'Web 开发',
          items: [
            {label: 'FastAPI 教程', to: '/docs/fastapi/'},
          ],
        },
        {
          title: 'DevOps',
          items: [
            {label: 'Docker 教程', to: '/docs/devops/'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} 编程学习文档. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'sql', 'go', 'python', 'yaml', 'json', 'lua', 'docker', 'nginx'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
