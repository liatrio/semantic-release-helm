const { S3Client, HeadBucketCommand, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { STSClient, GetCallerIdentityCommand } = require("@aws-sdk/client-sts");
const getStream = require("get-stream");

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

const s3GetObject = async (region, bucket, key) => {
    const client = getS3Client(region);

    try {
        const response = await client.send(new GetObjectCommand({
            Bucket: bucket,
            Key: key
        }));

        return await getStream(response.Body);
    } catch (error) {
        if (error.$response.body.statusCode === 404) {
            return undefined;
        }

        throw error;
    }
};

const s3PutObject = async (region, bucket, key, body) => {
    const client = getS3Client(region);

    await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body
    }));
}

module.exports = {
    getCallerIdentity,
    s3HeadBucket,
    s3GetObject,
    s3PutObject
};
