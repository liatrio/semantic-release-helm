const execa = require("execa");
const path = require("path");
const fs = require("fs/promises");
const YAML = require("yawn-yaml/cjs");

const helmVersion = async () => {
    const { stdout: version } = await execa("helm", [
        "version",
        "--template='{{.Version}}'"
    ]);

    return version;
};

const helmLint = (chart) => execa("helm", ["lint", chart]);

const helmDependencyBuild = (chart) => execa("helm", ["dependency", "build", chart]);

const helmPackage = (chart, destination) => execa("helm", ["package", chart, "--destination", destination]);

const helmRepoIndex = (dir, url, mergeWith) => {
    const args = [
        "repo",
        "index",
        dir,
        "--url",
        url
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
        appVersion: version
    };

    await fs.writeFile(chartYamlFile, doc.yaml);
};

module.exports = {
    helmVersion,
    helmLint,
    helmPackage,
    helmRepoIndex,
    updateHelmChartVersion,
    helmDependencyBuild
};
