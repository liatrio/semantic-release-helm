jest.mock("../src/util/github");
jest.mock("../src/util/helm");

const AggregateError = require("aggregate-error");

const { verifyConditions } = require("../src/verify-conditions");
const { getRepository, getRepositoryBranch } = require("../src/util/github");
const { helmVersion, helmLint } = require("../src/util/helm");
const { createGitHubPluginConfig, createAWSPluginConfig } = require("./util/helpers");

describe("verify conditions", () => {
    let oldProcessEnv,
        expectedPluginConfig;

    beforeAll(() => {
        oldProcessEnv = process.env;
    });

    afterAll(() => {
        process.env = oldProcessEnv;
    });

    beforeEach(() => {
        process.env.GITHUB_TOKEN = chance.word();

        getRepository.mockResolvedValue({
            data: {
                has_pages: true
            }
        });
        getRepositoryBranch.mockResolvedValue(undefined);
    });

    describe("aws checks", () => {
        let expectedBucketName;

        beforeEach(() => {
            expectedBucketName = chance.word();
            expectedPluginConfig = createAWSPluginConfig(expectedBucketName);
        });
    });

    describe("github checks", () => {
        beforeEach(() => {
            expectedPluginConfig = createGitHubPluginConfig();
        });

        it("should verify that GitHub pages is enabled for the repository", async () => {
            await verifyConditions(expectedPluginConfig, context);

            expect(getRepository).toHaveBeenCalledWith(expectedRepoOwner, expectedRepoName);
        });

        it("should verify that the specified branch exists", async () => {
            await verifyConditions(expectedPluginConfig, context);

            expect(getRepositoryBranch).toHaveBeenCalledWith(expectedRepoOwner, expectedRepoName, expectedPluginConfig.github.pagesBranch);
        });

        describe("when GitHub Pages is not enabled for the repository", () => {
            beforeEach(() => {
                getRepository.mockResolvedValue({
                    data: {
                        has_pages: false
                    }
                });
            });

            it("should throw an error", async () => {
                await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow(AggregateError);
                await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow("GitHub Pages is not enabled for repository");
            });
        });

        describe("when an error occurs while checking repository for GitHub Pages", () => {
            beforeEach(() => {
                getRepository.mockRejectedValue("Error fetching repository");
            });

            it("should throw an error", async () => {
                await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow(AggregateError);
                await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow("Error fetching GitHub repository");
            });
        });

        describe("when the specified GitHub Pages does not exist", () => {
            beforeEach(() => {
                getRepositoryBranch.mockRejectedValue("Error fetching repository branch");
            });

            it("should throw an error", async () => {
                await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow(AggregateError);
                await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow(`Error fetching branch "${expectedPluginConfig.github.pagesBranch}" for GitHub Pages`);
            });
        });
    });

    describe("helm checks", () => {
        beforeEach(() => {
            // we need to have a valid plugin config in order to reach the helm checks
            expectedPluginConfig = createGitHubPluginConfig();
        });

        it("should verify that Helm is installed by checking the version", async () => {
            await verifyConditions(expectedPluginConfig, context);

            expect(helmVersion).toHaveBeenCalled();
        });

        it("should verify that each chart passes `helm lint`", async () => {
            await verifyConditions(expectedPluginConfig, context);

            expectedPluginConfig.charts.forEach((chart) => {
                expect(helmLint).toHaveBeenCalledWith(chart);
            });
        });

        describe("when helm is not installed", () => {
            beforeEach(() => {
                helmVersion.mockRejectedValue(new Error("command not found: helm"));
            });

            it("should throw an error", async () => {
                await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow(AggregateError);
                await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow("Error verifying Helm version");
            });
        });

        describe("when one of the specified charts does not pass helm lint", () => {
            let randomChart;

            beforeEach(() => {
                randomChart = chance.pickone(expectedPluginConfig.charts);

                when(helmLint).calledWith(randomChart).mockRejectedValue(new Error("Error: 1 chart(s) linted, 1 chart(s) failed"));
            });

            it("should throw an error", async () => {
                await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow(AggregateError);
                await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow(`Chart ${randomChart} failed validation`);
            });
        });
    });

    describe("when the `charts` config option is not set", () => {
        beforeEach(() => {
            expectedPluginConfig = createGitHubPluginConfig();
            delete expectedPluginConfig.charts;
        });

        it("should throw an error", async () => {
            await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow(AggregateError);
            await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow("Expected `charts` option to be set with at least one chart path");
        });
    });

    describe("when the GITHUB_TOKEN env variable is not set", () => {
        beforeEach(() => {
            delete process.env.GITHUB_TOKEN;
        });

        it("should throw an error", async () => {
            await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow(AggregateError);
            await expect(() => verifyConditions(expectedPluginConfig, context)).rejects.toThrow("GITHUB_TOKEN environment variable must be set");
        });
    });
});
