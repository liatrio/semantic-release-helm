jest.mock("fs/promises");
jest.mock("gh-pages");
jest.mock("../src/util/temp-dir");
jest.mock("../src/util/chart-assets");
jest.mock("../src/util/aws");

const fs = require("fs/promises");
const path = require("path");

const ghpages = require("gh-pages");
const { publish } = require("../src/publish");
const { getTempDir } = require("../src/util/temp-dir");
const { getChartAssets } = require("../src/util/chart-assets");
const { createGitHubPluginConfig, createAWSPluginConfig } = require("./util/helpers");
const { s3PutObject } = require("../src/util/aws");

describe("publish", () => {
    let expectedPluginConfig,
        expectedTempDir;

    beforeEach(() => {
        expectedPluginConfig = createGitHubPluginConfig();
        expectedTempDir = chance.word();

        getTempDir.mockResolvedValue(expectedTempDir);
        ghpages.publish.mockImplementation((dir, args, cb) => {
            cb();
        });
    });

    it("should fetch the temporary directory that was created for the helm chart assets", async () => {
        await publish(expectedPluginConfig, context);

        expect(getTempDir).toHaveBeenCalled();
    });

    describe("when using github pages as the helm chart repo", () => {
        it("should delete the chart assets that were copied to the main directory for publishing the GitHub release", async () => {
            await publish(expectedPluginConfig, context);

            // the arguments are slightly different since this is being invoked via `util.promisify`
            expect(ghpages.publish).toHaveBeenCalledWith(expectedTempDir, {
                branch: expectedPluginConfig.github.pagesBranch,
                src: "index.yaml"
            }, expect.any(Function));
        });

        it("should not put objects into s3", async () => {
            await publish(expectedPluginConfig, context);

            expect(s3PutObject).not.toHaveBeenCalled();
        });
    });

    describe("when using s3 as the helm chart repo", () => {
        let expectedChartAssets,
            expectedChartTarballs,
            expectedIndexYamlBody;

        beforeEach(() => {
            expectedPluginConfig = createAWSPluginConfig();

            expectedChartAssets = chance.n(chance.word, chance.d6());
            expectedChartTarballs = expectedChartAssets.map(() => chance.word());

            getChartAssets.mockResolvedValue(expectedChartAssets);

            when(fs.readFile).calledWith(path.join(expectedTempDir, "index.yaml")).mockResolvedValue(expectedIndexYamlBody);
            expectedChartAssets.forEach((expectedChartAsset, i) => {
                when(fs.readFile).calledWith(path.join(expectedTempDir, expectedChartAsset)).mockResolvedValue(expectedChartTarballs[i]);
            });
        });

        it("should write the index.yaml file to the root of the s3 bucket", async () => {
            await publish(expectedPluginConfig, context);

            expect(s3PutObject).toHaveBeenCalledWith(expectedPluginConfig.aws.region, expectedPluginConfig.aws.bucket, "index.yaml", expectedIndexYamlBody);
        });

        it("should write each chart tarball to s3", async () => {
            await publish(expectedPluginConfig, context);

            expectedChartAssets.forEach((expectedChartAsset, i) => {
                expect(s3PutObject).toHaveBeenCalledWith(expectedPluginConfig.aws.region, expectedPluginConfig.aws.bucket, `assets/${expectedChartAsset}`, expectedChartTarballs[i])
            });
        });

        it("should not publish to GitHub Pages", async () => {
            await publish(expectedPluginConfig, context);

            expect(ghpages.publish).not.toHaveBeenCalled();
        });
    });
});
