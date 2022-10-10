const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs");
const path = require("path");
const { logStatement, logSuccess, logError } = require("./utils");

const rootIndexTSFile = path.resolve("./index.ts");

const outputInterfacesDirectoryPath = path.resolve("./out/interfaces");

const partialImportStatement = "export * from ";

const tsCompileCommand = "tsc ./index.ts";

let indexTSExprtContent = "";

async function generateIndexFileAndCompileTS() {
  try {
    logStatement("Reading interfaces directory...");
    let files = await fs.promises.readdir(outputInterfacesDirectoryPath);

    for (let i = 0; i < files.length; i++) {
      // check for .ts files.
      let x = /.ts$/;
      if (!x.test(files[i])) return; // if not typescript return.

      // get the file name without extension
      let fileWithoutTSExtention = files[i].replace(".ts", "");

      // prepare the relative path for the re-export.
      let relativeImportPath = `"./out/interfaces/${fileWithoutTSExtention}";`;
      // prepare the full re-export statement.
      let fullImportStatement = partialImportStatement + relativeImportPath;

      // Add it to the index.ts string to be appended later to the file.
      indexTSExprtContent += fullImportStatement + "\n";
    }

    // write the content of re-export string in index.ts.
    logStatement("Generating re-exports in index.ts file...");
    await fs.promises.writeFile(rootIndexTSFile, indexTSExprtContent);
    logSuccess("Successfully generated index.ts file.");

    logStatement("Compiling typescript...");
    const { stdout, stderr } = await exec(tsCompileCommand);
    logSuccess("Successfully Compiled typescript.");
  } catch (err) {
    logError(err);
    return;
  }
}

module.exports = generateIndexFileAndCompileTS;
