const firebaseService = require("../service/firebase.service");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const fs = require("fs");
const appRoot = require("app-root-path");
const path = require("path");
const { createReadStream, createWriteStream } = require("fs");
const { createGzip } = require("zlib");

const compressFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const stream = createReadStream(filePath);
      stream
        .pipe(createGzip())
        .pipe(createWriteStream(`${filePath}.gz`))
        .on("finish", () => {
          // console.log(`Successfully compressed the file at ${filePath}`);
          resolve(true);
        });
    } catch (error) {
      reject(error);
    }
  });
};

class DeployController {
  async getAllProject(req, res) {
    try {
      const accessToken =
        req.headers["x-access-token"] || req.headers["authorization"];

      if (!accessToken) return res.status(400).send("required token");
      const projects = await firebaseService.getAllProject(
        accessToken.replace(`Bearer `, "")
      );
      if (!projects) return res.status(400).send("tokent is expired");
      res.status(200).send({ data: projects });
    } catch (error) {
      res.status(500).send(error.message);
    }
  }

  async deploy(req, res) {
    try {
      const { accessToken, projectName } = req.body;
      let siteId = uuidv4();
      if (req.files.length == 0)
        return res.status(400).send("file is required");
      let bodyFile = { files: null };
      let fileHashMap = await Promise.all(
        req.files.map(async (fileHash) => {
          console.log(fileHash);
          await compressFile(
            path.join(appRoot.path, "/uploads", `/${fileHash.originalname}`)
          );
          const fileBuffer = fs.readFileSync(
            path.join(appRoot.path, "/uploads", `/${fileHash.originalname}.gz`)
          );
          const hashSum = crypto.createHash("sha256");
          hashSum.update(fileBuffer);
          const hex = hashSum.digest("hex");
          bodyFile.files = {
            ...bodyFile.files,
            [`/${fileHash.originalname}`]: hex,
          };
          let obj = { filename: fileHash.originalname, hash: hex };
          return obj;
        })
      );

      // await compressFile(
      //   path.join(appRoot.path, "/uploads", `/${req.file.originalname}`)
      // );
      // const fileBuffer = fs.readFileSync(
      //   path.join(appRoot.path, "/uploads", `/${req.file.originalname}.gz`)
      // );
      // const hashSum = crypto.createHash("sha256");
      // hashSum.update(fileBuffer);
      // const hex = hashSum.digest("hex");
      // console.log(hex);

      const createSite = await firebaseService.createSite(
        accessToken,
        projectName,
        siteId
      );

      const createVersion = await firebaseService.createVersion(
        accessToken,
        siteId
      );

      // const body = {
      //   files: {
      //     "/index.html": hex,
      //   },
      // };
      console.log(createVersion);
      const populateFiles = await firebaseService.populateFile(
        accessToken,
        createVersion.name, //createVersion.name
        bodyFile
      );
      const fileHash = populateFiles.uploadRequiredHashes; //populateFiles.uploadRequiredHashes   []
      const url = populateFiles.uploadUrl; //populateFiles.uploadUrl
      await Promise.all(
        fileHash.map(async (upl) => {
          let fileExisted = fileHashMap.find((check) => check.hash == upl);
          const readStream = fs.createReadStream(
            path.join(appRoot.path, "/uploads", `/${fileExisted.filename}.gz`)
          );
          await firebaseService.uploadFiles(
            accessToken,
            url,
            fileExisted.hash,
            readStream
          );
        })
      );

      // console.log(uploadFiles);
      const siteStatusUpdate = await firebaseService.siteStatusUpdate(
        accessToken,
        createVersion.name // createVersion.name
      );

      const releasedVersion = await firebaseService.releasedVersion(
        accessToken,
        siteId, //siteId
        siteStatusUpdate.name //siteStatusUpdate.name
      );

      res.status(201).send(createSite);
    } catch (error) {
      res.status(500).send(error.message);
    }
  }
}

module.exports = new DeployController();
