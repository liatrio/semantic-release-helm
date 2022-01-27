const SemanticReleaseError = require("@semantic-release/error");
const parseGithubUrl = require("parse-github-url");
const AggregateError = require("aggregate-error");

const { getRepository, getRepositoryBranch } = require("./util/github");
const { helmVersion, helmLint } = require("./util/helm");
const { getCallerIdentity, s3HeadBucket } = require("./util/aws");

const verifyConditions = async (
    { charts, github, aws },
    { logger, options: { repositoryUrl } }
) => {
    const errors = [];

    // verify that Helm is installed
    try {
        const version = await helmVersion();

        logger.log("Using Helm version %s", version);
    } catch (error) {
        errors.push(
            new SemanticReleaseError(
                `Error verifying Helm version: ${error.message}`
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

    // verify that either `aws` or `github` config option is set with correct info
    // throw immediately if both are set, or if neither are set
    if ((!github && !aws) || (github && aws)) {
        errors.push(
            new SemanticReleaseError(
                "Expected either `aws` or `github` config options to be set"
            )
        );

        throw new AggregateError(errors);
    }

    // github related checks
    if (github) {
        const { owner, name: repo } = parseGithubUrl(repositoryUrl);

        // verify that `pagesBranch` is set
        if (!github.pagesBranch) {
            errors.push(
                new SemanticReleaseError("Expected `github.pagesBranch` config option to be set")
            );
        } else {
            // verify that the branch specified via the `github.pagesBranch` config is a valid branch
            try {
                await getRepositoryBranch(owner, repo, github.pagesBranch);
            } catch (error) {
                errors.push(
                    new SemanticReleaseError(
                        `Error fetching branch "${github.pagesBranch}" for GitHub Pages: ${error.message}`
                    )
                );
            }
        }

        // verify that the GITHUB_TOKEN env variable is set
        // if it isn't set, throw immediately, since additional verification checks below won't work
        if (!process.env.GITHUB_TOKEN) {
            errors.push(
                new SemanticReleaseError(`GITHUB_TOKEN environment variable must be set`)
            );

            throw new AggregateError(errors);
        }

        // verify that github pages is enabled for this repository
        try {
            const repository = await getRepository(owner, repo);

            if (!repository.data.has_pages) {
                errors.push(
                    new SemanticReleaseError(
                        `GitHub Pages is not enabled for repository ${owner}/${repo}`
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
    }

    if (aws) {
        // verify that AWS region, s3 bucket, and bucket url are specified
        // if not, throw immediately, since additional verification checks below won't work
        if (!aws.region || !aws.bucket || !aws.bucketUrl) {
            errors.push(
                new SemanticReleaseError("Expected `aws.region`, `aws.bucket`, and `aws.bucketUrl` config options to be set")
            );

            throw new AggregateError(errors);
        }

        // verify AWS authentication via the STS.GetCallerIdentity API.
        // if this fails, throw immediately, since we won't be able to use any other AWS APIs
        try {
            const callerIdentity = await getCallerIdentity(aws.region);

            logger.log(`AWS Caller Identity: ${callerIdentity}`);
        } catch (error) {
            errors.push(
                new SemanticReleaseError(`Error determining AWS Caller Identity: ${error.message}`)
            );

            throw new AggregateError(errors);
        }

        // verify s3 bucket exists and that we have access to it
        try {
            await s3HeadBucket(aws.region, aws.bucket);

            logger.log("Verified S3 Bucket exists");
        } catch (error) {
            errors.push(
                new SemanticReleaseError(`Error running S3.HeadBucket: ${error.message}`)
            );
        }
    }

    if (errors.length > 0) {
        throw new AggregateError(errors);
    }
};

module.exports = {
    verifyConditions
};
