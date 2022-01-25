const { promisify } = require("util");
const { readFile } = require("fs/promises");
const path = require("path");
const ghpages = require("gh-pages");

const ghpagesPublish = promisify(ghpages.publish);

const { getTempDir } = require("./util/temp-dir");
const { s3PutObject } = require("./util/aws");
const { getChartAssets } = require("./util/chart-assets");

const publish = async ({ github, aws }, { logger }) => {
    const tempDir = await getTempDir();

    if (github) {
        await ghpagesPublish(tempDir, {
            branch: github.pagesBranch,
            src: "index.yaml"
        });
    } else {
        const indexFileContents = await readFile(path.join(tempDir, "index.yaml"));
        const chartAssets = await getChartAssets();

        await s3PutObject(aws.region, aws.bucket, "index.yaml", indexFileContents);
        logger.log(`Successfully uploaded index.yaml`);

        await Promise.all(chartAssets.map(async (asset) => {
            const chartTarball = await readFile(path.join(tempDir, asset));

            await s3PutObject(aws.region, aws.bucket, `assets/${asset}`, chartTarball);
            logger.log(`Successfully uploaded ${asset}`);
        }));
    }
};

module.exports = {
    publish
};
