const fs = require("fs/promises");
const path = require("path");

const { getTempDir } = require("./temp-dir");

let chartAssets;

const getChartAssets = async () => {
    if (!chartAssets) {
        const tempDir = await getTempDir();
        const allFilesInTempDir = await fs.readdir(tempDir);

        chartAssets = allFilesInTempDir.reduce((acc, file) => {
            if (path.extname(file) === ".tgz") {
                return [...acc, file];
            }

            return acc;
        }, []);
    }

    return chartAssets;
};

const deleteChartAssets = (cwd) =>
    chartAssets
        ? Promise.all(
              chartAssets.map(async (asset) => {
                  await fs.rm(path.join(cwd, asset));
              })
          )
        : Promise.resolve();

module.exports = {
    getChartAssets,
    deleteChartAssets,
};
