const fs = require("fs/promises");
const path = require("path");
const parseGithubUrl = require("parse-github-url");

const { getFileFromPages } = require("./util/github");
const { createTempDir } = require("./util/temp-dir");
const { getChartAssets } = require("./util/chart-assets");
const { helmPackage, helmRepoAdd, helmDependencyBuild, helmRepoIndex, updateHelmChartVersion, extractChartUrl, extractChartName } = require("./util/helm");
const { s3GetObject } = require("./util/aws");

const prepare = async (
    { charts, github, aws },
    {
        cwd,
        logger,
        nextRelease: { version, gitTag },
        options: { repositoryUrl }
    }
) => {
    // create temp directory for work
    const tempDir = await createTempDir();
    logger.log(`Created temp directory for helm package assets: ${tempDir}`);

    // package helm charts into tarball
    await Promise.all(
        charts.map(async (chart) => {

            const depChartURL = await extractChartUrl(chart);
            const depChartName = await extractChartName(chart);

            await updateHelmChartVersion(chart, version);
            await helmRepoAdd(depChartURL, depChartName);
            await helmDependencyBuild(chart);
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

    // prepare chart repo's index.yaml
    let oldChartIndexFile, chartRepoUrlPrefix;
    if (github) {
        const { owner, name: repo } = parseGithubUrl(repositoryUrl);

        oldChartIndexFile = await getFileFromPages(owner, repo, "index.yaml");
        chartRepoUrlPrefix = `https://github.com/${owner}/${repo}/releases/download/${gitTag}`;
    } else {
        oldChartIndexFile = await s3GetObject(aws.region, aws.bucket, "index.yaml");
        chartRepoUrlPrefix = `${aws.bucketUrl}/assets`;
    }

    if (oldChartIndexFile) {
        await fs.writeFile(
            path.join(tempDir, "current-index.yaml"),
            oldChartIndexFile
        );

        return await helmRepoIndex(tempDir, chartRepoUrlPrefix, "current-index.yaml");
    }

    return await helmRepoIndex(tempDir, chartRepoUrlPrefix);
};

module.exports = {
    prepare
};
