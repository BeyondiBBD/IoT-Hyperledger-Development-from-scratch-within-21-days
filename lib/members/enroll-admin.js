"use strict";

require("../../config");

//HINT
// console.log(admin_user.getIdentity()._publicKey.getPublicKey().toBytes());
// console.log(admin_user.getIdentity());

let hfc = require("fabric-client"),
  helper = require("../helper"),
  orgName = process.argv[2],
  util = require("util"),
  admins = hfc.getConfigSetting("admins"),
  admin_user = null;

var enrollAdmin = async function() {
  if (!admins[orgName]) {
    console.log(
      util.format(
        "Admin for organisation %s is not defined in config.json",
        orgName
      )
    );
  }

  let client = await helper.getClientForOrg(orgName);

  client
    .getUserContext(admins[orgName].username, true)
    .then(async admin => {
      if (admin && admin.isEnrolled()) {
        admin_user = admin;
        return null;
      } else {
        let caClient = client.getCertificateAuthority();

        return caClient
          .enroll({
            enrollmentID: admins[orgName].username,
            enrollmentSecret: admins[orgName].secret
          })
          .then(enrollment => {
            return client.createUser({
              username: admins[orgName].username,
              mspid: orgName + "MSP",
              type: "admin",
              cryptoContent: {
                privateKeyPEM: enrollment.key.toBytes(),
                signedCertPEM: enrollment.certificate
              }
            });
          })
          .then(user => {
            console.log(
              util.format("User: %s is enrolled and created", user._name)
            );
            return util.format(
              "User: %s is enrolled and created",
              user._name
            );
          });
      }
    })
    .then(() => {
      // we need to check for fix on this as it returns both when enrolled first time,
      // this should be called only when enrolling second time
      if (admin_user) {
        console.log(
          util.format(
            "User: %s is already enrolled and created",
            admin_user._name
          )
        );
        return util.format(
          "User: %s is enrolled and created",
          admin_user._name
        );
      }
    })
    .catch(err => {
      console.log(err);
      return false;
    });
};

enrollAdmin();
