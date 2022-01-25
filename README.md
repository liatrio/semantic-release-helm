# semantic-release-helm

A [semantic-release](https://github.com/semantic-release/semantic-release) plugin for publishing Helm charts using [GitHub Pages][github-pages].

| Step               | Description                                                                                                                                                                                                          |
|--------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `verifyConditions` | Verifies that Helm is installed and all specified charts pass `helm lint`, ensures the `GITHUB_TOKEN` environment variable is set, and verifies that GitHub Pages is enabled and the specified pages branch exists.  |
| `prepare`          | Updates the `version` and `appVersion` within each chart's `chart.yaml`, packages each chart, and updates the chart repository `index.yaml` file.                                                                    |
| `publish`          | Publishes the updated chart repository `index.yaml` file to GitHub Pages.                                                                                                                                            |
| `success`          | Cleans up the temporary directory used within `prepare` and `published` (same as `fail`).                                                                                                                            |
| `fail`             | Cleans up the temporary directory used within `prepare` and `published` (same as `success`).                                                                                                                         |

## Install

```bash
$ npm install @liatrio/semantic-release-helm -D
```

```bash
$ yarn add @liatrio/semantic-release-helm -D
```

## Usage

The plugin can be configured in the [**semantic-release** configuration file](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/configuration.md#configuration):

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
      pagesBranch: gh-pages                     # this is the default value
    charts:
    - charts/my-app                             # assuming your repository has a `charts` folder with a single chart called `my-app`
  - path: '@semantic-release/git'
    assets:                                     # both of these changes should be committed back to the main branch
    - package.json                              # this is modified by the npm plugin, remove this if you aren't using the npm plugin
    - charts/my-app/Chart.yaml                  # this is modified during the `prepare` step of the helm plugin 
  - path: '@semantic-release/github'
    failComment: false
    successComment: false
    assets:
    - path: 'my-app-*.tgz'                      # this tarball is created via `helm package` during the `prepare` step of the helm plugin. this must be uploaded to GitHub as a release asset
      label: Helm Chart
```

The example above covers a basic configuration of a Node.js based application that has its own Helm chart located within
the `charts/my-app` directory. Every commit to the `main` branch will run `npx semantic-release`, which will do the following:
- Compute the next release version via [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).
- Update the `version` field within the `package.json` file to the next release version.
- Update the `version` _and_ `appVersion` fields within the `charts/my-app/Chart.yaml` to the next release version.
- Commit the aforementioned changes and push them to the `main` branch. This commit will also be tagged with the next release version, and that tag will also be pushed.
- Create a GitHub release that contains the Helm chart tarball that was created via `helm package`.
- Update the `index.yaml` file within the GitHub Pages deployment to reference the new chart version.

After all of these steps have completed, you should be able to install the newly published chart after a `helm repo update` and `helm install` :tada:

## Configuration

The GitHub repository this plugin runs against must have [GitHub Pages][github-pages] enabled, and the branch used for GitHub Pages must exist.

The Git user associated with the configured Git credentials has to be able to directly push commits to the GitHub Pages branch.

### Environment variables

| Variable       | Description                                                                            | Required |
|----------------|----------------------------------------------------------------------------------------|----------|
| `GITHUB_TOKEN` | A personal access token used to call the GitHub API during the `verifyConditions` step | yes      |

### Options

| Option               | Description                                                                                      | Default                      |
|----------------------|--------------------------------------------------------------------------------------------------|------------------------------|
| `charts`             | A list of paths to each Helm chart to publish. Paths are relative to the root of the repository. | no default (required option) |
| `github.pagesBranch` | The branch that GitHub Pages is using.                                                           | `gh-pages`                   |


[github-pages]: https://pages.github.com/

