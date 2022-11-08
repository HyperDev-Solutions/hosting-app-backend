const firebaseService = require("../service/firebase.service");
const googleService = require("../service/google.service");
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

const removeBulkFiles = (arrayOffiles) => {
  if (arrayOffiles.length == 0) return;
  arrayOffiles.forEach((fileHash) => {
    if (
      fs.existsSync(
        path.join(appRoot.path, "/uploads", `/${fileHash.filename}`)
      )
    )
      fs.unlinkSync(
        path.join(appRoot.path, "/uploads", `/${fileHash.filename}`)
      );
    if (
      fs.existsSync(
        path.join(appRoot.path, "/uploads", `/${fileHash.filename}.gz`)
      )
    )
      fs.unlinkSync(
        path.join(appRoot.path, "/uploads", `/${fileHash.filename}.gz`)
      );
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
      if (projects.length == 0)
        return res.status(400).send({ msg: "no data found" });
      res.status(200).send({ data: projects });
    } catch (error) {
      res.status(error.status | 500).send({ msg: error.message });
    }
  }

  async authCallback(req, res) {
    try {
      res.status(200).send(req.query);
    } catch (error) {
      res.status(error.status | 500).send({ msg: error.message });
    }
  }

  async googleToken(req, res) {
    try {
      const code = req.query.code;
      if (!code) return res.status(400).send("code is required");

      const authUrl = await googleService.getTokens(code);
      res.status(200).send(authUrl);
    } catch (error) {
      res.status(error.status | 500).send({ msg: error.message });
    }
  }

  async authGoogleUrl(req, res) {
    try {
      const authUrl = googleService.googleAuthUrl();
      res.status(200).send(authUrl);
    } catch (error) {
      res.status(error.status | 500).send({ msg: error.message });
    }
  }

  async deploy(req, res) {
    let fileHashMap;
    try {
      const { accessToken, projectName } = req.body;
      let siteId = uuidv4();
      if (!req.files && req.files && req.files.length == 0)
        return res.status(400).send("file is required");
      if (!req.body.accessToken)
        return res.status(400).send("accessToken is required");
      if (!req.body.projectName)
        return res.status(400).send("projectName is required");
      let bodyFile = { files: null };
      fileHashMap = await Promise.all(
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

      const createSite = await firebaseService.createSite(
        accessToken,
        projectName,
        siteId
      );

      const createVersion = await firebaseService.createVersion(
        accessToken,
        siteId
      );

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
      removeBulkFiles(fileHashMap);
      res.status(201).send(createSite);
    } catch (error) {
      removeBulkFiles(fileHashMap);
      console.log(error);
      res.status(error.status | 500).send({ msg: error.message });
    }
  }
}

module.exports = new DeployController();
