const fs = require("fs");
const { logStatement, logSuccess } = require("./utils");

async function copyFile(srcFileFullPath, destFileFullPath) {
  try {
    logStatement("Copying proto file from ===>", srcFileFullPath);
    await fs.promises.copyFile(srcFileFullPath, destFileFullPath);
    logSuccess("Successfully copied proto file to ===>", destFileFullPath);
  } catch (err) {
    throw err;
  }
}

module.exports = copyFile;
