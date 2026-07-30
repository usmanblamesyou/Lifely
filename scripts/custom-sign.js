exports.default = async function customSign(context) {
  // Custom sign hook - bypasses signtool and winCodeSign
  return Promise.resolve();
};
