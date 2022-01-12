const execa = require("execa");
const path = require("path");

const helmVersion = async () => {
    const { stdout: version } = await execa("helm", [
        "version",
        "--template='{{.Version}}'"
    ]);

    return version;
};

const helmLint = (chart) => execa("helm", ["lint", chart]);

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

module.exports = {
    helmVersion,
    helmLint,
    helmPackage,
    helmRepoIndex
};
