const execa = require("execa");
const path = require("path");
const fs = require("fs/promises");
const YAML = require("yawn-yaml/cjs");

const extract_fs = require("fs");
const extract_YAML = require('yaml');

const helmVersion = async () => {
    const { stdout: version } = await execa("helm", [
        "version",
        "--template='{{.Version}}'"
    ]);

    return version;
};

const helmLint = (chart) => execa("helm", ["lint", chart]);

const helmRepoAdd = (repo, name) => execa("helm", ["repo", "add", name, repo]);

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

const extractChartUrl = async (chartPath) => {
    //extract dependency chart URL
    const chartYamlFile = path.join(chartPath, "Chart.yaml");
    const file = await extract_fs.readFileSync(chartYamlFile, 'utf8');
    const result = extract_YAML.parse(file);

    return result.dependencies[0].repository;
}

const extractChartName = async (chartPath) => {
    //extract dependency chart URL
    const chartYamlFile = path.join(chartPath, "Chart.yaml");
    const file = await extract_fs.readFileSync(chartYamlFile, 'utf8');
    const result = extract_YAML.parse(file);

    return result.name;
}

module.exports = {
    helmVersion,
    helmLint,
    helmPackage,
    helmRepoIndex,
    updateHelmChartVersion,
    helmDependencyBuild,
    helmRepoAdd,
    extractChartUrl,
    extractChartName
};
