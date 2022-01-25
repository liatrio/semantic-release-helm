const { STSClient, GetCaller, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");

let stsClient;

const getSTSClient = (region) => {
    if (!stsClient) {
        stsClient = new STSClient({
            region
        });
    }

    return stsClient;
};

const getCallerIdentity = async (region) => {
    const client = getSTSClient(region);
    const { Arn: arn } = await client.send(new GetCallerIdentityCommand());

    return arn;
};

module.exports = {
    getCallerIdentity
};
