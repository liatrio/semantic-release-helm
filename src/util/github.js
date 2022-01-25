const { Octokit: Github } = require("@octokit/rest");
const got = require("got");

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

const getFileFromPages = async (owner, repo, file) => {
    const { data: { html_url } } = await getOctokit().rest.repos.getPages({
        owner,
        repo
    });
    const url = `${html_url}${file}`;

    const response = await got(url, {
        throwHttpErrors: false
    });

    if (response.statusCode === 200) {
        return response.body;
    }

    return undefined;
};

module.exports = {
    getRepository,
    getRepositoryBranch,
    getFileFromPages
};
