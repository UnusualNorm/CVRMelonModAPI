export enum ModStatus {
  Good = 1,
  Broken = 2,
  Retired = 3,
}

export type FileType =
  | "Mod"
  | "Plugin"
  | "ZippedMod"
  | "ZippedPlugin"
  | "Zipped"
  | "UserLib";

export interface DirectConfig {
  type: "direct";
  category: string;
  version: string;
  status: "Good" | "Broken" | "Retired";
  changelog: string;
  description: string;
  homepage: string;
  source: string;
  file: string;
  fileLocation: "local" | "remote";
  fileType: FileType;
}

export interface GithubConfig {
  type: "github";
  description: string;
  category: string;
  author: string;
  username: string;
  repo: string;
  file: string;
  fileType: FileType;
  status: "Good" | "Broken" | "Retired";
  versionOverride?: string;
}

export type Config = DirectConfig | GithubConfig;

// {
//   _id: 33,
//   messageId: 900917256593236029,
//   versionOfMsg: 11,
//   uploadDate: "2020-04-18T18:35:59.673Z",
//   aliases: ["OwO Mod"],
//   category: "Very Niche",
//   versions: [
//     {
//       _version: 11,
//       approvalStatus: 1,
//       reason: "",
//       name: "OwO Mod",
//       modVersion: "6.0.0-Cutie",
//       vrchatVersion: "Universal",
//       loaderVersion: "0.4.3",
//       modType: "Mod",
//       author: "DubyaDude (Help from Hector Panzer, and Herp Derpinstine)",
//       description:
//         "It OwOifies text!\nCurrently does: Text, TextMesh and TextMeshPro.\n\nPlease Downvote tyty",
//       searchTags: ["owo", "uwu", "weeb", "anime", "dubya"],
//       requirements: ["None"],
//       downloadLink: "https://api.vrcmg.com/v1/mods/download/33",
//       sourceLink: "https://github.com/DubyaDude/OwO-Mod",
//       changelog:
//         "This release is an overall rewrite.\n\n- Fixed an issue in many games that caused instant game crash\n- MelonLogger OwOification Removed\n- Config File Removed\n- Updated Credits",
//       embedColor: "FF0000",
//       hash: "7MhdYskO5pZtg164m2W9/yhULsU163iS9+yCH0qFUII=",
//       updateDate: "2021-10-14T13:27:26.309Z",
//     },
//   ],
//   name: "OwO Mod",
//   fullMessageLink:
//     "https://discord.com/channels/439093693769711616/854948679915012126/900917256593236029",
//   hasPending: false,
// };
export interface Mod {
  _id: number;
  aliases: string[];
  category: string;
  versions: {
    _version: number;
    name: string;
    author: string;
    description: string;
    // Good, Broken, or Retired
    approvalStatus: 1 | 2 | 3;
    modType: FileType;
    fileName: string;
    modVersion: string;
    sourceLink: string;
    downloadLink: string;
    changelog: string;
  }[];
}
