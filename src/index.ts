import "dotenv/config";
import fs from "fs";
import path from "path";
import { Server } from "http";
import https from "https";
import express from "express";
import { Octokit } from "@octokit/rest";
import { Config, Mod, ModStatus } from "./types";

const app = express();
const port = process.env.PORT || 80;
const server = new Server(app);
const octokit = new Octokit();
const semver =
  /^((([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)$/;

const mods = new Array<Mod>();
const modConfigPaths = fs.readdirSync(path.join(__dirname, "../mods"));
for (let i = 0; i < modConfigPaths.length; i++) {
  const modConfigPath = modConfigPaths[i];
  const isDir = fs
    .lstatSync(path.join(__dirname, `../mods/${modConfigPath}`))
    .isDirectory();

  if (isDir)
    app.use(
      `/mods/${modConfigPath}`,
      express.static(path.join(__dirname, `../mods/${modConfigPath}`))
    );

  const configData = fs.readFileSync(
    path.join(
      __dirname,
      isDir
        ? `../mods/${modConfigPath}/config.json`
        : `../mods/${modConfigPath}`
    ),
    "utf8"
  );

  const config: Config = JSON.parse(configData);

  const mod: Mod = {
    _id: i,
    category: config.category,
    // TODO: Implement aliases
    aliases: [config.name],
    versions: [],
  };

  switch (config.type) {
    case "direct":
      mod.versions.push({
        _version: 1,
        name: config.name,
        author: config.author,
        modVersion: config.version,
        modType: config.fileType == "mod" ? "Mod" : "Plugin",
        approvalStatus: ModStatus[config.status],
        description: config.description,
        downloadLink:
          config.fileLocation == "local"
            ? `https://CoVRMelonModAPI.herokuapp.com/mods/${modConfigPath}/${config.file}`
            : config.source,
        sourceLink: config.source,
        changelog: config.changelog,
        fileName: config.file,
      });
      mods.push(mod);
      break;

    case "github":
      (async () => {
        const release = (
          await octokit.repos.listReleases({
            owner: config.username,
            repo: config.repo,
            headers: {
              authorization: `token ${process.env.GITHUB_TOKEN}`,
            },
          })
        ).data.find((release) => release.tag_name.match(semver));

        if (!release)
          return console.warn(
            `Incompatible GitHub mod "${modConfigPath}" found in mods...`
          );

        // TODO: Implement multiple version support
        const downloadLink = release.assets.find(
          (file) => file.name === config.file
        ).browser_download_url;

        https.get(downloadLink, (res) =>
          https
            .get(res.headers.location, (res) => {
              let file = "";
              res.on("data", (d) => (file += d));

              res.on("close", () => {
                mod.versions.push({
                  _version: 1,
                  name: config.name,
                  author: config.username,
                  modVersion: release.tag_name,
                  modType: config.fileType === "mod" ? "Mod" : "Plugin",
                  fileName: config.file,
                  description: config.description,
                  downloadLink,
                  sourceLink: `https://github.com/${config.username}/${config.repo}`,
                  changelog: release.body,
                  approvalStatus: ModStatus[config.status],
                });
                mods.push(mod);
              });
            })
            .on("error", console.error)
        );
      })();
      break;
  }
}

app.use(express.static("public"));
app.get("/v1/mods", (req, res) => res.send(mods));

app.listen(port, () => {
  console.log(`Server listening on port #${port}!`);
});
