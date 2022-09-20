const { ethers, upgrades } = require("hardhat");

async function main() {
    const Governor = await ethers.getContractFactory("VivGovernor");
    // 0xfd17d38d1a0b93F93e49DAC37f3a9848FAc54a16 is vote
    // 0x1f776206ae44940e3Fd598a7008E28c46C8db7Bc is timelock
    const governor = await Governor.deploy("0xfd17d38d1a0b93F93e49DAC37f3a9848FAc54a16", "0x1f776206ae44940e3Fd598a7008E28c46C8db7Bc", 6575, 46027);
    await governor.deployed();

    console.log('Governor -> deployed to address:', governor.address);
    console.log(process.env.HARDHAT_NETWORK);

    if (process.env.HARDHAT_NETWORK != 'localhost') {
        console.log('Waiting 1m before verify contract\n');
        await new Promise(function (resolve) {
            setTimeout(resolve, 60000);
        });
        console.log('Verifying...\n');

        await ethers.run('verify:verify', {
            address: governor.address,
            constructorArguments: ["0xfd17d38d1a0b93F93e49DAC37f3a9848FAc54a16", "0x1f776206ae44940e3Fd598a7008E28c46C8db7Bc", 6575, 46027], 
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