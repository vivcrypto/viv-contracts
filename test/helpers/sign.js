const ethUtil = require('ethereumjs-util');

/**
 * get hash
 * @param {*} types 格式如：['uint256', 'uint256', 'uint256', 'bytes']
 * @param {*} values  格式如：[200, 500, 100, "0x343838363937323533343434323539383430"]
 * @returns
 */
function getHashString (types, values) {
  return ethUtil.bufferToHex(getHash(types, values));
}

/**
 * get hash
 * @param {*} types 格式如：['uint256', 'uint256', 'uint256', 'bytes']
 * @param {*} values  格式如：[200, 500, 100, "0x343838363937323533343434323539383430"]
 * @returns
 */
function getHash (types, values) {
  const data = ethUtil.toBuffer(web3.eth.abi.encodeParameters(types, values));
  const buf = Buffer.concat([
    Buffer.from(
      '\u0019Ethereum Signed Message:\n' + data.length.toString(),
      'utf8',
    ),
    data,
  ]);
  const hash = ethUtil.keccak256(buf);
  return hash;
}

/**
 * get sign
 * @param {*} msgHash
 * @param {*} privateKey
 * @returns
 */
function getSignFromHash (msgHash, privateKey) {
  const rsv = ethUtil.ecsign(ethUtil.toBuffer(msgHash), ethUtil.toBuffer(privateKey));
  return '0x' + rsv.r.toString('hex') + rsv.s.toString('hex') + rsv.v.toString(16);
}

/**
 * get sign
 * @param {*} types
 * @param {*} values
 * @param {*} privateKey
 * @returns
 */
function getSign (types, values, privateKey) {
  const hash = getHashString(types, values);
  return getSignFromHash(hash, privateKey);
}

module.exports = {
  getHash: getHash,
  getHashString: getHashString,
  getSignFromHash: getSignFromHash,
  getSign: getSign,
};
