// 'use strict';
const fetch = require("node-fetch");
const firebaselApiUrl = "https://firebase.googleapis.com";
const firebaselHostingUrl = "https://firebasehosting.googleapis.com";
exports.getAllProject = function (accessToken) {
  return new Promise((resolve, reject) => {
    try {
      fetch(`${firebaselApiUrl}/v1beta1/projects`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(async (res) => {
          if (res.status > 399) {
            let err = await res.json();
            reject(err.error);
          }
          return res.json();
        })
        .then((json) => resolve(json.results))
        .catch((err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

exports.createSite = function (accessToken, projectName, siteId) {
  return new Promise((resolve, reject) => {
    try {
      fetch(
        `${firebaselHostingUrl}/v1beta1/projects/${projectName}/sites?siteId=${siteId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          //   body: JSON.stringify({name:}),
        }
      )
        .then(async (res) => {
          if (res.status > 399) {
            let err = await res.json();
            reject(err.error);
          }
          return res.json();
        })
        .then((json) => resolve(json))
        .catch((err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

exports.createVersion = function (accessToken, siteId) {
  return new Promise((resolve, reject) => {
    try {
      fetch(`${firebaselHostingUrl}/v1beta1/sites/${siteId}/versions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          config: {
            headers: [
              {
                glob: "**",
                headers: {
                  "Cache-Control": "max-age=1800",
                },
              },
            ],
          },
        }),
      })
        .then(async (res) => {
          if (res.status > 399) {
            let err = await res.json();
            reject(err.error);
          }
          return res.json();
        })
        .then((json) => resolve(json))
        .catch((err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

exports.populateFile = function (accessToken, versionsName, body) {
  return new Promise((resolve, reject) => {
    try {
      fetch(`${firebaselHostingUrl}/v1beta1/${versionsName}:populateFiles`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      })
        .then(async (res) => {
          if (res.status > 399) {
            let err = await res.json();
            reject(err.error);
          }
          return res.json();
        })
        .then((json) => resolve(json))
        .catch((err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

exports.uploadFiles = function (accessToken, url, filesHash, streamFile) {
  return new Promise((resolve, reject) => {
    try {
      fetch(`${url}/${filesHash}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/octet-stream",
        },
        body: streamFile,
      })
        .then(async (res) => {
          if (res.status > 399) {
            let err = await res.text();
            console.log(err);
            reject({ status: 400, message: err });
          }
          return res.text();
        })
        .then((json) => resolve(json))
        .catch((err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

exports.siteStatusUpdate = function (accessToken, versionName) {
  return new Promise((resolve, reject) => {
    try {
      fetch(
        `${firebaselHostingUrl}/v1beta1/${versionName}?update_mask=status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status: "FINALIZED" }),
        }
      )
        .then(async (res) => {
          if (res.status > 399) {
            let err = await res.json();
            reject(err.error);
          }
          return res.json();
        })
        .then((json) => resolve(json))
        .catch((err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

exports.releasedVersion = function (accessToken, siteId, versionName) {
  return new Promise((resolve, reject) => {
    try {
      fetch(
        `${firebaselHostingUrl}/v1beta1/sites/${siteId}/releases?versionName=${versionName}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      )
        .then(async (res) => {
          if (res.status > 399) {
            let err = await res.json();
            reject(err.error);
          }
          return res.json();
        })
        .then((json) => resolve(json))
        .catch((err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};
