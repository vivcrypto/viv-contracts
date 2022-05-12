Secure transfer contracts deal with the problem that when the receiving address input is wrong, on Ethereum once the amount is transferred out, it is irreversible.

### transaction scenarios

#### Completed transfer (A transfers to B)
1) A calls for the “transferIn” function of the contract and transfers the fund into the contract.
2) B calls for the “transferOut” function of the contract and withdraws the fund into his wallet.
> Since when A calls for the “transferIn” function, A authorizes B only to withdraw the fund; therefore only B can withdraw the fund by calling “transferOut” of the contract. This guarantees the safety of the fund.

#### Canceled transfer (A transfers to B. A fills the wrong address or A changes his mind.)
1) A calls for the “transferIn” function of the contract and transfers the fund into the contract.
2) A calls for the “cancelTransferIn” function of the contract, and the fund goes back to A following the previous path.
> Only A can use “cancelTransferIn”, which guarantees the safety of the fund.

### On contracts
Contracts are drafted by the Platform. One contract can be used by several parties. Similar to the storage of ERC20, the contract records every party’s balances and authorized amounts. Token types supported in the transactions are ETH and ERC20 tokens.

#### Transfer-in method: transferIn
Parameters
- address spender: spender’s wallet address
- uint256 value: Amount transferred in
- address_token: The token type transferred in. If the token type transferred in is 0x0000000000000000000000000000000000000000, it is ETH; otherwise it is a ERC20 token.

Please note:
1) If paying through Ethereum, then one should make sure the wallet balance should not be less than the transaction amount. Choosing this payment method means that at the same time Ethereum will be transferred into the contract. In this case, “msg.value” should equal “value.”

2) If paying through ERC20 tokens, then one should authorize the contract in advance, and the authorized amount should be no less than the transaction amount. When paying, the contract will call ERC20’s “transferFrom” function to deduct the payment amount.

3) Contracts can be called repeatedly. If the sender is the same, the authorized amount will be accumulated. For example, if A sends 100 to B at first, and then sends 200 to B later, B can send 300 out. 

4) A person can transfer to different people, and there will be no contradiction. For example, A sends 100 to B and then sends 200 to C, then B and C can send 100 and 200 out respectively.

#### transfer-out method: transferOut

- address sender: the wallet of the person who gives out authorization
- uint256 value: amount transferred out
- address_token: The token type transferred in. If the token type transferred in is 0x0000000000000000000000000000000000000000, it is ETH; otherwise it is a ERC20 token. Note: the token type here must be the same as the token type of “transferIn”, or it will cause a failure.

Please note: 

1) The user can transfer out one time, or several times. For example, if A transfers 300 to B, B can transfer 300 out in one time; or he can transfer 100 first and 200 later. Amount that can be transferred out = amount transferred in – amount canceled – amount already transferred out.

#### cancel method: cancelTransferIn

Parameters

- address spender: the wallet address of the spender
- uint256 value: amount canceled
- address_token: the token type canceled. If the token type transferred in is 0x0000000000000000000000000000000000000000, it is ETH; otherwise it is a ERC20 token. Note: the token type here must be the same as the token type of “transferIn,” or it will cause a failure.

Please note:
1) Users can cancel the total amount of transfer, or a part of it. Corresponding to “transferIn,” amount that can be canceled = amount transferred in – amount canceled – amount already transferred out.
