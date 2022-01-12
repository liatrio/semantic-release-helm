const fs = require("fs/promises");
const path = require("path");
const YAML = require("yawn-yaml/cjs");
const parseGithubUrl = require("parse-github-url");
const got = require("got");

const { getOctokit } = require("./util/octokit");
const { createTempDir } = require("./util/temp-dir");
const { getChartAssets } = require("./util/chart-assets");
const { helmPackage, helmRepoIndex } = require("./util/helm");

const prepare = async (
    { charts, githubPagesBranch = "gh-pages" },
    {
        cwd,
        logger,
        nextRelease: { version, gitTag },
        options: { repositoryUrl }
    }
) => {
    const octokit = getOctokit();

    // create temp directory for work
    const tempDir = await createTempDir();
    logger.log(`Created temp directory for helm package assets: ${tempDir}`);

    // package helm charts into tarball
    await Promise.all(
        charts.map(async (chart) => {
            const chartYamlFile = path.join(chart, "Chart.yaml");
            const chartYaml = await fs.readFile(chartYamlFile);

            const doc = new YAML(chartYaml.toString());

            doc.json = {
                ...doc.json,
                version,
                appVersion: version
            };

            await fs.writeFile(chartYamlFile, doc.yaml);

            await helmPackage(chart, tempDir);
        })
    );

    // we have to copy each tarball to the repo directory so these assets can be uploaded to the github release
    const chartAssets = await getChartAssets();

    await Promise.all(
        chartAssets.map(async (asset) => {
            await fs.copyFile(path.join(tempDir, asset), path.join(cwd, asset));
        })
    );

    const { owner, name: repo } = parseGithubUrl(repositoryUrl);

    // prepare chart repo's index.yaml
    let oldChartIndexFile;
    try {
        const getPagesResponse = await octokit.rest.repos.getPages({
            owner,
            repo
        });
        const url = `${getPagesResponse.data.html_url}index.yaml`;

        // fetch the existing index.yaml, we'll have to update this in order to publish the chart
        const response = await got(url, {
            throwHttpErrors: false
        });

        if (response.statusCode === 200) {
            await fs.writeFile(
                path.join(tempDir, "current-index.yaml"),
                response.body
            );
            oldChartIndexFile = "current-index.yaml";
        }
    } catch (error) {
        // this error will be thrown if there isn't already an index.yaml to update
        logger.log("index.yaml file not found on GitHub pages site");
    }

    await helmRepoIndex(tempDir, `https://github.com/${owner}/${repo}/releases/download/${gitTag}`, oldChartIndexFile);
};

module.exports = {
    prepare
};
