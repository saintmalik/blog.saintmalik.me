
// module.exports = {
  // By default, Docusaurus generates a sidebar from the docs folder structure
  // tutorialSidebar: [{type: 'autogenerated', dirName: '.'}],
module.exports = {
    docs: [
      {
        type: "doc",
        id: "intro",
      },
      {
        type: "category",
        label: "Error & Solution Log",
        items: ["debug-crontab-tasks"],
      },
      {
        type: "category",
        label: "My Golang Diary",
        items: ["debug-crontab-tasks"],
      },
    ],
  };
