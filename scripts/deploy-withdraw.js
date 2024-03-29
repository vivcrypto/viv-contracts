const hre = require("hardhat");

async function main() {
    const TIMELOCK_ADDRESS = '0x8A1eEAAc3b0c97Dcfc4cea98de8B2882b135806e';
    const VivWithdraw = await hre.ethers.getContractFactory("VivWithdraw");
    const withdraw = await VivWithdraw.deploy(TIMELOCK_ADDRESS);
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
            constructorArguments: [TIMELOCK_ADDRESS],
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