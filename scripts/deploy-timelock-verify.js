const hre = require("hardhat");

async function main() {
    await hre.run('verify:verify', {
        address: '0x8A1eEAAc3b0c97Dcfc4cea98de8B2882b135806e',
        constructorArguments: [2880, [], []],
        contract: '@openzeppelin/contracts/governance/TimelockController.sol:TimelockController'
    });
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });