const fs = require("fs");
const path = require("path");
const { withDangerousMod } = require("@expo/config-plugins");

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const source = path.join(
        config.modRequest.projectRoot,
        "assets",
        "adi-registration.properties"
      );
      const targetDir = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets"
      );

      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(source, path.join(targetDir, "adi-registration.properties"));

      const credentialsDir = path.join(
        config.modRequest.projectRoot,
        "credentials",
        "android"
      );
      const keystoreSource = path.join(
        credentialsDir,
        "a1care-partner-upload-key.jks"
      );
      const keystoreProperties = path.join(
        credentialsDir,
        "a1care-partner-upload-key.properties"
      );

      if (fs.existsSync(keystoreSource) && fs.existsSync(keystoreProperties)) {
        const androidAppDir = path.join(config.modRequest.platformProjectRoot, "app");
        const androidKeyProperties = path.join(
          config.modRequest.platformProjectRoot,
          "key.properties"
        );
        const credentials = Object.fromEntries(
          fs
            .readFileSync(keystoreProperties, "utf8")
            .split(/\r?\n/)
            .filter((line) => line.includes(": "))
            .map((line) => line.split(/: (.*)/s).slice(0, 2))
        );

        fs.copyFileSync(
          keystoreSource,
          path.join(androidAppDir, "a1care-partner-upload-key.jks")
        );
        fs.writeFileSync(
          androidKeyProperties,
          [
            "storeFile=a1care-partner-upload-key.jks",
            `storePassword=${credentials["Store password"]}`,
            `keyAlias=${credentials.Alias}`,
            `keyPassword=${credentials["Key password"]}`,
            "",
          ].join("\n")
        );
      }

      return config;
    },
  ]);
};
