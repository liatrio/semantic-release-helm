const { deleteChartAssets } = require("./util/chart-assets");
const { deleteTempDir } = require("./util/temp-dir");

const cleanup = async (pluginConfig, { cwd }) => {
    await deleteTempDir();

    await deleteChartAssets(cwd);
};

module.exports = {
    cleanup,
};
