const Os = require("os");
const fs = require("fs");
const path = require("path");
const figlet = require("figlet");
const chalk = require("chalk");

const outputDirectory = path.resolve("./out");
const protoOutputPath = path.resolve("./out/proto");
const interfacesOutputPath = path.resolve("./out/interfaces");

function isWindows() {
  console.log(Os.userInfo().username);
  return Os.platform() === "win32";
}

function logError(...input) {
  const clr = chalk.bold.bgRed;
  return console.log(clr(...input));
}

function logSuccess(...input) {
  const clr = chalk.bold.greenBright;
  return console.log(clr(...input));
}

function logStatement(...input) {
  const clr = chalk.blueBright;
  return console.log(clr(...input));
}

function showBanner() {
  figlet("SONA PROTO", function (err, data) {
    if (err) {
      logError("Something went wrong with Figlet...");
      logStatement(err);
      return;
    }
    console.log(chalk.bold.white(data));
  });
}

async function clearOutputFolders() {
  // delete the out folder and all its content.
  await fs.promises.rm(outputDirectory, { recursive: true, force: true });

  // create folders recrusivly.
  await fs.promises.mkdir(protoOutputPath, { recursive: true });

  await fs.promises.mkdir(interfacesOutputPath, { recursive: true });
}

module.exports = {
  isWindows,
  clearOutputFolders,
  showBanner,
  logError,
  logSuccess,
  logStatement,
};
