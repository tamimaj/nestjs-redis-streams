const fs = require("fs");
const path = require("path");
const copyFile = require("./copyFile");
const generateIndexFileAndCompileTS = require("./compile");
const generateInterface = require("./generateInterface");
const {
  clearOutputFolders,
  showBanner,
  logError,
  logStatement,
} = require("./utils");

const inputDirectory = path.resolve("./input");

const outputDirectory = path.resolve("./out");

async function compile() {
  try {
    showBanner();

    await clearOutputFolders();

    logStatement("Reading input directory...");
    let files = await fs.promises.readdir(inputDirectory);

    // for each proto file, copy it to out/proto and generate an interface for it.
    logStatement("Start copying proto files from input directory...");

    for (let i = 0; i < files.length; i++) {
      // 1- copy the proto file
      await copyFile(
        path.resolve(inputDirectory, files[i]),
        path.resolve(outputDirectory, "proto", files[i])
      );

      // 2- generate the interface for for the proto.
      await generateInterface(files[i]);
    }

    await generateIndexFileAndCompileTS();
  } catch (error) {
    logError("ERROR at lib/index.js: ", error);
  }
}

compile();
