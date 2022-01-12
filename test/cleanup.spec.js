jest.dontMock("../src/cleanup");

const { cleanup } = require("../src/cleanup");
const tempDir = require("../src/util/temp-dir");
const chartAssets = require("../src/util/chart-assets");

describe("cleanup", () => {
    beforeEach(async () => {
        await cleanup(pluginConfig, context);
    });

    it("should delete the temporary directory that was created for the helm chart assets", () => {
        expect(tempDir.deleteTempDir).toHaveBeenCalled();
    });

    it("should delete the chart assets that were copied to the main directory for publishing the GitHub release", () => {
        expect(chartAssets.deleteChartAssets).toHaveBeenCalledWith(context.cwd);
    });
});
