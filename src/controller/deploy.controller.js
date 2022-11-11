const firebaseService = require("../service/firebase.service");
const googleService = require("../service/google.service");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const fs = require("fs");
const appRoot = require("app-root-path");
const path = require("path");
const { createReadStream, createWriteStream } = require("fs");
const { createGzip } = require("zlib");
const deployModel = require("../model/deploy.model");
const jszip = require("jszip");

const compressFile = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const stream = createReadStream(filePath);
      stream
        .pipe(createGzip())
        .pipe(createWriteStream(`${filePath}.gz`))
        .on("finish", () => {
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

const pathCreateMethod = (str) => {
  str = str.split("/");
  str.pop();
  return str.join("/");
};

class DeployController {
  async getAllProject(req, res) {
    try {
      const accessToken =
        req.headers["x-access-token"] || req.headers["authorization"];

      if (!accessToken) return res.status(400).send({ msg: "required token" });
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

  async getUserProfile(req, res) {
    try {
      const accessToken =
        req.headers["x-access-token"] || req.headers["authorization"];

      if (!accessToken) return res.status(400).send("required token");
      const authUrl = await googleService.getUserProfile(
        accessToken.replace(`Bearer `, "")
      );
      res.status(200).send(authUrl);
    } catch (error) {
      res.status(error.status | 500).send({ msg: error.message });
    }
  }

  async deploy(req, res) {
    let fileHashMap;
    const newDir = req.newDir;
    try {
      const { accessToken, projectName, siteName } = req.body;
      let siteId = siteName || uuidv4();
      if (!req.files || (req.files && req.files.length == 0))
        return res.status(400).send({ message: "files is required" });

      let bodyFile = { files: null };
      fileHashMap = await Promise.all(
        req.files.map(async (fileHash) => {
          await compressFile(
            path.join(
              appRoot.path,
              "/uploads",
              `/${newDir}`,
              `/${fileHash.originalname}`
            )
          );
          const fileBuffer = fs.readFileSync(
            path.join(
              appRoot.path,
              "/uploads",
              `/${newDir}`,
              `/${fileHash.originalname}.gz`
            )
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
      console.log("gzip and hash complete");
      const createSite = await firebaseService.createSite(
        accessToken,
        projectName,
        siteId
      );
      console.log("createSite");
      const createVersion = await firebaseService.createVersion(
        accessToken,
        siteId
      );
      console.log("createVersion");
      const populateFiles = await firebaseService.populateFile(
        accessToken,
        createVersion.name, //createVersion.name
        bodyFile
      );
      console.log("populateFiles");

      const fileHash = populateFiles.uploadRequiredHashes; //populateFiles.uploadRequiredHashes   []

      const url = populateFiles.uploadUrl; //populateFiles.uploadUrl
      await Promise.all(
        fileHash.map(async (upl) => {
          let fileExisted = fileHashMap.find((check) => check.hash == upl);
          const readStream = fs.createReadStream(
            path.join(
              appRoot.path,
              "/uploads",
              `/${newDir}`,
              `/${fileExisted.filename}.gz`
            )
          );
          await firebaseService.uploadFiles(
            accessToken,
            url,
            fileExisted.hash,
            readStream
          );
        })
      );
      console.log("upload Files completed");
      const siteStatusUpdate = await firebaseService.siteStatusUpdate(
        accessToken,
        createVersion.name // createVersion.name
      );
      console.log("siteStatusUpdate completed");
      const releasedVersion = await firebaseService.releasedVersion(
        accessToken,
        siteId, //siteId
        siteStatusUpdate.name //siteStatusUpdate.name
      );
      const user = await googleService.getUserProfile(req.body.accessToken);
      await deployModel.User.create({
        email: user.email,
        ...createSite,
      });
      res.status(201).send(createSite);
      fs.rmSync(path.join(appRoot.path, "/uploads", `/${newDir}`), {
        recursive: true,
        force: true,
      });
    } catch (error) {
      fs.rmSync(path.join(appRoot.path, "/uploads", `/${newDir}`), {
        recursive: true,
        force: true,
      });
      console.log(error);
      res.status(error.status | 500).send({ msg: error.message });
    }
  }

  async zip(req, res) {
    let fileHashMap = [];
    const newDir = req.newDir;
    try {
      const { accessToken, projectName, siteName } = req.body;
      let bodyFile = { files: null };
      let siteId = siteName || uuidv4();
      if (!req.file)
        return res.status(400).send({ message: "file is required" });
      if (!req.body.accessToken)
        return res.status(400).send("accessToken is required");
      if (!req.body.projectName)
        return res.status(400).send("projectName is required");
      const fileContent = fs.readFileSync(
        path.join(
          appRoot.path,
          "/uploads",
          `/${newDir}`,
          `/${req.file.originalname}`
        )
      );
      const zipInstance = new jszip();
      const extrac = await zipInstance.loadAsync(fileContent);
      const getFiles = Object.keys(extrac.files);
      console.log("zip extract complete");
      for (let fileKey of getFiles) {
        const file = extrac.files[fileKey];

        let createFolders = pathCreateMethod(file.name);
        if (!!createFolders)
          fs.mkdirSync(
            path.join(
              appRoot.path,
              "/uploads",
              `/${newDir}`,
              `/${createFolders}`
            ),
            {
              recursive: true,
            }
          );

        fs.writeFileSync(
          path.join(appRoot.path, "/uploads", `/${newDir}`, `/${file.name}`),
          Buffer.from(await file.async("arraybuffer"))
        );
        await compressFile(
          path.join(appRoot.path, "/uploads", `/${newDir}`, `/${file.name}`)
        );
        const fileBuffer = fs.readFileSync(
          path.join(appRoot.path, "/uploads", `/${newDir}`, `/${file.name}.gz`)
        );
        const hashSum = crypto.createHash("sha256");
        hashSum.update(fileBuffer);
        const hex = hashSum.digest("hex");
        bodyFile.files = {
          ...bodyFile.files,
          [`/${file.name}`]: hex,
        };
        fileHashMap.push({ filename: file.name, hash: hex });
      }

      console.log("gzip and hash complete");
      const createSite = await firebaseService.createSite(
        accessToken,
        projectName,
        siteId
      );
      console.log("createSite");
      const createVersion = await firebaseService.createVersion(
        accessToken,
        siteId
      );
      console.log("createVersion");

      const populateFiles = await firebaseService.populateFile(
        accessToken,
        createVersion.name, //createVersion.name
        bodyFile
      );
      console.log("populateFiles completed");

      const fileHash = populateFiles.uploadRequiredHashes; //populateFiles.uploadRequiredHashes   []

      const url = populateFiles.uploadUrl; //populateFiles.uploadUrl
      await Promise.all(
        fileHash.map(async (upl) => {
          let fileExisted = fileHashMap.find((check) => check.hash == upl);

          const readStream = fs.createReadStream(
            path.join(
              appRoot.path,
              "/uploads",
              `/${newDir}`,
              `/${fileExisted.filename}.gz`
            )
          );
          await firebaseService.uploadFiles(
            accessToken,
            url,
            fileExisted.hash,
            readStream
          );
        })
      );

      console.log("upload Files completed");
      const siteStatusUpdate = await firebaseService.siteStatusUpdate(
        accessToken,
        createVersion.name // createVersion.name
      );
      console.log("siteStatusUpdate completed");
      const releasedVersion = await firebaseService.releasedVersion(
        accessToken,
        siteId, //siteId
        siteStatusUpdate.name //siteStatusUpdate.name
      );
      console.log("releasedVersion completed");
      const user = await googleService.getUserProfile(req.body.accessToken);
      await deployModel.User.create({
        email: user.email,
        ...createSite,
      });
      console.log("create record completed");
      res.status(201).send(createSite);
      fs.rmSync(path.join(appRoot.path, "/uploads", `/${newDir}`), {
        recursive: true,
        force: true,
      });
      console.log("site created completed");
    } catch (error) {
      fs.rmSync(path.join(appRoot.path, "/uploads", `/${newDir}`), {
        recursive: true,
        force: true,
      });
      console.log(error);
      res.status(error && error.status | 500).send({ msg: error.message });
    }
  }

  async zipTesting(req, res) {
    let fileHashMap = [];
    // fs.mkdirSync(path.join(appRoot.path, "/uploads", `/hellow/lolo`), {
    //   recursive: true,
    // });
    try {
      console.log(req.file);
      const { accessToken, projectName, siteName } = req.body;
      let bodyFile = { files: null };
      let siteId = siteName || uuidv4();
      if (!req.file)
        return res.status(400).send({ message: "files is required" });
      if (!req.body.accessToken)
        return res.status(400).send("accessToken is required");
      if (!req.body.projectName)
        return res.status(400).send("projectName is required");
      const fileContent = fs.readFileSync(
        path.join(appRoot.path, "/uploads", `/${req.file.originalname}`)
      );
      const zipInstance = new jszip();
      const extrac = await zipInstance.loadAsync(fileContent);
      const getFiles = Object.keys(extrac.files);

      for (let fileKey of getFiles) {
        const file = extrac.files[fileKey];

        let createFolders = pathCreateMethod(file.name);
        if (!!createFolders)
          fs.mkdirSync(
            path.join(appRoot.path, "/uploads", `/${createFolders}`),
            {
              recursive: true,
            }
          );

        fs.writeFileSync(
          path.join(appRoot.path, "/uploads", `/${file.name}`),
          Buffer.from(await file.async("arraybuffer"))
        );
        console.log(file);

        await compressFile(
          path.join(appRoot.path, "/uploads", `/${file.name}`)
        );
        const fileBuffer = fs.readFileSync(
          path.join(appRoot.path, "/uploads", `/${file.name}.gz`)
        );
        const hashSum = crypto.createHash("sha256");
        hashSum.update(fileBuffer);
        const hex = hashSum.digest("hex");
        bodyFile.files = {
          ...bodyFile.files,
          [`/${file.name}`]: hex,
        };
        fileHashMap.push({ filename: file.name, hash: hex });
      }

      // return res.send(bodyFile);

      const createSite = await firebaseService.createSite(
        accessToken,
        projectName,
        siteId
      );
      console.log("createSite");
      const createVersion = await firebaseService.createVersion(
        accessToken,
        siteId
      );
      console.log("createVersion");

      const populateFiles = await firebaseService.populateFile(
        accessToken,
        createVersion.name, //createVersion.name
        bodyFile
      );
      console.log("populateFiles");

      const fileHash = populateFiles.uploadRequiredHashes; //populateFiles.uploadRequiredHashes   []

      const url = populateFiles.uploadUrl; //populateFiles.uploadUrl
      await Promise.all(
        fileHash.map(async (upl) => {
          let fileExisted = fileHashMap.find((check) => check.hash == upl);
          console.log(fileExisted);
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

      const siteStatusUpdate = await firebaseService.siteStatusUpdate(
        accessToken,
        createVersion.name // createVersion.name
      );
      console.log(siteStatusUpdate);
      const releasedVersion = await firebaseService.releasedVersion(
        accessToken,
        siteId, //siteId
        siteStatusUpdate.name //siteStatusUpdate.name
      );

      removeBulkFiles(fileHashMap);
      const user = await googleService.getUserProfile(req.body.accessToken);
      await deployModel.User.create({
        email: user.email,
        ...createSite,
      });
      res.status(201).send(createSite);
      if (
        fs.existsSync(
          path.join(appRoot.path, "/uploads", `/${req.file.originalname}`)
        )
      )
        fs.unlinkSync(
          path.join(appRoot.path, "/uploads", `/${req.file.originalname}`)
        );
    } catch (error) {
      if (
        fs.existsSync(
          path.join(appRoot.path, "/uploads", `/${req.file.originalname}`)
        )
      )
        fs.unlinkSync(
          path.join(appRoot.path, "/uploads", `/${req.file.originalname}`)
        );
      removeBulkFiles(fileHashMap);
      console.log(error);
      res.status(error && error.status | 500).send({ msg: error.message });
    }
  }
}

module.exports = new DeployController();
