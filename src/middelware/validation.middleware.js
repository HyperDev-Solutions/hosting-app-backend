const ValidatorSchema = require("../helper/validationSchema");

class ValidationMiddleware extends ValidatorSchema {
  constructor() {
    super();
  }

  //********************** JOI VALIDATION ************************************* */

  //********************** Deploy Validate Joi************************************* */

  validateGoogleTokenJoi(req, res, next) {
    try {
      const { error, value } = super.schemaGoogleTokenJoi(req.query);
      if (error)
        return res
          .status(400)
          .send({ msg: error && error.details[0].message, status: 400 });
      req.body = { ...value };
      next();
    } catch (error) {
      next(error);
    }
  }

  validateDeployJoi(req, res, next) {
    try {
      const { error, value } = super.schemaDeployJoi(req.body);
      if (error)
        return res
          .status(400)
          .send({ msg: error && error.details[0].message, status: 400 });
      req.body = { ...value };
      next();
    } catch (error) {
      next(error);
    }
  }

  validateDeployZipJoi(req, res, next) {
    try {
      const { error, value } = super.schemaDeployZipJoi(req.body);
      if (error)
        return res
          .status(400)
          .send({ msg: error && error.details[0].message, status: 400 });
      req.body = { ...value };
      next();
    } catch (error) {
      next(error);
    }
  }

  validateFilesJoi(req, res, next) {
    try {
      const { error, value } = super.schemaFilesJoi(req.files);
      if (error)
        return res
          .status(400)
          .send({ msg: error && error.details[0].message, status: 400 });
      req.body = { ...value };
      next();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ValidationMiddleware();
