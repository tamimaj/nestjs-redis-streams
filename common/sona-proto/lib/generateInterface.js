const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require("path");
const { isWindows, logError, logStatement, logSuccess } = require("./utils");

let pluginPath = isWindows
  ? path.resolve("./node_modules/.bin/protoc-gen-ts_proto.cmd")
  : path.resolve("./node_modules/.bin/protoc-gen-ts_proto");

let protocStr = "protoc ";

let pluginStr = `--plugin=protoc-gen-ts_proto=${pluginPath} `;

let outStr = "--ts_proto_out=./out/interfaces/ ";

let getInputStr = (protoFileNameWithExtension) =>
  `-I=./input/ ./input/${protoFileNameWithExtension} `;

// Essential option is "--ts_proto_opt=exportCommonSymbols=false" to disable exporting
// a constant called protoBufPackage, that has no usage with NestJS, and make re-export conflicts
// from index.ts file.

let optionsStr =
  "--ts_proto_opt=nestJs=true --ts_proto_opt=fileSuffix=.interface --ts_proto_opt=useOptionals=all --ts_proto_opt=exportCommonSymbols=false";

// Generate interface for a single proto file.
async function generateInterface(protoFileNameWithExtension) {
  try {
    logStatement("Generating interface for:", protoFileNameWithExtension);
    let command =
      protocStr +
      pluginStr +
      outStr +
      getInputStr(protoFileNameWithExtension) +
      optionsStr;

    const { stdout, stderr } = await exec(command);

    logSuccess(
      "Successfully generated interface for:",
      protoFileNameWithExtension
    );
  } catch (e) {
    logError(e); // should contain code (exit code) and signal (that caused the termination).
  }
}

module.exports = generateInterface;
