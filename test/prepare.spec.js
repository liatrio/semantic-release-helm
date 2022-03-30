jest.mock("fs/promises");
jest.mock("got");

jest.mock("../src/util/github");
jest.mock("../src/util/temp-dir");
jest.mock("../src/util/chart-assets");
jest.mock("../src/util/helm");
jest.mock("../src/util/aws");

const fs = require("fs/promises");
const path = require("path");

const { prepare } = require("../src/prepare");
const { getFileFromPages } = require("../src/util/github");
const { createTempDir } = require("../src/util/temp-dir");
const { getChartAssets } = require("../src/util/chart-assets");
const { helmPackage, helmRepoIndex, updateHelmChartVersion } = require("../src/util/helm");
const { createGitHubPluginConfig, createAWSPluginConfig } = require("./util/helpers");
const { s3GetObject } = require("../src/util/aws");

describe("prepare", () => {
    let expectedPluginConfig,
        expectedTempDir,
        expectedChartAssets,
        expectedIndexYamlBody;

    beforeEach(async () => {
        expectedPluginConfig = createGitHubPluginConfig();
        expectedTempDir = chance.word();
        expectedChartAssets = chance.n(chance.word, chance.d6());
        expectedIndexYamlBody = chance.string();

        createTempDir.mockResolvedValue(expectedTempDir);

        updateHelmChartVersion.mockResolvedValue();
        helmPackage.mockResolvedValue();
        helmRepoIndex.mockResolvedValue();

        getChartAssets.mockResolvedValue(expectedChartAssets);

        fs.copyFile.mockResolvedValue();
        fs.writeFile.mockResolvedValue();

        getFileFromPages.mockResolvedValue(expectedIndexYamlBody);
        s3GetObject.mockResolvedValue(expectedIndexYamlBody);
    });

    it("should create a temp directory for the chart assets and index.yaml", async () => {
        await prepare(expectedPluginConfig, context);

        expect(createTempDir).toHaveBeenCalled();
    });

    it("should bump each chart's chart.yaml file, and package each helm chart into a tarball", async () => {
        // easier to assert call order when there's only one chart
        const randomChart = chance.word();
        expectedPluginConfig.charts = [randomChart];

        await prepare(expectedPluginConfig, context);

        expect(updateHelmChartVersion).toHaveBeenCalledWith(randomChart, context.nextRelease.version);
        expect(helmPackage).toHaveBeenCalledWith(randomChart, expectedTempDir);

        expect(updateHelmChartVersion).toHaveBeenCalledBefore(helmPackage);

        // now with multiple charts
        const randomCharts = chance.n(chance.word, chance.d6() + 1);
        expectedPluginConfig.charts = randomCharts;

        await prepare(expectedPluginConfig, context);

        randomCharts.forEach((chart) => {
            expect(updateHelmChartVersion).toHaveBeenCalledWith(chart, context.nextRelease.version);
            expect(helmPackage).toHaveBeenCalledWith(chart, expectedTempDir);
        });
    });

    it("should copy all chart tarballs to the repo home so they can be uploaded to the GitHub release", async () => {
        await prepare(expectedPluginConfig, context);

        expectedChartAssets.forEach((chartAsset) => {
            const expectedAssetFrom = path.join(expectedTempDir, chartAsset);
            const expectedAssetTo = path.join(context.cwd, chartAsset);

            expect(fs.copyFile).toHaveBeenCalledWith(expectedAssetFrom, expectedAssetTo);
        });
    });

    describe("when using github pages as the helm chart repo", () => {
        let expectedGitHubReleaseDownloadPrefix;

        beforeEach(() => {
            expectedGitHubReleaseDownloadPrefix = `https://github.com/${expectedRepoOwner}/${expectedRepoName}/releases/download/${context.nextRelease.gitTag}`;
        });

        it("should attempt to fetch the existing chart repo index.yaml file from GitHub pages and write it to a local file", async () => {
            await prepare(expectedPluginConfig, context);

            const expectedChartYamlFilePath = path.join(expectedTempDir, "current-index.yaml");

            expect(getFileFromPages).toHaveBeenCalledWith(expectedRepoOwner, expectedRepoName, "index.yaml");
            expect(fs.writeFile).toHaveBeenCalledWith(expectedChartYamlFilePath, expectedIndexYamlBody);
        });

        it("should update the index.yaml file via `helm repo index`", async () => {
            await prepare(expectedPluginConfig, context);

            expect(helmRepoIndex).toHaveBeenCalledWith(expectedTempDir, expectedGitHubReleaseDownloadPrefix, "current-index.yaml");
        });

        it("should not attempt to make any AWS API calls", async () => {
            await prepare(expectedPluginConfig, context);

            expect(s3GetObject).not.toHaveBeenCalled();
        });

        describe("when the github chart repo does not already have an index.yaml file", () => {
            beforeEach(() => {
                getFileFromPages.mockResolvedValue(undefined);
            });

            it("should create a brand new index.yaml file without merging", async () => {
                await prepare(expectedPluginConfig, context);

                expect(helmRepoIndex).toHaveBeenCalledWith(expectedTempDir, expectedGitHubReleaseDownloadPrefix);
                expect(fs.writeFile).not.toHaveBeenCalled();
            });
        });
    });

    describe("when using s3 as the helm chart repo", () => {
        let expectedS3DownloadPrefix;

        beforeEach(() => {
            expectedPluginConfig = createAWSPluginConfig();
            expectedS3DownloadPrefix = `${expectedPluginConfig.aws.bucketUrl}/assets`;
        });

        it("should attempt to fetch the existing chart repo index.yaml file from the s3 bucket and write it to a local file", async () => {
            await prepare(expectedPluginConfig, context);

            const expectedChartYamlFilePath = path.join(expectedTempDir, "current-index.yaml");

            expect(s3GetObject).toHaveBeenCalledWith(expectedPluginConfig.aws.region, expectedPluginConfig.aws.bucket, "index.yaml");
            expect(fs.writeFile).toHaveBeenCalledWith(expectedChartYamlFilePath, expectedIndexYamlBody);
        });

        it("should update the index.yaml file via `helm repo index`", async () => {
            await prepare(expectedPluginConfig, context);

            expect(helmRepoIndex).toHaveBeenCalledWith(expectedTempDir, expectedS3DownloadPrefix, "current-index.yaml");
        });

        it("should not attempt to make any GitHub API calls", async () => {
            await prepare(expectedPluginConfig, context);

            expect(getFileFromPages).not.toHaveBeenCalled();
        });

        describe("when the s3 chart repo does not already have an index.yaml file", () => {
            beforeEach(() => {
                s3GetObject.mockResolvedValue(undefined);
            });

            it("should create a brand new index.yaml file without merging", async () => {
                await prepare(expectedPluginConfig, context);

                expect(helmRepoIndex).toHaveBeenCalledWith(expectedTempDir, expectedS3DownloadPrefix);
                expect(fs.writeFile).not.toHaveBeenCalled();
            });
        });
    });
});
