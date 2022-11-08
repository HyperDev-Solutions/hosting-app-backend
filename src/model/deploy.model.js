"use strict";
const mongoose = require("mongoose");

const DeploySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "",
    },
    defaultUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

exports.User = mongoose.model("Deploy", DeploySchema);
