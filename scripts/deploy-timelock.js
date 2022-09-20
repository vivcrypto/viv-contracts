const hre = require("hardhat");

async function main() {
    const TimelockController = await hre.ethers.getContractFactory("TimelockController");
    const timelock = await TimelockController.deploy(2880, [], []);
    await timelock.deployed();

    console.log('TimelockController -> deployed to address:', timelock.address);
    console.log(process.env.HARDHAT_NETWORK);

    if (process.env.HARDHAT_NETWORK != 'localhost') {
        console.log('Waiting 1m before verify contract\n');
        await new Promise(function (resolve) {
            setTimeout(resolve, 60000);
        });
        console.log('Verifying...\n');

        await hre.run('verify:verify', {
            address: timelock.address,
            constructorArguments: [2880, [], []],
            contract: '@openzeppelin/contracts/governance/TimelockController.sol:TimelockController'
        });
    }
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });