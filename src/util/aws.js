const { S3Client, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");

let stsClient,
    s3Client;

const getSTSClient = (region) => {
    if (!stsClient) {
        stsClient = new STSClient({
            region
        });
    }

    return stsClient;
};

const getS3Client = (region) => {
    if (!s3Client) {
        s3Client = new S3Client({
            region
        });
    }

    return s3Client;
};

const getCallerIdentity = async (region) => {
    const client = getSTSClient(region);
    const { Arn: arn } = await client.send(new GetCallerIdentityCommand());

    return arn;
};

const s3HeadBucket = async (region, bucket) => {
    const client = getS3Client(region);

    try {
        await client.send(new HeadBucketCommand({
            Bucket: bucket
        }));
    } catch (error) {
        throw new Error(`${error.$response.body.statusCode} ${error.$response.body.statusMessage}`);
    }
};

module.exports = {
    getCallerIdentity,
    s3HeadBucket
};
