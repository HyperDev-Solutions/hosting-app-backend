// 'use strict';
const { google } = require("googleapis");
const fetch = require("node-fetch");

const googleApiUrl = process.env.GOOGLE_API_URL;

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_CLIENT_REDIRECT_URL;
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
  `${googleApiUrl}/auth/firebase`,
  `${googleApiUrl}/auth/userinfo.email`,
  `${googleApiUrl}/auth/userinfo.profile`,
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
      fetch(`${googleApiUrl}/userinfo/v2/me`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(async (res) => {
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
