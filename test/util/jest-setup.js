const Chance = require("chance");
const { when } = require("jest-when");
const matchers = require("jest-extended");

expect.extend(matchers);

global.chance = new Chance();
global.when = when;

global.expectedRepoOwner = chance.word();
global.expectedRepoName = chance.word();

global.context = {
    cwd: chance.word(),
    logger: {
        log: jest.fn()
    },
    nextRelease: {
        version: chance.word(),
        gitTag: chance.word()
    },
    options: {
        repositoryUrl: `https://github.com/${expectedRepoOwner}/${expectedRepoName}`
    }
};
