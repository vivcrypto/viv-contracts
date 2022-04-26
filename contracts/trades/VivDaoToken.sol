// SPDX-License-Identifier: MIT
// Viv Contracts

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * The ERC20 contract is used to exchange tokens for the DAO contract.
 * The contract is created by the DAO initiator, and minted and distributed to the participants and initiators when the DAO contract is raised.
 */
contract VivDaoToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        address owner
    ) ERC20(name, symbol) {
        transferOwnership(owner);
    }

    function mint(uint256 amount) external onlyOwner {
        super._mint(owner(), amount);
    }
}
