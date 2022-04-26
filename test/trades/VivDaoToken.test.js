const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const VivDaoToken = artifacts.require('VivDaoToken');

contract('VivDaoToken', function (accounts) {
  const [ owner, other ] = accounts;

  const name = 'My Token';
  const symbol = 'MTKN';

  const tradeAmount = new BN(10000);

  beforeEach(async function () {
    this.erc20 = await VivDaoToken.new(name, symbol, owner);
  });

  describe('mint', function () {
    describe('When other mint', function () {
      it('reverts', async function () {
        await expectRevert(
          this.erc20.mint(tradeAmount, { from: other }),
          'Ownable: caller is not the owner',
        );
      });
    });

    describe('When mint some tokens', function () {
      it('return some tokens', async function () {
        expectEvent(
          await this.erc20.mint(tradeAmount, { from: owner }),
          'Transfer',
          { from: ZERO_ADDRESS, to: owner, value: tradeAmount },
        );
      });
    });
  });
});
