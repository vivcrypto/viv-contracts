const hre = require("hardhat");

async function main() {
    const VOTE_ADDRESS = '0x27364607C179b6A293def147F5F25f057Fc1e3ca';
    const TIMELOCK_ADDRESS = '0x8A1eEAAc3b0c97Dcfc4cea98de8B2882b135806e';
    const Governor = await hre.ethers.getContractFactory("VivGovernor");
    // 0xf5522b15f369c3b4FD32c720D5952B2E8c6Ac8d8 is vote
    // 0x77FA223a12029Df5c655B0e8a455d4B542D71C94 is timelock
    const governor = await Governor.deploy(VOTE_ADDRESS, TIMELOCK_ADDRESS, 6575, 46027);
    await governor.deployed();

    console.log('VivGovernor -> deployed to address:', governor.address);
    console.log(process.env.HARDHAT_NETWORK);

    if (process.env.HARDHAT_NETWORK != 'localhost') {
        console.log('Waiting 1m before verify contract\n');
        await new Promise(function (resolve) {
            setTimeout(resolve, 60000);
        });
        console.log('Verifying...\n');

        await hre.run('verify:verify', {
            address: governor.address,
            constructorArguments: [VOTE_ADDRESS, TIMELOCK_ADDRESS, 6575, 46027], 
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