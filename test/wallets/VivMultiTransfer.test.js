const { BN, constants, expectEvent, expectRevert, balance } = require('@openzeppelin/test-helpers');
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const ERC20Mock = artifacts.require('ERC20Mock');
const VivMultiTransfer = artifacts.require('VivMultiTransfer');

contract('VivMultiTransfer', function (accounts) {
  const [ owner, account1, account2, account3, other] = accounts;

  const name = 'My Token';
  const symbol = 'MTKN';

  const addresses = [account1, account2, account3];
  const values = [100, 100, 100];
  const tradeAmount = new BN(300);

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, owner, tradeAmount);
    this.trade = await VivMultiTransfer.new();
  });

  describe('multiTransfer', function () {
    describe('When the size of addresses is zero', function () {
      const addresses = [];
      const values = [];

      it('reverts', async function () {
        await expectRevert(
          this.trade.multiTransfer(addresses, values, ZERO_ADDRESS),
          'VIV1201',
        );
      });
    });

    describe('When the size of addresses is not equals to size of values', function () {
      const addresses = [account1, account2, account3];
      const values = [100, 100];

      it('reverts', async function () {
        await expectRevert(
          this.trade.multiTransfer(addresses, values, ZERO_ADDRESS),
          'VIV0029',
        );
      });
    });

    describe('When the token is zero address', function () {
      describe('When payable value is not equals the sum of values', function () {
        const addresses = [account1, account2, account3];
        const values = [100, 100, 100];

        it('reverts', async function () {
          await expectRevert(
            this.trade.multiTransfer(addresses, values, ZERO_ADDRESS),
            'VIV0002',
          );
        });
      });

      describe('When transfer eth', function () {
        it('transfer eth', async function () {
          let exceptBalance = new BN(0);
          let newBalance = new BN(0);
          for (let i = 0; i < addresses.length; i++) {
            const balance = await current(addresses[i]);
            exceptBalance = exceptBalance.add(balance).addn(values[i]);
          }

          await this.trade.multiTransfer(addresses, values, ZERO_ADDRESS, { from: owner, value: 300 });

          for (let i = 0; i < addresses.length; i++) {
            const balance = await current(addresses[i]);
            newBalance = newBalance.add(balance);
          }
          expect(newBalance).to.be.bignumber.equal(exceptBalance);
        });
      });
    });

    describe('When the token is erc20 address', function () {
      describe('when the owner does not have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(owner, other, 1);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.multiTransfer(addresses, values, this.erc20.address, { from: owner, value: 0 }),
            'VIV0003',
          );
        });
      });

      describe('When the contract does not have enough allowance', function () {
        const allowance = tradeAmount.subn(1);

        beforeEach(async function () {
          await this.erc20.approveInternal(owner, this.trade.address, allowance);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.multiTransfer(addresses, values, this.erc20.address, { from: owner, value: 0 }),
            'VIV0004',
          );
        });
      });

      describe('When owner have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.approveInternal(owner, this.trade.address, tradeAmount);
        });

        it('Pay the trade amount', async function () {
          await this.trade.multiTransfer(addresses, values, this.erc20.address, { from: owner, value: 0 });

          expect(await this.erc20.balanceOf(account1)).to.be.bignumber.equal(new BN(100));
          expect(await this.erc20.balanceOf(account2)).to.be.bignumber.equal(new BN(100));
          expect(await this.erc20.balanceOf(account3)).to.be.bignumber.equal(new BN(100));
        });

        it('emits a transfer event', async function () {
          expectEvent(
            await this.trade.multiTransfer(addresses, values, this.erc20.address, { from: owner, value: 0 }),
            'Transfer',
            { sender: owner, receiver: this.trade.address, value: tradeAmount },
          );
        });
      });
    });
  });
});
