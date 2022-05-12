Recurring payments ask the buyer to pay according to a predetermined schedule. There is no “order shipping” and “receipt confirmation” in this recurring payment service.
The buyer needs to pay a deposit (customizable). The deposit will be locked before the contract ends. After the contract ends, the buyer can withdraw the deposit.
Applicable transaction scenarios include monthly subscriptions of online video platforms and rent.

### Transaction scenarios

#### 1. Payment without delay

1) The seller initiates the transaction and sends the link to the buyer.
2) The buyer pays (call the contract's “purchase” function) to the contract. The contract transfers the payment to the seller automatically.
3) The transaction ends. The buyer calls the contract’s “refundDeposit” function to get the deposit back.

Please note:
> When the buyer pays for the first time, the amount includes the deposit plus the first price. The amounts of the following payments only include the respective prices.

#### 2. Delayed Payment

1) The seller initiates the transaction and sends the link to the buyer.
2) The buyer did not pay before the predetermined date (or he paid several times on time but didn’t pay on time for the most recent one). Then the penalty amount will be calculated from the predetermined pay day of this round. The seller can get this amount from the buyer’s deposit.
3) The buyer calls the “purchase” function to pay. Only when the amount the buyer pays includes the penalty fee can the payment go through. The paid penalty fee will be added to the deposit, and the rest of the amount will be sent to the seller.
4) The seller can call the “withdraw” function to withdraw the penalty fee.

Please note:
1) Penalty fee amount = (current date – predetermined pay date) * deposit * penalty rate,
(current date – predetermined pay date) should be a number of days.

2) If the penalty fee exceeds the deposit, the transaction will be closed.

#### 3. Refund without dispute (the buyer applies for refund and the seller agrees to refund.)

1) The seller initiates the transaction and sends the link to the buyer.
2) The buyer pays (call the contract's “purchase” function) to the contract.
3) The buyer asks for refund (no matter the seller has shipped the good/service or not)
4) The seller agrees to refund (seller signs)
5) The buyer withdraws the payment from the contract (call the contract's “withdraw” function); buyer signs before withdrawal as well. Two parties have signed and the withdrawal can be completed.

#### 4. Arbitration I: support the buyer (the buyer asks for refund and the seller refuses; VIV platform or a third-party arbitrator arbitrates and rules in favor of the buyer.)

1) The seller initiates the transaction and sends the link to the buyer.
2) The buyer pays (call the contract's “purchase” function) to the contract.
3) The buyer asks for refund (no matter the seller has shipped the good/service or not)
4) The seller does not agree to a refund.
5) The buyer calls for arbitration.
6) VIV platform or a third party conducts the arbitration and chooses to support the buyer. (In other words, VIV platform or the third party signs the contract in favor of the buyer.)
7) The buyer withdraws the payment from the contract (call the contract's “withdraw” function); buyer signs before withdrawal as well. Two parties have signed and the withdrawal can be completed.

Please note:
> The amount the buyer can withdraw from the contract is the amount of deposit left in the contract by that time, which equals the amount the buyer paid minus the amount the seller had already withdrawn from the contract (If the seller had withdrawn any).

#### 5. Arbitration II: support the seller (the buyer asks for refund and the seller refuses; VIV platform or a third-party arbitrator arbitrates and rules in favor of the seller.)

1) The seller initiates the transaction and sends the link to the buyer.
2) The buyer pays (call the contract's “purchase” function) to the contract.
3) The buyer asks for refund (no matter the seller has shipped the good/service or not)
4) The seller does not agree to refund.
5) The buyer calls for arbitration.
6) VIV platform or a third party conducts the arbitration and chooses to support the seller. (In other words, VIV platform or the third party signs the contract in favor of the seller.)
7) The seller withdraws the payment from the contract (call the contract's “withdraw” function); seller signs before withdrawal as well. Two parties have signed and the withdrawal can be completed.

Please note:
> The amount the seller can withdraw from the contract is the amount of deposit left in the contract by that time, which equals the amount the buyer paid minus the amount the seller had already withdrawn from the contract (If the seller had withdrawn any).

#### 6. Arbitration III: support both buyer and seller, with the proportions of the payment they will receive determined (the buyer asks for refund and the seller refuses; VIV platform or a third-party arbitrator arbitrates and rules to split the payment between them.)

1) The seller initiates the transaction and sends the link to the buyer.
2) The buyer pays (call the contract's “purchase” function) to the contract.
3) The buyer asks for refund (no matter the seller has shipped the good/service or not)
4) The seller does not agree to a refund.
5) The buyer calls for arbitration.
6) VIV platform or a third party conducts the arbitration and chooses to split the payment between buyer and seller. (In other words, VIV platform or the third party signs the contract in favor of both parties.)
7) Buyer or seller withdraws the payment from the contract (call the contract's “withdraw” function); buyer or seller signs before withdrawal. Two parties (buyer/seller and arbitrator) have signed and the withdrawal can be completed.

Please note:
> The amount the buyer and the seller can withdraw from the contract is the amount of deposit left in the contract by that time, which equals the amount the buyer paid minus the amount the seller had already withdrawn from the contract (If the seller had withdrawn any).

### On contracts

Contracts are generated by the platform. One contract can support multiple transactions. Different transactions can be distinguished from their different transaction IDs. Token types supported are ETH and ERC20 tokens.


#### Payment methods

Parameters

- address[] memory users：the list, by order, stores the wallet address of the seller, the wallet address of the platform, the wallet address of the arbitrator, token type (If it is 0x0000000000000000000000000000000000000000, it refers to Ethereum, the rest refers to the corresponding ERC20 token types.)
- uint256[] memory values：the payment amount list, which stores the specific payment of every round;
- uint256[] memory times：the payment time list, which stores the dates for the buyers to pay every round. The times are shown in a timestamp that is accurate to second.
- bytes calldata tid: transaction ID
- uint256 penaltyRate: the penalty rate (please note that the number here is 1/10,000; for example, 2000 refers to 20%, and 500 refers to 5%)
- uint256 feeRate: platform service fee rate (please note that the number here is 1/10,000; for example, 2000 refers to 20%, and 500 refers to 5%)
- uint256 value: payment amount
- uint256 deposit: the deposit. The first-time one is the deposit for the transaction, and the following ones are the ones to make up the difference caused by the penalty fees. If there is no deposit, it can be 0.

Please note:
1) If paying through Ethereum, then one should make sure the wallet balance should not be less than the sum of the “value” and “deposit.” Choosing this payment method means that at the same time Ethereum will be transferred into the contract. In this case, msg.value should equal the sum of the “value” and “deposit.”.
2) If paying through ERC20 tokens, then one should authorize the contract in advance, and the authorized amount should be no less than the sum of the “value” and “deposit.” When paying, the contract will call ERC20’s “transferFrom” function to deduct the payment amount.
3) When the buyer pays to the contract, the contract will transfer the payment to the seller. The process will incur a certain amount of service fee. For specific rules, please refer to “Terms of Service Fees for Payment Withdrawal.”

#### withdrawal methods
parameters
- bytes memory signedValue1: buyer, seller, guarantor (arbitrator) sign; signature rules in “signature rules.”
- bytes memory signedValue2: buyer, seller, guarantor (arbitrator) sign; signature rules in “signature rules.”
- bytes memory signedValue3: platform signs, only when buyer or seller uses a coupon; signature rules in “signature rules.”
- uint256 value: withdrawal amount, including service fee and arbitration fee
- uint256 couponRate: coupon rate (please note that the number here is 1/10,000; for example, 2000 refers to 20%, and 500 refers to 5%)
- uint256 arbitrateFee: arbitration fee
- bytes memory tid: transaction id
- bytes memory couponId: coupon id

> during withdrawal, the platform will charge a service fee; with a coupon part or all of the fee can be waived.
> - service fee = (withdrawal amount – arbitration fee) * platform service fee rate
> - discounted service fee = service fee * coupon rate
> - final service fee = service fee - discount

#### signature rules:
1) signedValue1 or signedValue2 are generated based on the following rules:
   - When without arbitration, calculate the hash of the transaction ID, and use the buyer’s, seller’s and the arbitrator’s private keys to sign toward this hash.
   - When with arbitration, calculate the hash values of the transaction amount, arbitration fee and the transaction ID, and use the buyer’s, seller’s and the arbitrator’s private keys to sign toward these hash values.
2) signedValue3 is generated based on the following rules:
   - calculate the hash values of coupon rate, coupon ID and transaction ID, and use the platform’s private key to sign toward these hash.


#### signature example
Take the calculation of signedValue1 (with arbitration) as an example:
- transaction amount: 10000000 wei
- arbitration fee: 2000000 wei
- transaction ID: 457542584823209984

The js code for hash calculation and signature are the following:

> npm install web3
```
let ethUtil = require("ethereumjs-util");
const Web3 = require('web3')
const web3 = new Web3()

let tid = "457542584823209984";
let privateKey = "0xf95816c196aec67bdae2f72005d4b11203162c72ed4e3833958e052df8a32edd";

/**
* calculate hash
 * @param {*} types  (format as)：['uint256', 'uint256', 'uint256', 'bytes']
 * @param {*} values (format as)：[200, 500, 100, "0x343838363937323533343434323539383430"]
 * @returns 
 */
function getHash(types, values) {
  const data = ethUtil.toBuffer(web3.eth.abi.encodeParameters(types, values));
  const buf = Buffer.concat([
    Buffer.from(
    "\u0019Ethereum Signed Message:\n" + data.length.toString(),
    "utf8"
    ),
    data
  ]);
  const hash = ethUtil.keccak256(buf);
  return ethUtil.bufferToHex(hash);
}

const data = ethUtil.bufferToHex(ethUtil.toBuffer(Buffer.from(tid, "utf8")));
var msgHash = ethUtil.toBuffer(getHash(['uint256', 'uint256', 'bytes'], [web3.utils.toWei('10000000', 'gwei'), web3.utils.toWei('2000000', 'gwei'), data]));

const rsv = ethUtil.ecsign(msgHash, ethUtil.toBuffer(privateKey));
console.log("hash: 0x" + msgHash.toString('hex'));
console.log("sign: 0x" + rsv.r.toString('hex') + rsv.s.toString('hex') + rsv.v.toString(16));
```
