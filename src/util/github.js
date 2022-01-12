const { Octokit: Github } = require("@octokit/rest");

let octokit;

const getOctokit = () => {
    if (!octokit) {
        octokit = new Github({
            auth: process.env.GITHUB_TOKEN
        });
    }

    return octokit;
};

const getRepository = (owner, repo) => getOctokit().rest.repos.get({
    owner,
    repo
});

const getRepositoryBranch = (owner, repo, branch) => getOctokit().rest.repos.getBranch({
    owner,
    repo,
    branch
});

const getRepositoryPages = (owner, repo) => getOctokit().rest.repos.getPages({
    owner,
    repo
});

module.exports = {
    getRepository,
    getRepositoryBranch,
    getRepositoryPages
};
