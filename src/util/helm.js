const { createHash } = require("crypto");
const path = require("path");
const fs = require("fs/promises");
const execa = require("execa");
const YAML = require("yawn-yaml/cjs");

const helmDependencyRepos = [];

const helmVersion = async () => {
    const { stdout: version } = await execa("helm", [
        "version",
        "--template='{{.Version}}'",
    ]);

    return version;
};

const helmLint = (chart) => execa("helm", ["lint", chart]);

// given a chart path, find this chart's dependencies, and add all the owning
// chart repositories via `helm repo add ${repository} ${url}`.
// this is a prerequisite for `helm dependency build`.
const helmRepoAddDependencies = async (chartPath) => {
    const chartYamlFile = path.join(chartPath, "Chart.yaml");
    const chartYaml = await fs.readFile(chartYamlFile);

    const doc = new YAML(chartYaml.toString());

    await Promise.all(doc.json.dependencies.map(async (dependency) => {
        // the name doesn't matter, in fact it's better that this doesn't possibly conflict with existing helm repos
        const name = createHash("sha1").update(JSON.stringify(dependency)).digest("hex");

        await execa("helm", ["repo", "add", name, dependency.repository]);

        helmDependencyRepos.push(name);
    }));
};

const helmRepoRemoveDependencies = () => Promise.all(helmDependencyRepos.map(async (repository) => {
    await execa("helm", ["repo", "remove", repository]);
}));

const helmDependencyBuild = (chart) => execa("helm", ["dependency", "build", chart]);

const helmPackage = (chart, destination) => execa("helm", ["package", chart, "--destination", destination]);

const helmRepoIndex = (dir, url, mergeWith) => {
    const args = [
        "repo",
        "index",
        dir,
        "--url",
        url,
    ];

    if (mergeWith) {
        args.push("--merge", path.join(dir, mergeWith));
    }

    return execa("helm", args);
};

const updateHelmChartVersion = async (chartPath, version) => {
    const chartYamlFile = path.join(chartPath, "Chart.yaml");
    const chartYaml = await fs.readFile(chartYamlFile);

    const doc = new YAML(chartYaml.toString());

    doc.json = {
        ...doc.json,
        version,
        appVersion: version,
    };

    await fs.writeFile(chartYamlFile, doc.yaml);
};

module.exports = {
    helmVersion,
    helmLint,
    helmPackage,
    helmRepoIndex,
    updateHelmChartVersion,
    helmDependencyBuild,
    helmRepoAddDependencies,
    helmRepoRemoveDependencies,
};
