When an NFT holder needs money and worries that if he sells the NFT, its price will go up and it will be hard for him to buy it back, he can choose NFT lending (borrow with NFT as a collateral). The collateralized NFT must support the ERC721 agreement.

### Transaction scenarios

#### Standard NFT lending process

1) The initiator creates the transaction, and conducts ERC 721 authorization to the NFT lending contract.
2) The initiator calls the “publish” function to publish the transaction. The information published includes NFT contract address, NFT Token ID, NFT introductory information. At the same time, the NFT lending contract will transfer the initiator’s NFT to the current contract.
3) The lender calls the “lendOut” function to lend. This function will transfer the lender’s fund to the initiator, and set the payback deadline at the same time.
4) The initiator calls the “repay” function before the deadline to pay back. The amount paid back includes interests. At the same time, this function will send the NFT in the contract back to the initiator.

#### Cancel NFT lending

1) The initiator creates the transaction, and conducts ERC 721 authorization to the NFT lending contract.
2) The initiator calls the “publish” function to publish the transaction. The information published includes NFT contract address, NFT Token ID, NFT introductory information. At the same time, the NFT lending contract will transfer the initiator’s NFT to the current contract.
3) Before the lender pays out, the initiator can call the “withdraw” function of the contract to cancel the NFT lending transaction. This function will transfer the NFT in the contract back to the initiator.

#### Pay back after the deadline

1) The initiator creates the transaction, and conducts ERC 721 authorization to the NFT lending contract.
2) The initiator calls the “publish” function to publish the transaction. The information published includes NFT contract address, NFT Token ID, NFT introductory information. At the same time, the NFT lending contract will transfer the initiator’s NFT to the current contract.
3) The lender calls the “lendOut” function to lend. This function will transfer the lender’s fund to the initiator, and set the payback deadline at the same time.
4) If the initiator does not pay back before the deadline, penalty fees will be added to the fund paid back later. The initiator can call the “repay” function of the contract to pay back the fund. This function will transfer the NFT in the contract back to the initiator.

> Penalty fees = (current time – deadline) * interest rate *penalty rate. The interval between the current time and the deadline is accurate to a day.

#### Withdraw after the deadline

1) The initiator creates the transaction, and conducts ERC 721 authorization to the NFT lending contract.
2) The initiator calls the “publish” function to publish the transaction. The information published includes NFT contract address, NFT Token ID, NFT introductory information. At the same time, the NFT lending contract will transfer the initiator’s NFT to the current contract.
3) The lender calls the “lendOut” function to lend. This function will transfer the lender’s fund to the initiator, and set the payback deadline at the same time.
4) The initiator did not pay back before the deadline, and the lender calls the function of “withdraw” in the contract to withdraw the NFT from the contract to make up for the fund lent out.

Please note:
> When the lender calls the “withdraw” function, he needs to transfer a certain amount of fund into the contract to pay for the service fees charged by the platform.

#### publish methods

Parameters

- address nftAddress: NFT contract address
- uint256 nftTokenId：NFT TOKEN ID
- bytes memory tid: transaction ID
- uint256[] memory values: a table which by order stores borrowed amount, interests, platform service fee rate, penalty rate.
- address platform: the address of the platform’s wallet, for the collection of service fees.
- address token: transferred-in token type. If it is 0x0000000000000000000000000000000000000000, it refers to Ethereum, the rest refers to the corresponding ERC20 token types.

Please note:
> the numbers of platform service fee rate and penalty rate are 1/10,000; for example, 2000 refers to 20%, and 500 refers to 5%.

#### lendOut
Parameters

- uint256 value: borrowed amount, which should be the same as what the initiator sets.
- bytes memory tid: transaction ID
- uint256 endDate: deadline for pay back, accurate to the unit of second.

Please note:

1) If paying through Ethereum, then one should make sure the wallet balance should not be less than the borrowed amount. Choosing this payment method means that at the same time Ethereum will be transferred into the contract. In this case, “msg.value” should equal “value.” 
2) If paying through ERC20 tokens, then one should authorize the contract in advance, and the authorized amount should be no less than the borrowed amount. When paying, the contract will call ERC20’s “transferFrom” function to deduct the payment amount.

#### Pay back

Parameters

- uint256 value: the amount paid back
- bytes memory tid: transaction ID

Please note:
1) the standard amount paid back = borrowed amount + interests; if delayed, then plus penalty fees.
2) The function will send the amount paid back to the lender and the platform (service fees). See the rules of calculation of service fees in “Withdrawal Service Fees.”
3) This function will send the NFT to the initiator.

#### withdraw
The “withdraw” scenario has two kinds of situations: one is that the initiator cancels the lending; the other is that the lender withdraws the NFT after the initiator misses the payment after the deadline.

Parameters

- uint256 value: service fees; if the initiator cancels the borrowing process, service fee = 0.
- bytes memory tid: transaction ID

> during withdrawal, the platform will charge a service fee; with a coupon part or all of the fee can be waived.
> - service fee = withdrawal amount * platform service fee rate
