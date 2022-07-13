const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  send,
} = require('@openzeppelin/test-helpers');
const assertFailure = require('../helpers/assertFailure');
const { ether } = send;
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { getSign } = require('../helpers/sign');

const ERC20Mock = artifacts.require('ERC20Mock');
const VivDao = artifacts.require('VivDao');
const VivDaoToken = artifacts.require('VivDaoToken');

contract('VivDao', function (accounts) {
  const [owner, buyer, platform, other] = accounts;

  const [buyerPrivateKey, platformPrivateKey] = [
    '0xb32f0ec38fc01c0dc9de03e08249ba52094e2194599c0346184a3fe6d4519112',
    '0x25eac5d15ebbe0c980db0ec0806abfa8022901b0b12a0523d438eb0347cd76ef',
  ];

  const name = 'My Token';
  const symbol = 'MTKN';

  const tradeAmount = new BN(10000);
  const feeRate = new BN(500);
  const exchange = new BN(10000);
  const reserved = new BN(1000);
  const discount = new BN(1000);

  const tid = '0x303030303030303030303030303030303030';
  const couponId = '0x303030303030303030303030303030303030';
  const couponRate = new BN(0);

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, buyer, tradeAmount);
    this.trade = await VivDao.new(
      ZERO_ADDRESS,
      exchange,
      tradeAmount,
      reserved,
      discount,
      platform,
      feeRate,
      { from: owner },
    );
    this.daoToken = await VivDaoToken.new(name, symbol, this.trade.address);
  });

  describe('constructor', function () {
    describe('When platform is zero address', function () {
      it('reverts', async function () {
        await expectRevert(
          VivDao.new(
            ZERO_ADDRESS,
            exchange,
            tradeAmount,
            reserved,
            discount,
            ZERO_ADDRESS,
            feeRate,
            { from: owner },
          ),
          'VIV5002',
        );
      });
    });

  });

  describe('purchase', function () {
    describe('When trade amount is zero', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.purchase(0, this.daoToken.address, tid, {
            from: buyer,
            value: tradeAmount,
          }),
          'VIV0001',
        );
      });
    });

    describe('When dao token is zero address', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.purchase(tradeAmount, ZERO_ADDRESS, tid, {
            from: buyer,
            value: tradeAmount,
          }),
          'VIV5202',
        );
      });
    });

    describe('When not first purchase and dao token is error', function () {
      beforeEach('purchase', async function () {
        await this.trade.purchase(tradeAmount, this.daoToken.address, '0x', {
          from: buyer,
          value: tradeAmount,
        });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.purchase(tradeAmount, other, tid, {
            from: buyer,
            value: tradeAmount,
          }),
          'VIV0059',
        );
      });
    });

    describe('When the amount raised is exceeded', function () {
      const tradeAmount = new BN(20000);
      it('reverts', async function () {
        await expectRevert(
          this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
            from: buyer,
            value: tradeAmount,
          }),
          'VIV0058',
        );
      });
    });

    describe('When transaction id is duplicated', function () {
      const tradeAmount = new BN(5000);
      beforeEach('purchase', async function () {
        await this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
          from: buyer,
          value: tradeAmount,
        });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
            from: buyer,
            value: tradeAmount,
          }),
          'VIV0060',
        );
      });
    });

    describe('when the token is zero address', function () {
      const value = tradeAmount.subn(1);

      describe('When trade amount does not equals the value', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
              from: buyer,
              value: value,
            }),
            'VIV0002',
          );
        });
      });

      describe('When buyer does not have enough balance', function () {
        let balance;
        beforeEach(async function () {
          balance = await current(buyer);
          await ether(buyer, other, 1);
        });

        it('reverts', async function () {
          await assertFailure(
            this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
              from: buyer,
              value: balance,
            }),
          );
        });
      });

      describe('When buyer have enough balance', function () {
        const exchangeAmount = tradeAmount.mul(exchange);
        const mintAmount = exchangeAmount.sub(
          exchangeAmount.mul(discount).divn(10000),
        );
        const tansferTokenAmount = mintAmount.sub(
          mintAmount.mul(reserved).divn(10000),
        );
        it('pay the trade amount', async function () {
          await this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
            from: buyer,
            value: tradeAmount,
          });
          expect(await current(this.trade.address)).to.be.bignumber.equal(
            tradeAmount,
          );
          expect(await this.daoToken.balanceOf(buyer)).to.be.bignumber.equal(
            tansferTokenAmount,
          );
        });
      });
    });

    describe('when the token is erc20 address', function () {
      beforeEach(async function () {
        this.trade = await VivDao.new(
          this.erc20.address,
          exchange,
          tradeAmount,
          reserved,
          discount,
          platform,
          feeRate,
          { from: owner },
        );
        this.daoToken = await VivDaoToken.new(name, symbol, this.trade.address);
      });

      describe('when the buyer does not have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(buyer, other, 1);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
              from: buyer,
              value: 0,
            }),
            'VIV0003',
          );
        });
      });

      describe('when the buyer does not have enough allowance', function () {
        const allowance = tradeAmount.subn(1);

        beforeEach(async function () {
          await this.erc20.approveInternal(
            buyer,
            this.trade.address,
            allowance,
          );
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
              from: buyer,
              value: 0,
            }),
            'VIV0004',
          );
        });
      });

      describe('When buyer have enough balance', function () {
        const exchangeAmount = tradeAmount.mul(exchange);
        const mintAmount = exchangeAmount.sub(
          exchangeAmount.mul(discount).divn(10000),
        );
        const tansferTokenAmount = mintAmount.sub(
          mintAmount.mul(reserved).divn(10000),
        );

        beforeEach(async function () {
          await this.erc20.approveInternal(
            buyer,
            this.trade.address,
            tradeAmount,
          );
        });

        it('pay the trade amount', async function () {
          await this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
            from: buyer,
            value: 0,
          });
          expect(
            await this.erc20.balanceOf(this.trade.address),
          ).to.be.bignumber.equal(tradeAmount);
          expect(await this.daoToken.balanceOf(buyer)).to.be.bignumber.equal(
            tansferTokenAmount,
          );
        });

        it('emits a transfer event', async function () {
          expectEvent(
            await this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
              from: buyer,
              value: 0,
            }),
            'Transfer',
            { sender: buyer, receiver: this.trade.address, value: tradeAmount },
          );
        });
      });
    });
  });

  describe('withdraw', function () {
    const exchangeAmount = tradeAmount.mul(exchange);
    const mintAmount = exchangeAmount.sub(
      exchangeAmount.mul(discount).divn(10000),
    );
    const daoTokenAmount = mintAmount.mul(reserved).divn(10000);
    const signedValue = getSign(
      ['uint256', 'bytes', 'bytes'],
      [couponRate, couponId, tid],
      platformPrivateKey,
    );

    describe('When the sender is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.withdraw(
            tradeAmount,
            daoTokenAmount,
            signedValue,
            couponRate,
            couponId,
            tid,
            { from: buyer },
          ),
          'Ownable: caller is not the owner',
        );
      });
    });

    describe('when the token is zero address', function () {
      beforeEach('purchase', async function () {
        await this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
          from: buyer,
          value: tradeAmount,
        });
      });

      describe('When withdrawing the raised amount and the DAO amount are 0 at the same time.', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.withdraw(0, 0, signedValue, couponRate, couponId, tid, {
              from: owner,
            }),
            'VIV5203',
          );
        });
      });

      describe('When the contract does not have enough pay token', function () {
        const newTradeAmount = tradeAmount.addn(1);
        it('reverts', async function () {
          await expectRevert(
            this.trade.withdraw(
              newTradeAmount,
              daoTokenAmount,
              signedValue,
              couponRate,
              couponId,
              tid,
              { from: owner },
            ),
            'VIV0061',
          );
        });
      });

      describe('When the contract does not have enough dao token', function () {
        const newDaoTokenAmount = daoTokenAmount.addn(1);
        it('reverts', async function () {
          await expectRevert(
            this.trade.withdraw(
              tradeAmount,
              newDaoTokenAmount,
              signedValue,
              couponRate,
              couponId,
              tid,
              { from: owner },
            ),
            'VIV0062',
          );
        });
      });

      describe('When the coupon rate is not zero', function () {
        const couponRate = new BN(500);
        const signedValue = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        describe('When the coupon is reused', function () {
          const newTradeAmount = tradeAmount.divn(2);

          beforeEach('Withdraw as normal and use coupons', async function () {
            await this.trade.withdraw(
              newTradeAmount,
              0,
              signedValue,
              couponRate,
              couponId,
              tid,
              { from: owner },
            );
          });

          it('reverts', async function () {
            // const current = await this.trade.getCurrent(tid);
            // console.log(current.toString());
            await expectRevert(
              this.trade.withdraw(
                newTradeAmount,
                0,
                signedValue,
                couponRate,
                couponId,
                tid,
                { from: owner },
              ),
              'VIV0006',
            );
          });
        });

        describe('When the signedValue is wrong', function () {
          // Sign with a non-platform private key
          const signedValue = getSign(
            ['uint256', 'bytes', 'bytes'],
            [couponRate, couponId, tid],
            buyerPrivateKey,
          );

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw(
                tradeAmount,
                daoTokenAmount,
                signedValue,
                couponRate,
                couponId,
                tid,
                { from: owner },
              ),
              'VIV0007',
            );
          });
        });

        describe('when the platform fee is not zero', function () {
          const feeAmount = tradeAmount.mul(feeRate).divn(10000);
          const couponAmount = feeAmount.mul(couponRate).divn(10000);
          const finalFeeAmount = feeAmount.sub(couponAmount);

          it('The platform get the service fee after using the coupon', async function () {
            const platformBalance = await current(platform);
            const newBalance = platformBalance.add(finalFeeAmount);
            await this.trade.withdraw(
              tradeAmount,
              daoTokenAmount,
              signedValue,
              couponRate,
              couponId,
              tid,
              { from: owner },
            );
            expect(await current(platform)).to.be.bignumber.equal(newBalance);
          });
        });

        describe('when the platform fee is zero', function () {
          // use 100% coupon
          const couponRate = new BN(10000);
          const signedValue = getSign(
            ['uint256', 'bytes', 'bytes'],
            [couponRate, couponId, tid],
            platformPrivateKey,
          );

          it('The balance of platform is not change', async function () {
            const platformBalance = await current(platform);
            await this.trade.withdraw(
              tradeAmount,
              daoTokenAmount,
              signedValue,
              couponRate,
              couponId,
              tid,
              { from: owner },
            );
            expect(await current(platform)).to.be.bignumber.equal(
              platformBalance,
            );
          });
        });
      });

      describe('When the coupon rate is zero', function () {
        const feeAmount = tradeAmount.mul(feeRate).divn(10000);

        beforeEach('purchase', async function () {
          this.trade = await VivDao.new(
            ZERO_ADDRESS,
            exchange,
            tradeAmount,
            reserved,
            discount,
            platform,
            feeRate,
            { from: owner },
          );
          this.daoToken = await VivDaoToken.new(
            name,
            symbol,
            this.trade.address,
          );
          await this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
            from: buyer,
            value: tradeAmount,
          });
        });

        it('The platform get the full service fee', async function () {
          const platformBalance = await current(platform);
          const newBalance = platformBalance.add(feeAmount);
          await this.trade.withdraw(
            tradeAmount,
            daoTokenAmount,
            signedValue,
            couponRate,
            couponId,
            tid,
            { from: owner },
          );
          expect(await current(platform)).to.be.bignumber.equal(newBalance);
        });
      });
    });

    describe('when the token is erc20 address', function () {
      const signedValue = getSign(
        ['uint256', 'bytes', 'bytes'],
        [couponRate, couponId, tid],
        platformPrivateKey,
      );

      beforeEach(async function () {
        this.trade = await VivDao.new(
          this.erc20.address,
          exchange,
          tradeAmount,
          reserved,
          discount,
          platform,
          feeRate,
          { from: owner },
        );
        this.daoToken = await VivDaoToken.new(name, symbol, this.trade.address);
        await this.erc20.approveInternal(
          buyer,
          this.trade.address,
          tradeAmount,
        );
        await this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
          from: buyer,
          value: tradeAmount,
        });
      });

      it('Withdraw ERC20', async function () {
        const feeAmount = tradeAmount.mul(feeRate).divn(10000);
        const platformBalance = await this.erc20.balanceOf(platform);
        const newBalance = platformBalance.add(feeAmount);
        const feeDaoTkenAmount = daoTokenAmount.mul(feeRate).divn(10000);
        const platformDaoTkenBalance = await this.erc20.balanceOf(platform);
        const newDaoTkenBalance = platformDaoTkenBalance.add(feeDaoTkenAmount);
        await this.trade.withdraw(
          tradeAmount,
          daoTokenAmount,
          signedValue,
          couponRate,
          couponId,
          tid,
          { from: owner },
        );
        expect(await this.erc20.balanceOf(platform)).to.be.bignumber.equal(
          newBalance,
        );
        expect(await this.daoToken.balanceOf(platform)).to.be.bignumber.equal(
          newDaoTkenBalance,
        );
      });
    });
  });

  describe('newRound', function () {
    describe('When the sender is not the owner', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.newRound(tradeAmount, reserved, discount, { from: buyer }),
          'Ownable: caller is not the owner',
        );
      });
    });

    describe('When new round', function () {
      it('new round', async function () {
        const newTradeAmount = new BN(10000);
        const totalTarge = tradeAmount.add(newTradeAmount);
        await this.trade.newRound(newTradeAmount, reserved, discount, {
          from: owner,
        });
        expect(await this.trade.getTotalTarget()).to.be.bignumber.equal(
          totalTarge,
        );
      });
    });
  });

  describe('getTrades', function () {
    describe('When no purchase', function () {
      it('return trades', async function () {
        const result = await this.trade.getTrades();
        expect(result.length).to.be.equal(0);
      });
    });

    describe('When purchased', function () {
      beforeEach('purchase', async function () {
        await this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
          from: buyer,
          value: tradeAmount,
        });
      });

      it('return trades', async function () {
        const result = await this.trade.getTrades();
        expect(result.length).to.be.equal(1);
      });
    });
  });

  describe('getTargets', function () {
    it('return targets', async function () {
      const result = await this.trade.getTargets();
      expect(result.length).to.be.equal(1);
    });
  });

  describe('getTotalTarget', function () {
    it('return total target', async function () {
      expect(await this.trade.getTotalTarget()).to.be.bignumber.equal(
        tradeAmount,
      );
    });
  });

  describe('getTotalFact', function () {
    describe('When no purchase', function () {
      it('return total fact', async function () {
        expect(await this.trade.getTotalFact()).to.be.bignumber.equal(
          new BN(0),
        );
      });
    });

    describe('When purchased', function () {
      beforeEach('purchase', async function () {
        await this.trade.purchase(tradeAmount, this.daoToken.address, tid, {
          from: buyer,
          value: tradeAmount,
        });
      });

      it('return total fact', async function () {
        expect(await this.trade.getTotalFact()).to.be.bignumber.equal(
          tradeAmount,
        );
      });
    });
  });
});
