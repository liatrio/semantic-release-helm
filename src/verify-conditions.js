const SemanticReleaseError = require("@semantic-release/error");
const parseGithubUrl = require("parse-github-url");
const AggregateError = require("aggregate-error");

const { getOctokit } = require("./util/octokit");
const { helmVersion, helmLint } = require("./util/helm");

const verifyConditions = async (
    { charts, githubPagesBranch = "gh-pages" },
    { logger, options: { repositoryUrl } }
) => {
    const errors = [],
        octokit = getOctokit();

    // verify that Helm is installed
    try {
        const version = await helmVersion();

        logger.log("Using Helm Version %s", version);
    } catch (error) {
        errors.push(
            new SemanticReleaseError(
                `Error verifying helm version: ${error.message}`
            )
        );
    }

    // verify that `charts` config option is set, and each specified chart passes `helm lint`
    if (!charts || charts.length === 0) {
        errors.push(
            new SemanticReleaseError(
                "Expected `charts` option to be set with at least one chart path"
            )
        );
    } else {
        await Promise.all(
            charts.map(async (chart) => {
                try {
                    await helmLint(chart);
                } catch (error) {
                    errors.push(
                        new SemanticReleaseError(
                            `Chart ${chart} failed validation: ${error.message}`
                        )
                    );
                }
            })
        );
    }

    // verify that github pages is enabled for this repository
    const { owner, name: repo } = parseGithubUrl(repositoryUrl);
    try {
        const response = await octokit.rest.repos.get({
            owner,
            repo
        });

        if (!response.data.has_pages) {
            errors.push(
                new SemanticReleaseError(
                    `GitHub pages is not enabled for repository ${owner}/${repo}`
                )
            );
        }
    } catch (error) {
        errors.push(
            new SemanticReleaseError(
                `Error fetching GitHub repository: ${error.message}`
            )
        );
    }

    // verify that the branch specified via the `githubPagesBranch` config is a valid branch
    try {
        await octokit.rest.repos.getBranch({
            owner,
            repo,
            branch: githubPagesBranch
        });
    } catch (error) {
        errors.push(
            new SemanticReleaseError(
                `Error fetching branch "${githubPagesBranch}" for GitHub pages: ${error.message}`
            )
        );
    }

    if (errors.length > 0) {
        throw new AggregateError(errors);
    }
};

module.exports = {
    verifyConditions
};
