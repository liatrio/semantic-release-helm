jest.mock("../src/util/temp-dir");
jest.mock("../src/util/chart-assets");

const { cleanup } = require("../src/cleanup");
const { deleteTempDir } = require("../src/util/temp-dir");
const { deleteChartAssets } = require("../src/util/chart-assets");
const { createGitHubPluginConfig } = require("./util/helpers");

describe("cleanup", () => {
    beforeEach(async () => {
        await cleanup(createGitHubPluginConfig(), context);
    });

    it("should delete the temporary directory that was created for the helm chart assets", () => {
        expect(deleteTempDir).toHaveBeenCalled();
    });

    it("should delete the chart assets that were copied to the main directory for publishing the GitHub release", () => {
        expect(deleteChartAssets).toHaveBeenCalledWith(context.cwd);
    });
});
