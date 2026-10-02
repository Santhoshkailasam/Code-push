const initialVersionData = require('../../version.json');

const state = {
  android: initialVersionData.android,
  ios: initialVersionData.ios,
  history: initialVersionData.history || []
};

module.exports = state;
