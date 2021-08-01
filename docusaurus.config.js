module.exports = {
  title: 'SaintMalik',
  tagline: 'Penetration Tester and Aspiring Security Engineer.',
  url: 'https://blog.saintmalik.me',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/saintmalik.jpg',
  organizationName: 'blog.saintmalik.me', // Usually your GitHub org/user name.
  projectName: 'blog.saintmalik.me', // Usually your repo name.
  themeConfig: {
    gtag: {
      // You can also use your "G-" Measurement ID here.
      trackingID: 'UA-123518521-4',
      // Optional fields.
      anonymizeIP: true, // Should IPs be anonymized?
    },
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
        target: "_self",
      },
      items: [
        // {
        //   type: 'doc',
        //   docId: 'intro',
        //   position: 'left',
        //   label: 'Tutorial',
        // },
        { to: "/", label: "Blog", position: "left" },
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
          href: 'https://saintmalik.me/resume',
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
              href: 'https://saintmalik.me/resume',
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
        docs: {
         sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
           editUrl:
             'https://github.com/facebook/docusaurus/edit/master/website/',
         },
        blog: {
          blogTitle: 'Saintmalik Blog !',
          blogDescription: 'My New Blog!',
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
