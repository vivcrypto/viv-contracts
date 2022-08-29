Multi-signature contracts are used in the situation wherethat several people manage a fund simultaneously. Only when a certain, predetermined number of people confirm a scenariostransfer can the transfer go through. At the same time, in multi-signature contracts, the number of people required to confirm a transaction and the number of members can be changed, and these changes also need to be approved by a predetermined number of people.

### Transaction scenarios

#### Multiple parties confirm to transfer
For example, there are four members, A, B, C and D, in the contract, and if any three of the four members confirm, the transfer can be completed. If A wants to transfer to Z, the process will be as following: 
1) A creates the contract and appoint A, B, C and D as members; and set the “threshold number” of members at 3. The set-up of the contract is one-time action, and the contract can be used multiple times after that.
2) A transfers an amount into the contract and this fund is going to be transferred to others later.
3) A calls the “execute” function of the contract to initiate a transfer to Z. (Please note that since A is the initiator of the transfer, A has already confirmed the transfer by default. So only two members’ confirmation is needed. Also, the initiator does not have to be A. Any member can be the initiator of a transfer.)
4) Any two of B, C, D call the “confirm” function to confirm the transfer. Before the “3 parties” threshold is reached, the contract will only record the number of members who have confirmed the transfer. If the threshold is reached, the transfer will be conducted.

#### Multiple parties to confirm to add a new member
Let’s say there are A, B, C and D, four members in the contract, and the threshold number is three. (Any three of the four parties can confirm a transfer.) Now member E will be added, and the process is as following.
1) A calls the “addOwner” function of the contract to add in member E. (The initiator does not have to be A. Any member can be the initiator. But the member to be added could not be an existing member in the contract.)
2) Any two of B, C and D call the “addOwner” function to confirm. (Please note that the confirmation is also done by the “addOwner” function. Whether it is a “confirm” or an “initiate” is distinguished by the “data” parameter. If “data” does not exist, it is an “initiate” action; otherwise it is a “confirm.”)
When 3 members have confirmed, E is successfully added. For the later transactions, any three of A, B, C, D and E can confirm to execute.

#### Multiple parties to confirm to delete a member
Let’s say there are A, B, C and D, four members in the contract, and the threshold number is three. (Any three of the four parties can confirm a transfer.) Now member D will be deleted, and the process is as the following:

1) A calls the “removeOwner” function of the contract to remove member D. (The initiator does not have to be A. Any member can be the initiator. But the number of members left after the removal must be no less than the threshold number. And the removed person must be a member in the first place.)

2) Any two of B, C and D call the “removeOwner” function to confirm. (Please note that they also confirm by the “removeOwner” function. Whether it is a “confirm” or an “initiate” is distinguished by the “data” parameter. If “data” does not exist, it is an “initiate” action; otherwise it is a “confirm.”)
When 3 members have confirmed, D is successfully removed. For the later transactions, all three members left need to confirm to execute.

#### Multiple parties to confirm to replace a member
Let’s say there are A, B, C and D, four members in the contract, and the threshold number is three. (Any three of the four parties can confirm a transfer.) Now member D will be replaced by E, and the process is as the following:

1) A calls the “changeOwner” function of the contract to replace D with E. (The initiator does not have to be A. Any member can be the initiator. But the member to be replaced must be an existing member in the contract; and the new member to be added cannot be an existing member.)

Any two of B, C and D call the “changeOwner” function to confirm. (Please note that the confirmation is also done by the “changeOwner” function. Whether it is a “confirm” or an “initiate” is distinguished by the “data” parameter. If “data” does not exist, it is an “initiate” action; otherwise it is a “confirm.”)
When 3 members have confirmed, D is successfully replaced. For the later transactions, any three of A, B, C and E can confirm to execute.

#### Multiple parties to confirm to change the threshold number
Let’s say there are A, B, C and D, four members in the contract, and the threshold number is three. (Any three of the four parties can confirm a transfer.) Now they want to change threshold number from 3 to 2, and the process is as the following:

1) A calls the “changeRequirement” function of the contract to change the threshold number. (The initiator does not have to be A. Any member can be the initiator. The new threshold number cannot be same as the original threshold number; and it cannot be bigger than the member number.)

Any two of B, C and D call the “changeRequirement” function to confirm. (Please note that the confirmation is also done by the “changeRequirement” function. Whether it is a “confirm” or an “initiate” is distinguished by the “data” parameter. If “data” does not exist, it is an “initiate” action; otherwise it is a “confirm.”)
When 3 members have confirmed, the threshold number is changed successfully. For the later transactions, any two of A, B, C and D can confirm to execute.

Please note:

1) If there are ongoing transactions, and at the same time, one of the following actions: add member, delete member, change member, change threshold number, is conducted, and the threshold number to confirm is reached. Then all the ongoing transactions will be canceled.
2) Similarly, if one of the four actions (add member; delete member; change member; change threshold number) is conducted and the threshold number is reached first, then the rest of these actions that are ongoing will all be canceled.

### On contracts
Contracts are created by individuals. The token types supported are ETH and ERC 20 tokens.

#### To create contracts

Parameters

- address[] memory owners: to appoint the members of the multi-signature contract

- uint256 threshold: to set the threshold number

- uint256daylimit: the daily limit for transfer amount. When the transfer amount a day is not higher than this parameter, multi-signature is not needed. When it is higher than this parameter, transfers need to be multi-signed to be executed. If this parameter is set to be 0, any transfer amount needs to be multi-signed.


Please note:
1) threshold number cannot be more than the number of members
2) threshold number must more than 1.
