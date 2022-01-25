jest.mock("gh-pages");
jest.mock("../src/util/temp-dir");

const ghpages = require("gh-pages");
const { publish } = require("../src/publish");
const { getTempDir } = require("../src/util/temp-dir");
const { createGitHubPluginConfig } = require("./util/helpers");

describe("publish", () => {
    let expectedPluginConfig,
        expectedTempDir;

    beforeEach(async () => {
        expectedPluginConfig = createGitHubPluginConfig();
        expectedTempDir = chance.word();

        getTempDir.mockResolvedValue(expectedTempDir);
        ghpages.publish.mockImplementation((dir, args, cb) => {
            cb();
        });

        await publish(expectedPluginConfig);
    });

    it("should fetch the temporary directory that was created for the helm chart assets", () => {
        expect(getTempDir).toHaveBeenCalled();
    });

    it("should delete the chart assets that were copied to the main directory for publishing the GitHub release", () => {
        expect(ghpages.publish).toHaveBeenCalledWith(expectedTempDir, {
            branch: expectedPluginConfig.github.pagesBranch,
            src: "index.yaml",
        }, expect.any(Function));
    });
});
