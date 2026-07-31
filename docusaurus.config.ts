import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: '编程学习文档',
  tagline: 'Python / Go / MySQL / Redis / FastAPI / SQLAlchemy / DevOps 入门到实战教程',
  favicon: 'img/logo.svg',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
    // 启用 Rust 工具链（SWC/Rspack/Lightning CSS），大幅提升构建与热更新速度
    faster: true,
  },

  // Set the production url of your site here
  url: 'https://doc.ainotehub.top',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  onBrokenLinks: 'throw',
  // 锚点（xx.md#标题）失效也在构建时报错，防止跨章引用悄悄失效
  onBrokenAnchors: 'throw',

  markdown: {
    // .md 按 CommonMark 解析，.mdx 按 MDX 解析，避免教程中的 <、{ 等字符触发 MDX 编译错误
    format: 'detect',
    // 支持 ```mermaid 代码块渲染流程图/ER 图
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
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
          // 显示"最后更新时间"（取自 git 提交历史）
          showLastUpdateTime: true,
          // 每页底部"编辑此页"链接，跳转 Gitee 在线编辑
          editUrl: 'https://gitee.com/passerbycoding/docs/edit/master/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    // Python 代码块浏览器内运行（Brython），代码块加 live_py 标记启用
    // Brython 运行时改为本地自托管（static/brython/），避免默认 jsdelivr CDN 在国内加载失败
    [
      'docusaurus-live-brython',
      {
        brythonSrc: '/brython/brython.min.js',
        brythonStdlibSrc: '/brython/brython_stdlib.js',
      },
    ],
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        // 本地离线搜索，支持中文分词
        hashed: true,
        language: ['zh', 'en'],
        indexBlog: false,
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-pwa',
      {
        // 离线缓存 + 可安装到桌面/手机
        offlineModeActivationStrategies: ['appInstalled', 'standalone', 'queryString'],
        pwaHead: [
          {tagName: 'link', rel: 'icon', href: '/img/logo.svg'},
          {tagName: 'link', rel: 'manifest', href: '/manifest.json'},
          {tagName: 'meta', name: 'theme-color', content: '#2e8555'},
        ],
      },
    ],
    [
      'docusaurus-plugin-llms',
      {
        // 构建时生成 /llms.txt（目录）与 /llms-full.txt（全文），方便读者喂给 AI 提问
        generateLLMsTxt: true,
        generateLLMsFullTxt: true,
        title: '编程学习文档',
        description: 'Python / Go / MySQL / Redis / FastAPI / SQLAlchemy / DevOps 入门到实战教程',
      },
    ],
  ],

  // 客户端增强：页面切换进度条 + 阅读进度条
  clientModules: [
    './src/clientModules/routeProgress.js',
    './src/clientModules/readingProgress.js',
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        // 侧边栏可整体收起
        hideable: true,
        // 展开一个章节时自动折叠其他章节
        autoCollapseCategories: true,
      },
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
        {
          type: 'dropdown',
          label: '演练场',
          position: 'right',
          // 父项自己也指向 Python 演练场，并在 /playground 下的所有页面保持高亮
          to: '/playground',
          activeBaseRegex: '^/playground',
          items: [
            // 不加精确匹配的话 /playground/go 会让 /playground 也被前缀命中高亮
            {to: '/playground', label: 'Python 演练场', activeBaseRegex: '^/playground/?$'},
            {to: '/playground/go', label: 'Go 演练场'},
          ],
        },
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
          title: '运维部署',
          items: [
            {label: 'DevOps 教程', to: '/docs/devops/Docker基础/认识Docker'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} 编程学习文档. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'sql', 'go', 'python', 'yaml', 'json', 'lua'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
