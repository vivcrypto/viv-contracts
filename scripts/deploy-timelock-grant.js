const hre = require("hardhat");

async function main() {

    const TIMELOCK_ADDRESS = '0x8A1eEAAc3b0c97Dcfc4cea98de8B2882b135806e'; 

    const PROPOSER_ROLE = "0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1";
    const EXECUTOR_ROLE = "0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63";
    const TIMELOCK_ADMIN_ROLE = "0x5f58e3a2316349923ce3780f8d587db2d72378aed66a8261c916544fa6846ca5";

    const GOVERNOR = "0x823B7d0B55C07a43771541E83486330eD829B662";
    const EVERYONE = "0x0000000000000000000000000000000000000000";
    const DEPLOYER = "0xACc94b10eD1F3ff6A519db4d94b7f57c753319ce";


    const TimelockController = await hre.ethers.getContractFactory("TimelockController");
    const timelock = await TimelockController.attach(TIMELOCK_ADDRESS);
    // grant PROPOSER_ROLE to Governor
    // await timelock.grantRole(PROPOSER_ROLE, GOVERNOR);
    // grant EXECUTOR_ROLE to Everyone
    // await timelock.grantRole(EXECUTOR_ROLE, EVERYONE);
    // revoke TIMELOCK_ADMIN_ROLE from deploy
    await timelock.revokeRole(TIMELOCK_ADMIN_ROLE, DEPLOYER);

}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });