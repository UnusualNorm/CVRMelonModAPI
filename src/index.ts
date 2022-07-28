import "dotenv/config";
import fs from "fs";
import path from "path";
import edge from "edge-js";
import { Server } from "http";
import express from "express";
import { Octokit } from "@octokit/rest";
import { Config, Mod, ModStatus } from "./types";
import { http, https } from "follow-redirects";

const app = express();
const port = process.env.PORT || 80;
const server = new Server(app);
const octokit = new Octokit();
const semver =
  /^((([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)$/;

const ExtractModVersions = (dllPath: string) => {
  return new Promise<{
    Item1: string;
    Item2: string;
    Item3: string;
  }>((resolve, reject) =>
    edge.func({
      assemblyFile: path.join(
        __dirname,
        "../",
        "VersionExtractor",
        "VersionExtractor.dll"
      ),
      typeName: "VersionExtractor.VersionExtractor",
      methodName: "ExtractModVersions",
    })(dllPath, (err, result: string) => {
      if (err) reject(err);
      else resolve(JSON.parse(result));
    })
  );
};

const cacheDll = (URL: string, name: string) => {
  return new Promise<string>((resolve, reject) => {
    if (URL.startsWith("https://")) {
      const file = fs.createWriteStream(
        path.join(__dirname, "../", "cache", name)
      );

      https.get(URL, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(path.join(__dirname, "../", "cache", name));
        });
      });
    } else if (URL.startsWith("http://")) {
      const file = fs.createWriteStream(
        path.join(__dirname, "../", "cache", name)
      );

      http.get(URL, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(path.join(__dirname, "../", "cache", name));
        });
      });
    } else reject("Invalid URL");
  });
};

if (!fs.existsSync(path.join(__dirname, "../", "cache")))
  fs.mkdirSync(path.join(__dirname, "../", "cache"));

const mods = new Array<Mod>();
const modConfigPaths = fs.readdirSync(path.join(__dirname, "../", "mods"));
(async () => {
  for (let i = 0; i < modConfigPaths.length; i++) {
    try {
      const modConfigPath = modConfigPaths[i];
      const config: Config = await require(path.join(
        __dirname,
        "../",
        "mods",
        modConfigPath
      ));

      const mod: Mod = {
        _id: i,
        category: config.category,
        // TODO: Implement aliases
        aliases: [],
        versions: [],
      };

      switch (config.type) {
        case "direct": {
          let filePath = config.source;
          if (config.fileLocation == "remote")
            filePath = await cacheDll(filePath, config.file);

          const { Item1, Item2, Item3 } = await ExtractModVersions(filePath);

          mod.versions.push({
            _version: 1,
            name: Item1,
            author: Item3,
            modVersion: Item2,
            modType: config.fileType,
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
        }

        case "github": {
          const release = (
            await octokit.repos.listReleases({
              owner: config.username,
              repo: config.repo,
              headers: {
                authorization: `token ${process.env.GITHUB_TOKEN}`,
              },
            })
          ).data[0];

          // TODO: Implement multiple version support
          const downloadLink = release.assets.find(
            (file) => file.name === config.file
          ).browser_download_url;

          const file = await cacheDll(downloadLink, config.file);
          const versions = await ExtractModVersions(file);

          mod.versions.push({
            _version: 1,
            name: versions.Item1,
            author: versions.Item3,
            modVersion: versions.Item2,
            modType: config.fileType,
            fileName: config.file,
            description: config.description,
            downloadLink,
            sourceLink: `https://github.com/${config.username}/${config.repo}`,
            changelog: release.body,
            approvalStatus: ModStatus[config.status],
          });
          mods.push(mod);
          break;
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
})();

app.use(express.static("public"));
app.get("/v1/mods", (req, res) => res.send(mods));

app.listen(port, () => {
  console.log(`Server listening on port #${port}!`);
});
