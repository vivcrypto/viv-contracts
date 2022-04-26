const { BN, constants, expectRevert, balance } = require('@openzeppelin/test-helpers');
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const ERC20Mock = artifacts.require('ERC20Mock');
const VivSecurityTransfer = artifacts.require('VivSecurityTransfer');

contract('VivMultiTransfer', function (accounts) {
  const [ sender, spender, other] = accounts;

  const name = 'My Token';
  const symbol = 'MTKN';

  const initialSupply = new BN(200);
  const tradeAmount = new BN(100);

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, sender, initialSupply);
    this.trade = await VivSecurityTransfer.new();
  });

  describe('When the token is zero address', function () {
    describe('balanceOf', function () {
      describe('When the requested account has no eth', function () {
        it('returns zero', async function () {
          expect(await this.trade.balanceOf(ZERO_ADDRESS, sender)).to.be.bignumber.equal('0');
        });
      });

      describe('when the requested account has some eth', function () {
        beforeEach(async function () {
          await this.trade.transferIn(spender, tradeAmount, ZERO_ADDRESS, { from: sender, value: tradeAmount });
        });

        it('returns the total amount of eth', async function () {
          expect(await this.trade.balanceOf(ZERO_ADDRESS, sender)).to.be.bignumber.equal(tradeAmount);
        });
      });
    });

    describe('allowanceOf', function () {
      describe('When the spender account has no allowance', function () {
        it('returns zero', async function () {
          expect(await this.trade.allowanceOf(ZERO_ADDRESS, sender, spender)).to.be.bignumber.equal('0');
        });
      });

      describe('When the spender account has some spender', function () {
        beforeEach(async function () {
          await this.trade.transferIn(spender, tradeAmount, ZERO_ADDRESS, { from: sender, value: tradeAmount });
        });

        it('returns the allowance of eth', async function () {
          expect(await this.trade.allowanceOf(ZERO_ADDRESS, sender, spender)).to.be.bignumber.equal(tradeAmount);
        });
      });
    });

    describe('transferIn', function () {
      describe('When the spender address is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferIn(ZERO_ADDRESS, tradeAmount, ZERO_ADDRESS),
            'VIV0014',
          );
        });
      });

      describe('When the value is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferIn(spender, 0, ZERO_ADDRESS),
            'VIV0001',
          );
        });
      });

      describe('When payable value is not equals to the value', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferIn(spender, tradeAmount, ZERO_ADDRESS, { from: sender, value: 0 }),
            'VIV0002',
          );
        });
      });

      describe('When the sender tranfer some eth to the contract', function () {
        beforeEach(async function () {
          await this.trade.transferIn(spender, tradeAmount, ZERO_ADDRESS, { from: sender, value: tradeAmount });
        });

        it('returns the total amount of eth', async function () {
          expect(await current(this.trade.address)).to.be.bignumber.equal(tradeAmount);
        });
      });
    });

    describe('transferOut', function () {
      beforeEach(async function () {
        await this.trade.transferIn(spender, tradeAmount, ZERO_ADDRESS, { from: sender, value: tradeAmount });
      });

      describe('When the sender address is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferOut(ZERO_ADDRESS, tradeAmount, ZERO_ADDRESS),
            'VIV0030',
          );
        });
      });

      describe('When the value is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferOut(sender, 0, ZERO_ADDRESS),
            'VIV0001',
          );
        });
      });

      describe('When the transfer out value more than the balance', function () {
        const newTradeAmount = tradeAmount.addn(1);
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferOut(sender, newTradeAmount, ZERO_ADDRESS),
            'VIV0003',
          );
        });
      });

      describe('When the transfer out value more than the allowance', function () {
        const newTradeAmount = tradeAmount.addn(1);

        beforeEach(async function () {
          // tranfer for the other account, the balance of sender more than tradeAmount,
          // but the spender is still approve the tradeAmount.
          await this.trade.transferIn(other, tradeAmount, ZERO_ADDRESS, { from: sender, value: tradeAmount });
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.transferOut(sender, newTradeAmount, ZERO_ADDRESS),
            'VIV0004',
          );
        });
      });

      describe('When the spender tranfer out some eth', function () {
        beforeEach(async function () {
          await this.trade.transferOut(sender, tradeAmount, ZERO_ADDRESS, { from: spender });
          // await transaction(this.trade, 'transferOut', 'address,uint256,address',
          //     [sender, tradeAmount, ZERO_ADDRESS], { from: spender, value: 0 });
        });

        it('returns zeros', async function () {
          expect(await current(this.trade.address)).to.be.bignumber.equal(new BN(0));
        });
      });
    });

    describe('cancelTransferIn', function () {
      beforeEach(async function () {
        await this.trade.transferIn(spender, tradeAmount, ZERO_ADDRESS, { from: sender, value: tradeAmount });
      });

      describe('When the spender address is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.cancelTransferIn(ZERO_ADDRESS, tradeAmount, ZERO_ADDRESS),
            'VIV1301',
          );
        });
      });

      describe('When the value is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.cancelTransferIn(spender, 0, ZERO_ADDRESS),
            'VIV0001',
          );
        });
      });

      describe('When cancellation amount more than the balance', function () {
        const newTradeAmount = tradeAmount.addn(1);
        it('reverts', async function () {
          await expectRevert(
            this.trade.cancelTransferIn(spender, newTradeAmount, ZERO_ADDRESS, { from: sender }),
            'VIV0003',
          );
        });
      });

      describe('When cancellation amount more than the allowance', function () {
        const newTradeAmount = tradeAmount.addn(1);

        beforeEach(async function () {
          // tranfer for the other account, the balance of sender more than tradeAmount,
          // but the spender is still approve the tradeAmount.
          await this.trade.transferIn(other, tradeAmount, ZERO_ADDRESS, { from: sender, value: tradeAmount });
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.cancelTransferIn(spender, newTradeAmount, ZERO_ADDRESS, { from: sender }),
            'VIV0004',
          );
        });
      });

      describe('When cancel some eth', function () {
        beforeEach(async function () {
          await this.trade.cancelTransferIn(spender, tradeAmount, ZERO_ADDRESS, { from: sender });
        });

        it('returns zeros', async function () {
          expect(await current(this.trade.address)).to.be.bignumber.equal(new BN(0));
        });
      });
    });
  });

  describe('When the token is erc20 address', function () {
    describe('balanceOf', function () {
      describe('When the requested account has no tokens', function () {
        it('returns zero', async function () {
          expect(await this.trade.balanceOf(this.erc20.address, sender)).to.be.bignumber.equal('0');
        });
      });

      describe('when the requested account has some eth', function () {
        beforeEach(async function () {
          await this.erc20.approveInternal(sender, this.trade.address, tradeAmount);
          await this.trade.transferIn(spender, tradeAmount, this.erc20.address, { from: sender, value: tradeAmount });
        });

        it('returns the total amount of eth', async function () {
          expect(await this.trade.balanceOf(this.erc20.address, sender)).to.be.bignumber.equal(tradeAmount);
        });
      });
    });

    describe('allowanceOf', function () {
      describe('When the spender account has no allowance', function () {
        it('returns zero', async function () {
          expect(await this.trade.allowanceOf(this.erc20.address, sender, spender)).to.be.bignumber.equal('0');
        });
      });

      describe('When the spender account has some spender', function () {
        beforeEach(async function () {
          await this.erc20.approveInternal(sender, this.trade.address, tradeAmount);
          await this.trade.transferIn(spender, tradeAmount, this.erc20.address, { from: sender, value: tradeAmount });
        });

        it('returns the allowance of eth', async function () {
          expect(await this.trade.allowanceOf(this.erc20.address, sender, spender)).to.be.bignumber.equal(tradeAmount);
        });
      });
    });

    describe('transferIn', function () {
      describe('When the spender address is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferIn(ZERO_ADDRESS, tradeAmount, this.erc20.address),
            'VIV0014',
          );
        });
      });

      describe('When the value is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferIn(spender, 0, this.erc20.address),
            'VIV0001',
          );
        });
      });

      describe('When sender does not have enough tokens', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(sender, other, tradeAmount.addn(1));
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.transferIn(spender, tradeAmount, this.erc20.address, { from: sender, value: 0 }),
            'VIV0003',
          );
        });
      });

      describe('When the contract does not have enough allowance', function () {
        const allowance = tradeAmount.subn(1);

        beforeEach(async function () {
          await this.erc20.approveInternal(sender, this.trade.address, allowance);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.transferIn(spender, tradeAmount, this.erc20.address, { from: sender, value: 0 }),
            'VIV0004',
          );
        });
      });

      describe('When the sender tranfer some token to the contract', function () {
        beforeEach(async function () {
          await this.erc20.approveInternal(sender, this.trade.address, tradeAmount);
          await this.trade.transferIn(spender, tradeAmount, this.erc20.address, { from: sender, value: tradeAmount });
        });

        it('returns the total amount of eth', async function () {
          expect(await this.erc20.balanceOf(this.trade.address)).to.be.bignumber.equal(tradeAmount);
        });
      });
    });

    describe('transferOut', function () {
      beforeEach(async function () {
        await this.erc20.approveInternal(sender, this.trade.address, tradeAmount);
        await this.trade.transferIn(spender, tradeAmount, this.erc20.address, { from: sender, value: tradeAmount });
      });

      describe('When the sender address is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferOut(ZERO_ADDRESS, tradeAmount, this.erc20.address),
            'VIV0030',
          );
        });
      });

      describe('When the value is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferOut(sender, 0, this.erc20.address),
            'VIV0001',
          );
        });
      });

      describe('When the transfer out value more than the balance', function () {
        const newTradeAmount = tradeAmount.addn(1);
        it('reverts', async function () {
          await expectRevert(
            this.trade.transferOut(sender, newTradeAmount, this.erc20.address),
            'VIV0003',
          );
        });
      });

      describe('When the transfer out value more than the allowance', function () {
        const newTradeAmount = tradeAmount.addn(1);

        beforeEach(async function () {
          // tranfer for the other account, the balance of sender more than tradeAmount,
          // but the spender is still approve the tradeAmount.
          await this.erc20.approveInternal(sender, this.trade.address, tradeAmount);
          await this.trade.transferIn(other, tradeAmount, this.erc20.address, { from: sender, value: tradeAmount });
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.transferOut(sender, newTradeAmount, this.erc20.address),
            'VIV0004',
          );
        });
      });

      describe('When the spender tranfer out some tokens', function () {
        beforeEach(async function () {
          await this.trade.transferOut(sender, tradeAmount, this.erc20.address, { from: spender });
        });

        it('returns zeros', async function () {
          expect(await this.erc20.balanceOf(this.trade.address)).to.be.bignumber.equal(new BN(0));
        });
      });
    });

    describe('cancelTransferIn', function () {
      beforeEach(async function () {
        await this.erc20.approveInternal(sender, this.trade.address, tradeAmount);
        await this.trade.transferIn(spender, tradeAmount, this.erc20.address, { from: sender, value: tradeAmount });
      });

      describe('When the spender address is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.cancelTransferIn(ZERO_ADDRESS, tradeAmount, this.erc20.address),
            'VIV1301',
          );
        });
      });

      describe('When the value is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.cancelTransferIn(spender, 0, this.erc20.address),
            'VIV0001',
          );
        });
      });

      describe('When cancellation amount more than the balance', function () {
        const newTradeAmount = tradeAmount.addn(1);
        it('reverts', async function () {
          await expectRevert(
            this.trade.cancelTransferIn(spender, newTradeAmount, this.erc20.address, { from: sender }),
            'VIV0003',
          );
        });
      });

      describe('When cancellation amount more than the allowance', function () {
        const newTradeAmount = tradeAmount.addn(1);

        beforeEach(async function () {
          // tranfer for the other account, the balance of sender more than tradeAmount,
          // but the spender is still approve the tradeAmount.
          await this.erc20.approveInternal(sender, this.trade.address, tradeAmount);
          await this.trade.transferIn(other, tradeAmount, this.erc20.address, { from: sender, value: tradeAmount });
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.cancelTransferIn(spender, newTradeAmount, this.erc20.address, { from: sender }),
            'VIV0004',
          );
        });
      });

      describe('When cancel some tokens', function () {
        beforeEach(async function () {
          await this.trade.cancelTransferIn(spender, tradeAmount, this.erc20.address, { from: sender });
        });

        it('returns zeros', async function () {
          expect(await this.erc20.balanceOf(this.trade.address)).to.be.bignumber.equal(new BN(0));
        });
      });
    });
  });
});
