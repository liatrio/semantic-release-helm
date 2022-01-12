const Chance = require("chance");

global.chance = new Chance();

global.pluginConfig = {
    charts: chance.n(chance.word, chance.d6()),
    githubPagesBranch: chance.word(),
};

global.context = {
    cwd: chance.word()
};
