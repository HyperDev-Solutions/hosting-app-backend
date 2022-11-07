// 'use strict';
const { google } = require("googleapis");
const clientId =
  "782042023810-sf67htcsom14d2q9nqu06v23v84vf34l.apps.googleusercontent.com";
const clientSecret = "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";
const redirectUri = "http://localhost:8000/api/deploy/auth/callback";
const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
  /*
   * This is where Google will redirect the user after they
   * give permission to your application
   */
);
const scopes = ["https://www.googleapis.com/auth/firebase"];

exports.googleAuthUrl = function () {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes, // If you only need one scope you can pass it as string
  });
};

exports.getTokens = async function (code) {
  return await oauth2Client.getToken(code);
};
