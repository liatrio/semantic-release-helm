const { deleteChartAssets } = require("./util/chart-assets");
const { deleteTempDir } = require("./util/temp-dir");
const { helmRepoRemoveDependencies } = require("./util/helm");

const cleanup = async (pluginConfig, { cwd }) => {
    await deleteTempDir();
    await deleteChartAssets(cwd);
    await helmRepoRemoveDependencies();
};

module.exports = {
    cleanup,
};
