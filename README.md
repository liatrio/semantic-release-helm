# semantic-release-helm

A [semantic-release](https://github.com/semantic-release/semantic-release) plugin for publishing Helm charts
using [GitHub Pages][github-pages] or [Amazon S3](https://aws.amazon.com/s3/).

| Step               | Description                                                                                                                                                                      |
|--------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `verifyConditions` | Verifies that Helm is installed and all specified charts pass `helm lint`. Additional checks are performed depending on whether you are publishing to GitHub Pages or Amazon S3. |
| `prepare`          | Updates the `version` and `appVersion` within each chart's `chart.yaml`, packages each chart, and updates the chart repository `index.yaml` file.                                |
| `publish`          | Publishes the updated chart repository `index.yaml` file to GitHub Pages / Amazon S3. When using S3, this step also uploads each chart tarball to the S3 Bucket.                 |
| `success`          | Cleans up the temporary directory used within `prepare` and `published` (same as `fail`).                                                                                        |
| `fail`             | Cleans up the temporary directory used within `prepare` and `published` (same as `success`).                                                                                     |

## Install

```bash
$ npm install @liatrio/semantic-release-helm -D
```

```bash
$ yarn add @liatrio/semantic-release-helm -D
```

## Usage

The plugin can be configured in the
[**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

The examples below will cover a basic configuration of a Node.js based application that has its own Helm chart located within
the `charts/my-app` directory. Every commit to the `main` branch will run `npx semantic-release`.

### Example (GitHub Pages)

```yaml
branches:
  - main
preset: conventionalcommits
plugins:
  - '@semantic-release/commit-analyzer'
  - '@semantic-release/release-notes-generator'
  - '@semantic-release/npm'                     # in the case of a Node.js app, automatically update the `version` field within `package.json`
  - path: '@liatrio/semantic-release-helm'
    github:
      pagesBranch: gh-pages
    charts:
      - charts/my-app                           # assuming your repository has a `charts` folder with a single chart called `my-app`
  - path: '@semantic-release/git'
    assets:                                     # both of these changes should be committed back to the main branch
      - package.json                            # this is modified by the npm plugin, remove this if you aren't using the npm plugin
      - charts/my-app/Chart.yaml                # this is modified during the `prepare` step of the helm plugin 
  - path: '@semantic-release/github'
    failComment: false
    successComment: false
    assets:
      - path: 'my-app-*.tgz'                    # this tarball is created via `helm package` during the `prepare` step of the helm plugin. this must be uploaded to GitHub as a release asset
        label: Helm Chart
```

This configuration will perform the following steps:

- Compute the next release version via [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).
- Update the `version` field within the `package.json` file to the next release version.
- Update the `version` _and_ `appVersion` fields within the `charts/my-app/Chart.yaml` to the next release version.
- Commit the aforementioned changes and push them to the `main` branch. This commit will also be tagged with the next
  release version, and that tag will also be pushed.
- Create a GitHub release that contains the Helm chart tarball that was created via `helm package`.
- Update the `index.yaml` file within the GitHub Pages deployment to reference the new chart version.

### Example (Amazon S3)

```yaml
branches:
  - main
preset: conventionalcommits
plugins:
  - '@semantic-release/commit-analyzer'
  - '@semantic-release/release-notes-generator'
  - '@semantic-release/npm'                                       # in the case of a Node.js app, automatically update the `version` field within `package.json`
  - path: '@liatrio/semantic-release-helm'
    aws:
      region: us-east-1
      bucket: my-s3-bucket
      bucketUrl: https://my-s3-bucket.s3.us-east-1.amazonaws.com  # if your s3 bucket is sitting behind AWS CloudFront, this can be updated to use that URL instead
    charts:
      - charts/my-app                                             # assuming your repository has a `charts` folder with a single chart called `my-app`
  - path: '@semantic-release/git'
    assets:                                                       # both of these changes should be committed back to the main branch
      - package.json                                              # this is modified by the npm plugin, remove this if you aren't using the npm plugin
      - charts/my-app/Chart.yaml                                  # this is modified during the `prepare` step of the helm plugin 
  - path: '@semantic-release/github'
    failComment: false
    successComment: false
```

This configuration will perform the following steps:

- Compute the next release version via [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).
- Update the `version` field within the `package.json` file to the next release version.
- Update the `version` _and_ `appVersion` fields within the `charts/my-app/Chart.yaml` to the next release version.
- Commit the aforementioned changes and push them to the `main` branch. This commit will also be tagged with the next
  release version, and that tag will also be pushed.
- Create a GitHub release using the [semantic-release-github](https://github.com/semantic-release/github) plugin.
- Update the `index.yaml` file within the Amazon S3 bucket to reference the new chart version.
- Upload the chart tarball that was created during `prepare` via `helm package` to S3.

## Configuration

When using GitHub Pages, The GitHub repository this plugin runs against must have [GitHub Pages][github-pages] enabled, and the branch used for
GitHub Pages must exist. Also, the Git user associated with the configured Git credentials has to be able to directly push commits to the GitHub Pages
branch.

When using Amazon S3, the environment that runs `semantic-release` must be configured with valid AWS Authentication. For example,
if you are running `semantic-release` within GitHub Actions, you might use the [`configure-aws-credentials`](https://github.com/aws-actions/configure-aws-credentials)
action. Also, the S3 bucket defined in the `aws.bucket` configuration option must exist, and the user/role associated with
the AWS credentials must have access to it.

### Environment variables

| Variable       | Description                                                                            | Required |
|----------------|----------------------------------------------------------------------------------------|----------|
| `GITHUB_TOKEN` | A personal access token used to call the GitHub API during the `verifyConditions` step | yes      |

### Options

Either `github` or `aws` configuration options must be specified. 

| Option               | Description                                                                                                                                                                                                            |
|----------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `charts`             | A list of paths to each Helm chart to publish. Paths are relative to the root of the repository.                                                                                                                       |
| `github.pagesBranch` | The branch that GitHub Pages is using.                                                                                                                                                                                 |
| `aws.region`         | The AWS region to use.                                                                                                                                                                                                 |
| `aws.bucket`         | The name of the S3 bucket to use.                                                                                                                                                                                      |
| `aws.bucketUrl`      | The URL of the bucket. This can follow the format of `https://${bucketName}.s3.${region}.amazonaws.com`. Alternatively, you can use a service like AWS CloudFront to expose the bucket, and put that URL here instead. |

[github-pages]: https://pages.github.com/

