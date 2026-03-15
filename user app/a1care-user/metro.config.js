const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Push custom extensions
config.resolver.sourceExts.push("mjs");
config.resolver.sourceExts.push("cjs");

// Force use of CJS for packages that have issues with ESM resolution on Windows
config.resolver.resolverMainFields = ["main", "module", "browser", "react-native"];

module.exports = config;
