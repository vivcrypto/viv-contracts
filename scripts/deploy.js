const { ethers, upgrades } = require("hardhat");

require('@openzeppelin/hardhat-upgrades');

async function main() {
    const Governor = await ethers.getContractFactory("VivGovernor");
    const governor = await upgrades.deployProxy(Governor);
    await governor.deployed();

    console.log('Governor -> deployed to address:', governor.address);

    if (process.env.NETWORK != 'local') {
        console.log('Waiting 1m before verify contract\n');
        await new Promise(function (resolve) {
            setTimeout(resolve, 60000);
        });
        console.log('Verifying...\n');

        await ethers.run('verify:verify', {
            address: governor.address,
            contract: 'contracts/wallets/VivGovernor.sol:VivGovernor'
        });
    }
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });