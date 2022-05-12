Multi-transfer contracts aim to solve the high gas fee problem caused by transfers among several addresses. Every transfer will incur a gas fee. However, multi-transfer contracts can do transfers among multiple addresses and just incur one gas fee.

### Transaction scenarios

#### Multi-transfers

Call the function of “multiTransfer” of the contract. When the transfer is being made to the contract, the contract will automatically send the amounts to the corresponding multiple addresses.


### On contracts

Contracts are drafted by the Platform. One contract can be used by several parties. Token types supported in the transactions are ETH and ERC20 tokens.

#### Multi-transfer approaches


Parameters

- address [] memory addresses：the list of addresses of the receiving parties
- uint256[] memory values: the list of received amounts, corresponding to addresses respectively; so the number of “values” must equal the number of “addresses.”
- address_token: The token type transferred in. If the token type transferred in is 0x0000000000000000000000000000000000000000, it is ETH; otherwise it is a ERC20 token.

Please note:
1) If paying through Ethereum, then one should make sure the wallet balance should not be less than the sum of “values.” Choosing this payment method means that at the same time Ethereum will be transferred into the contract. In this case, “msg.value” should equal “values.” 

2) If paying through ERC20 tokens, then one should authorize the contract in advance, and the authorized amount should be no less than the sum of “values.” When paying, the contract will call ERC20’s “transferFrom” function to deduct the payment amount.
