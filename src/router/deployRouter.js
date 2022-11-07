const express = require("express");
const router = express.Router();
const multer = require("multer");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage: storage,
});
const deployController = require("../controller/deploy.controller");

router.get("/getAllProject", deployController.getAllProject);
router.post("/", upload.array("files"), deployController.deploy);

router.get("/auth/authGoogleUrl", deployController.authGoogleUrl);

router.get("/auth/callback", deployController.authCallback);

router.get("/auth/googleToken", deployController.googleToken);
module.exports = router;
