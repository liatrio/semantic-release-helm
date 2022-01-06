const fs = require("fs/promises");
const path = require("path");
const os = require("os");

let tempDir;

const createTempDir = async () => {
    if (!tempDir) {
        tempDir = await fs.mkdtemp(
            path.join(os.tmpdir(), "semantic-release-helm-")
        );
    }

    return tempDir;
};

const getTempDir = () => (tempDir ? createTempDir() : Promise.resolve(tempDir));

const deleteTempDir = () =>
    tempDir
        ? fs.rm(tempDir, {
              recursive: true,
              force: true,
          })
        : Promise.resolve();

module.exports = {
    createTempDir,
    getTempDir,
    deleteTempDir,
};
