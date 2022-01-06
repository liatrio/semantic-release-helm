const { Octokit } = require("@octokit/rest");

let octokit;

const getOctokit = () => {
    if (!octokit) {
        octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN,
        });
    }

    return octokit;
};

module.exports = {
    getOctokit,
};
