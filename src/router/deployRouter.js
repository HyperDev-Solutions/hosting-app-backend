const express = require("express");
const router = express.Router();
const multer = require("multer");
const ValidationMiddleware = require("../middelware/validation.middleware");
const fs = require("fs");
const appRoot = require("app-root-path");
const path = require("path");
const exceptWebFiles = ["html", "css", "js"];
const exceptZipFiles = ["zip"];
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(path.join(appRoot.path, "/uploads", `/${req.newDir}`)))
      fs.mkdirSync(path.join(appRoot.path, "/uploads", `/${req.newDir}`));

    cb(null, `uploads/${req.newDir}`);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const uploadFile = (array) => {
  return multer({
    fileFilter: (req, file, cb) => {
      const arr = array;
      const ext = file.mimetype.split("/")[1];

      if (arr.length == 0 || arr.includes(ext)) {
        req.multerError = null;
        cb(null, true);
      } else {
        req.multerError = `Only Supported  [${array}] Files`;
        cb(false, false);
      }
    },
    storage: storage,
  });
};

const uniqueIdGenrator = (req, res, next) => {
  req.newDir = `build${Date.now()}`;
  next();
};

const checkMulterErrorMiddleware = (req, res, next) => {
  if (req.multerError)
    return res.status(400).send({ message: req.multerError });
  else next();
};
const deployController = require("../controller/deploy.controller");

router.get("/getAllProject", deployController.getAllProject);
router.post(
  "/",
  uniqueIdGenrator,
  uploadFile(exceptWebFiles).array("files"),
  checkMulterErrorMiddleware,
  ValidationMiddleware.validateDeployJoi,
  deployController.deploy
);

router.post(
  "/zip",
  uniqueIdGenrator,
  uploadFile(exceptZipFiles).single("file"),
  checkMulterErrorMiddleware,
  ValidationMiddleware.validateDeployZipJoi,
  deployController.zip
);
router.post(
  "/zipTesting",
  uploadFile(exceptZipFiles).single("file"),
  checkMulterErrorMiddleware,
  deployController.zipTesting
);

router.get("/auth/authGoogleUrl", deployController.authGoogleUrl);

router.get("/auth/callback", deployController.authCallback);

router.get(
  "/auth/googleToken",
  ValidationMiddleware.validateGoogleTokenJoi,
  deployController.googleToken
);
router.get("/auth/getUserProfile", deployController.getUserProfile);
module.exports = router;
