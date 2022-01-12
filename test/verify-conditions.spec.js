jest.mock("../src/util/github");
jest.mock("../src/util/helm");

const AggregateError = require("aggregate-error");

const { verifyConditions } = require("../src/verify-conditions");
const { getRepository, getRepositoryBranch } = require("../src/util/github");
const { helmVersion, helmLint } = require("../src/util/helm");

describe("verify conditions", () => {
    let oldProcessEnv;

    beforeAll(() => {
        oldProcessEnv = process.env;
    });

    afterAll(() => {
        process.env = oldProcessEnv;
    });

    beforeEach(async () => {
        process.env.GITHUB_TOKEN = chance.word();

        getRepository.mockResolvedValue({
            data: {
                has_pages: true
            }
        });
        getRepositoryBranch.mockResolvedValue(undefined);
    });

    it("should verify that Helm is installed by checking the version", async () => {
        await verifyConditions(pluginConfig, context);

        expect(helmVersion).toHaveBeenCalled();
    });

    it("should verify that each chart passes `helm lint`", async () => {
        await verifyConditions(pluginConfig, context);

        pluginConfig.charts.forEach((chart) => {
            expect(helmLint).toHaveBeenCalledWith(chart);
        });
    });

    it("should verify that GitHub pages is enabled for the repository", async () => {
        await verifyConditions(pluginConfig, context);

        expect(getRepository).toHaveBeenCalledWith(expectedRepoOwner, expectedRepoName);
    });

    it("should verify that the specified branch exists", async () => {
        await verifyConditions(pluginConfig, context);

        expect(getRepositoryBranch).toHaveBeenCalledWith(expectedRepoOwner, expectedRepoName, pluginConfig.githubPagesBranch);
    });

    describe("when helm is not installed", () => {
        beforeEach(() => {
            helmVersion.mockRejectedValue(new Error("command not found: helm"));
        });

        it("should throw an error", async () => {
            await expect(() => verifyConditions(pluginConfig, context)).rejects.toThrow(AggregateError);
            await expect(() => verifyConditions(pluginConfig, context)).rejects.toThrow("Error verifying Helm version");
        });
    });

    describe("when the `charts` config option is not set", () => {
        beforeEach(() => {
            delete pluginConfig.charts;
        });

        afterEach(() => {
            pluginConfig.charts = chance.n(chance.word, chance.d6());
        });

        it("should throw an error", async () => {
            await expect(() => verifyConditions(pluginConfig, context)).rejects.toThrow(AggregateError);
            await expect(() => verifyConditions(pluginConfig, context)).rejects.toThrow("Expected `charts` option to be set with at least one chart path");
        });
    });
});
