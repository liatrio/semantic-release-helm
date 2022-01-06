const { verifyConditions } = require("./src/verify-conditions");
const { prepare } = require("./src/prepare");
const { cleanup } = require("./src/cleanup");
const { publish } = require("./src/publish");

module.exports = {
    verifyConditions,
    prepare,
    publish,
    success: cleanup,
    fail: cleanup,
};
