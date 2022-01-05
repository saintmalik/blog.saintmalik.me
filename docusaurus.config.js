module.exports = {
  title: 'SaintMalik',
  tagline: 'Penetration Tester and Aspiring AppSec Engineer.',
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
    navbar: {
      hideOnScroll: true,
      title: "SaintMalik",
      logo: {
        alt: "SaintMalik",
        src: "img/saintmalik.jpg",
        href: "https://saintmalik.me",
        target: "_blank",
      },
      items: [
        { to: "/", label: "Blog", position: "left" },
        {
          to: "/docs/",
          activeBasePath: "docs",
          label: "Docs",
          position: "left",
        },
        {
          href: 'https://saintmalik.me/about',
          label: 'About',
          position: 'right',
        },
        {
          href: 'https://saintmalik.me/works',
          label: 'Works',
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
          title: 'Connect',
          items: [
            {
              label: 'Twitter',
              href: 'https://twitter.com/saintmalik_',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/saintmalik',
            },
            {
              label: 'Email',
              href: 'mailto:saintmalik@protonmail.com',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'About',
              href: 'https://saintmalik.me/about',
            },
            {
              label: 'Work',
              href: 'https://saintmalik.me/works',
            },
            {
              label: 'Resume',
              href: 'https://docs.google.com/document/d/1q0NQV-D_HZPc92cVaLe3ojAZCm_1l6Eb6duu6l7ddpE/edit?usp=sharing',
            },
          ],
        },
      ],
      copyright: `Last updated on ${new Date().toDateString()}`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        googleAnalytics: {
          trackingID: 'UA-123518521-4',
          anonymizeIP: true, // Should IPs be anonymized?
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          disableVersioning: false,
          editCurrentVersion: false,
        },
        blog: {
          blogTitle: 'Blog',
          blogDescription: 'My Blog For Application Security, Open Source, Golang, Web app performanc optimization and more.!',
          // showReadingTime: true,
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
