const Chance = require("chance");
const { when } = require("jest-when");

global.chance = new Chance();
global.when = when;

global.pluginConfig = {
    charts: chance.n(chance.word, chance.d6()),
    githubPagesBranch: chance.word()
};

global.expectedRepoOwner = chance.word();
global.expectedRepoName = chance.word();

global.context = {
    cwd: chance.word(),
    logger: {
        log: jest.fn()
    },
    options: {
        repositoryUrl: `https://github.com/${expectedRepoOwner}/${expectedRepoName}`
    }
};
