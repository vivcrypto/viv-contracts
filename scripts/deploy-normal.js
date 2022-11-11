const hre = require("hardhat");

async function main() {
    const VivNormal = await hre.ethers.getContractFactory("VivNormal");
    const normal = await VivNormal.deploy();
    await normal.deployed();

    console.log('VivNormal -> deployed to address:', normal.address);
    console.log(process.env.HARDHAT_NETWORK);

    if (process.env.HARDHAT_NETWORK != 'localhost') {
        console.log('Waiting 1m before verify contract\n');
        await new Promise(function (resolve) {
            setTimeout(resolve, 60000);
        });
        console.log('Verifying...\n');

        await hre.run('verify:verify', {
            address: normal.address,
            contract: 'contracts/trades/VivNormal.sol:VivNormal'
        });
    }
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });