const { ethers, upgrades } = require("hardhat");

async function main() {
    const VivWithdraw = await ethers.getContractFactory("VivWithdraw");
    // 0x1f776206ae44940e3Fd598a7008E28c46C8db7Bc is timelock
    const withdraw = await VivWithdraw.deploy("0x1f776206ae44940e3Fd598a7008E28c46C8db7Bc");
    await withdraw.deployed();

    console.log('Governor -> deployed to address:', withdraw.address);
    console.log(process.env.HARDHAT_NETWORK);

    if (process.env.HARDHAT_NETWORK != 'localhost') {
        console.log('Waiting 1m before verify contract\n');
        await new Promise(function (resolve) {
            setTimeout(resolve, 60000);
        });
        console.log('Verifying...\n');

        await ethers.run('verify:verify', {
            address: withdraw.address,
            constructorArguments: ["0x1f776206ae44940e3Fd598a7008E28c46C8db7Bc"],
            contract: 'contracts/wallets/VivWithdraw.sol:VivWithdraw'
        });
    }
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });