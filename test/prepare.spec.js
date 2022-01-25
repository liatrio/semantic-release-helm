jest.mock("fs/promises");
jest.mock("got");

jest.mock("../src/util/github");
jest.mock("../src/util/temp-dir");
jest.mock("../src/util/chart-assets");
jest.mock("../src/util/helm");

const fs = require("fs/promises");
const got = require("got");
const path = require("path");

const { prepare } = require("../src/prepare");
const { getRepositoryPages } = require("../src/util/github");
const { createTempDir } = require("../src/util/temp-dir");
const { getChartAssets } = require("../src/util/chart-assets");
const { helmPackage, helmRepoIndex, updateHelmChartVersion } = require("../src/util/helm");
const { createGitHubPluginConfig } = require("./util/helpers");

describe("prepare", () => {
    let expectedPluginConfig,
        expectedTempDir,
        expectedChartAssets,
        expectedPagesUrl,
        expectedIndexYamlBody,
        expectedReleaseDownloadPrefix;

    beforeEach(async () => {
        expectedPluginConfig = createGitHubPluginConfig()
        expectedTempDir = chance.word();
        expectedChartAssets = chance.n(chance.word, chance.d6());
        expectedPagesUrl = chance.url() + "/";
        expectedIndexYamlBody = chance.string();
        expectedReleaseDownloadPrefix = `https://github.com/${expectedRepoOwner}/${expectedRepoName}/releases/download/${context.nextRelease.gitTag}`;

        createTempDir.mockResolvedValue(expectedTempDir);

        updateHelmChartVersion.mockResolvedValue();
        helmPackage.mockResolvedValue();
        helmRepoIndex.mockResolvedValue();

        getChartAssets.mockResolvedValue(expectedChartAssets);

        fs.copyFile.mockResolvedValue();
        fs.writeFile.mockResolvedValue();

        getRepositoryPages.mockResolvedValue({
            data: {
                html_url: expectedPagesUrl
            }
        });
        got.mockResolvedValue({
            statusCode: 200,
            body: expectedIndexYamlBody
        });
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

    it("should attempt to fetch the existing chart repo index.yaml file and write it to a local file", async () => {
        await prepare(expectedPluginConfig, context);

        const expectedChartYamlFilePath = path.join(expectedTempDir, "current-index.yaml");

        expect(getRepositoryPages).toHaveBeenCalledWith(expectedRepoOwner, expectedRepoName);
        expect(got).toHaveBeenCalledWith(expectedPagesUrl + "index.yaml", {
            throwHttpErrors: false
        });
        expect(fs.writeFile).toHaveBeenCalledWith(expectedChartYamlFilePath, expectedIndexYamlBody);
    });

    it("should update the index.yaml file via `helm repo index`", async () => {
        await prepare(expectedPluginConfig, context);

        expect(helmRepoIndex).toHaveBeenCalledWith(expectedTempDir, expectedReleaseDownloadPrefix, "current-index.yaml");
    });

    describe("when the chart repo does not already have an index.yaml file", () => {
        beforeEach(() => {
            got.mockResolvedValue({
                statusCode: 404
            });
        });

        it("should create a brand new index.yaml file without merging", async () => {
            await prepare(expectedPluginConfig, context);

            expect(helmRepoIndex).toHaveBeenCalledWith(expectedTempDir, expectedReleaseDownloadPrefix, undefined);
        });
    });
});
