const { promisify } = require("util");
const ghpages = require("gh-pages");

const ghpagesPublish = promisify(ghpages.publish);

const { getTempDir } = require("./util/temp-dir");

const publish = async ({ githubPagesBranch = "gh-pages" }) => {
    const tempDir = await getTempDir();

    await ghpagesPublish(tempDir, {
        branch: githubPagesBranch,
        src: "index.yaml",
    });
};

module.exports = {
    publish,
};
