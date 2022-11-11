const Joi = require("joi");

module.exports = class Validator {
  //********************** User Login Validate************************************* */
  schemaGoogleTokenJoi(data) {
    const schema = Joi.object({
      code: Joi.string().required().label("code is required in queryParam"),
    });
    return schema.validate(data);
  }

  schemaDeployJoi(data) {
    const schema = Joi.object({
      accessToken: Joi.string().required(),
      projectName: Joi.string().required(),
      siteName: Joi.string().optional().allow("", null),
      files: Joi.string().optional().allow("", null),
    });
    return schema.validate(data);
  }

  schemaDeployZipJoi(data) {
    const schema = Joi.object({
      accessToken: Joi.string().required(),
      projectName: Joi.string().required(),
      siteName: Joi.string().optional().allow("", null),
      file: Joi.string().optional().allow("", null),
    });
    return schema.validate(data);
  }

  schemaFilesJoi(data) {
    const schema = Joi.object({
      files: Joi.array().required(),
    });
    return schema.validate(data);
  }
};
