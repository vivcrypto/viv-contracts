ERC contracts are used for token exchange in the DAO contract. They are created by the DAO initiator, and they mint tokens and send them to the initiator and participants during the crowdfunding of the DAO contract.

### Transaction Scenarios

#### Token minting
The participant calls the DAO contract and transfers to it. The DAO contract calculates the number of DAO TOKENs to give to the participant based on exchange rate and deflation rate. And then it calls the “mint” function to mint the number of tokens accordingly.

#### Transfer

After the token minting, according to the reserve rate, the calculated tokens will be given to the participant. The reserved tokens can be withdrawn by the initiator. The DAO contract calls its transfer function to send the tokens to the initiator.

### On contracts

The contract is generated by the initiator of DAO, and the “owner” belongs to the DAO contract and can mint tokens and transfer funds in the DAO contract. Therefore this contract needs to be generated after the DAO contract is generated. In this way, the DAO contract can be appointed as the owner of this contract.

#### Create contracts

Parameters

- string memory name: token name
- string memory symbol: token symbol
- address owner: token owner

Please note:
> After being created, the address of this contract can be looked up by the transaction hash in the blockchain explorer.

#### mint

Parameters

- uint256 amount: the number of tokens minted, calculated by DAO. The default right of new token minting belongs to the DAO contract. The DAO contract allots the tokens to the initiator and the participants according to certain rules.


#### transfer

Parameters

- address to: the target address, DAO’s participants or initiator
- uint256 amount: the amount transferred

Please note:
> This contract is a standard ERC20 contract. Therefore it supports all ERC20 functions. Only the ones related to the DAO contract are listed here.