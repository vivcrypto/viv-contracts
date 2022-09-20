const hre = require("hardhat");

async function main() {
    const VivWithdraw = await hre.ethers.getContractFactory("VivWithdraw");
    // 0x77FA223a12029Df5c655B0e8a455d4B542D71C94 is timelock
    const withdraw = await VivWithdraw.deploy("0x77FA223a12029Df5c655B0e8a455d4B542D71C94");
    await withdraw.deployed();

    console.log('VivWithdraw -> deployed to address:', withdraw.address);
    console.log(process.env.HARDHAT_NETWORK);

    if (process.env.HARDHAT_NETWORK != 'localhost') {
        console.log('Waiting 1m before verify contract\n');
        await new Promise(function (resolve) {
            setTimeout(resolve, 60000);
        });
        console.log('Verifying...\n');

        await hre.run('verify:verify', {
            address: withdraw.address,
            constructorArguments: ["0x77FA223a12029Df5c655B0e8a455d4B542D71C94"],
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