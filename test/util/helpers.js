const createGitHubPluginConfig = () => ({
    charts: chance.n(chance.word, chance.d6()),
    github: {
        pagesBranch: chance.word()
    }
});

const createAWSPluginConfig = (bucket = chance.word()) => ({
    charts: chance.n(chance.word, chance.d6()),
    aws: {
        region: chance.pickone(["us-east-1", "us-west-1", "us-east-2"]),
        bucket: `s3://${bucket}`
    },
});

module.exports = {
    createGitHubPluginConfig,
    createAWSPluginConfig
};
