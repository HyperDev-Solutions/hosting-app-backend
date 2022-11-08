// 'use strict';
const { google } = require("googleapis");
const fetch = require("node-fetch");
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
const scopes = [
  "https://www.googleapis.com/auth/firebase",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

exports.googleAuthUrl = function () {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes, // If you only need one scope you can pass it as string
  });
};

exports.getUserProfile = function (accessToken) {
  return new Promise((resolve, reject) => {
    try {
      fetch("https://www.googleapis.com/userinfo/v2/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(async (res) => {
          // console.log(res);
          // if (res.status > 399) {
          //   let err = await res.json();
          //   reject(err.error);
          // }
          return res.json();
        })
        .then((json) => resolve(json))
        .catch((err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

exports.getTokens = async function (code) {
  return await oauth2Client.getToken(code);
};
