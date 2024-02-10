module.exports = {
  scripts: [
    {
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7106984408518821',
      async: true,
      crossorigin: 'anonymous',
    },
  ],
  title: 'Abdulmalik',
  tagline: 'AppSec Engineer, DevSecOps, Security Engineer',
  url: 'https://blog.saintmalik.me',
  baseUrl: '/',
  trailingSlash: true,
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/saintmalik.jpg',
  organizationName: 'saintmalik', // Usually your GitHub org/user name.
  projectName: 'blog.saintmalik.me', // Usually your repo name.
  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    metadata: [{ name: 'keywords', content: 'Kubernetes Security, Containers, Docker, Pentest, Developers, DevOps, k8s, vulnerable, Kubernetes, Container Security, Open Source, DevSecOps' }],
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      hideOnScroll: true,
      title: "Ramblings from Abdulmalik",
      logo: {
        alt: "SaintMalik",
        src: "img/saintmalik.jpg",
        href: "https://blog.saintmalik.me",
        // target: "_blank",
      },
      items: [
        { to: "/", label: "Blog", position: "left" },
        {
          to: "/docs/",
          activeBasePath: "docs",
          label: "Notes",
          position: "left",
        },
        {
          href: 'https://saintmalik.me',
          label: 'About',
          position: 'right',
        },
        {
          href: 'https://saintmalik.me/talks',
          label: 'Talks',
          position: 'right',
        },
        {
          href: 'https://docs.google.com/document/d/1q0NQV-D_HZPc92cVaLe3ojAZCm_1l6Eb6duu6l7ddpE/edit?usp=sharing',
          label: 'Resume',
          position: 'right',
        },
      ],
    },
    footer: {
      links: [
            {
              label: 'Twitter',
              href: 'https://twitter.com/saintmalik_',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/saintmalik',
            },
            {
              label: 'Resume',
              href: 'https://docs.google.com/document/d/1q0NQV-D_HZPc92cVaLe3ojAZCm_1l6Eb6duu6l7ddpE/edit?usp=sharing',
            },
      ],
      copyright: `Last updated on ${new Date().toDateString()}`,
    },
  },
  customFields: {
    imgurl: 'https://saintmalikme.mo.cloudinary.net',
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        googleAnalytics: {
          trackingID: 'UA-123518521-4',
          anonymizeIP: true, // Should IPs be anonymized?
        },
        gtag: {
          trackingID: 'G-LYQVDXF79Z',
          anonymizeIP: true,
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
        },
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          disableVersioning: false,
          editCurrentVersion: false,
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: {
          blogTitle: 'Saintmalik Security Blog',
          blogDescription: 'Blog For Application Security, DevSecOps, Open Source, Golang, Web app performanc optimization and more.!',
          // showReadingTime: true,
          blogSidebarCount: 0,
          path: "./blog",
          routeBasePath: "/"
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};