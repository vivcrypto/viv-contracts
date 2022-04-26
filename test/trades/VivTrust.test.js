const { BN, constants, expectEvent, expectRevert, balance, send, time } = require('@openzeppelin/test-helpers');
const assertFailure = require('../helpers/assertFailure');
const { ether } = send;
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { getSign } = require('../helpers/sign');

const ERC20Mock = artifacts.require('ERC20Mock');
const VivTrustrMock = artifacts.require('VivTrustrMock');

contract('VivTrust', function (accounts) {
  const [ principal, trustee, platform, other ] = accounts;

  const [ trusteePrivateKey, platformPrivateKey] = [
    '0xb32f0ec38fc01c0dc9de03e08249ba52094e2194599c0346184a3fe6d4519112',
    '0x25eac5d15ebbe0c980db0ec0806abfa8022901b0b12a0523d438eb0347cd76ef'];

  const name = 'My Token';
  const symbol = 'MTKN';

  const tradeAmount = new BN(100000);
  const feeRate = new BN(500);
  const tid = '0x303030303030303030303030303030303030';
  const couponId = '0x303030303030303030303030303030303030';
  const couponRate = new BN(0);

  let startDate;
  const intervalDays = 1;
  const intervalAmount = 10000;
  const ONE_DAY_SECONDS = 86400;

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, principal, tradeAmount);
    this.trade = await VivTrustrMock.new();
    startDate = await time.latest();
  });

  describe('purchase', function () {
    describe('When the parameter is invalid', function () {
      describe('When trade amount is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(trustee, platform, startDate, intervalDays,
              intervalAmount, 0, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount }),
            'VIV0001',
          );
        });
      });

      describe('When trustee is zero address', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(ZERO_ADDRESS, platform, startDate, intervalDays,
              intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount }),
            'VIV5801',
          );
        });
      });

      describe('When platform is zero address', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(trustee, ZERO_ADDRESS, startDate, intervalDays,
              intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount }),
            'VIV5002',
          );
        });
      });
    });

    describe('when the token is zero address', function () {
      const value = tradeAmount.subn(1);

      describe('When trade amount does not equals the value', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(trustee, platform, startDate, intervalDays,
              intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: value }),
            'VIV0002',
          );
        });
      });

      describe('When principal does not have enough balance', function () {
        let balance;
        beforeEach(async function () {
          balance = await current(principal);
          await ether(principal, other, 1);
        });

        it('reverts', async function () {
          await assertFailure(
            this.trade.purchase(trustee, platform, startDate, intervalDays,
              intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: balance }),
          );
        });
      });

      describe('When principal have enough balance', function () {
        it('pay the trade amount', async function () {
          await this.trade.purchase(trustee, platform, startDate, intervalDays,
            intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });

          expect(await current(this.trade.address)).to.be.bignumber.equal(tradeAmount);
        });
      });
    });

    describe('when the token is erc20 address', function () {
      describe('when the principal does not have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(principal, other, 1);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(trustee, platform, startDate, intervalDays,
              intervalAmount, tradeAmount, tid, this.erc20.address, feeRate, { from: principal, value: 0 }),
            'VIV0003',
          );
        });
      });

      describe('when the principal does not have enough allowance', function () {
        const allowance = tradeAmount.subn(1);

        beforeEach(async function () {
          await this.erc20.approveInternal(principal, this.trade.address, allowance);
        });

        it('reverts', async function () {
          await expectRevert(
            this.trade.purchase(trustee, platform, startDate, intervalDays,
              intervalAmount, tradeAmount, tid, this.erc20.address, feeRate, { from: principal, value: 0 }),
            'VIV0004',
          );
        });
      });

      describe('When principal have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.approveInternal(principal, this.trade.address, tradeAmount);
        });

        it('pay the trade amount', async function () {
          await this.trade.purchase(trustee, platform, startDate, intervalDays,
            intervalAmount, tradeAmount, tid, this.erc20.address, feeRate, { from: principal, value: 0 });

          expect(await this.erc20.balanceOf(this.trade.address)).to.be.bignumber.equal(tradeAmount);
        });

        it('emits a transfer event', async function () {
          expectEvent(
            await this.trade.purchase(trustee, platform, startDate, intervalDays,
              intervalAmount, tradeAmount, tid, this.erc20.address, feeRate, { from: principal, value: 0 }),
            'Transfer',
            { sender: principal, receiver: this.trade.address, value: tradeAmount },
          );
        });
      });
    });

    describe('When multiple payments', function () {
      beforeEach(async function () {
        await this.trade.purchase(trustee, platform, startDate, intervalDays,
          intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
      });

      it('pay the trade amount', async function () {
        await this.trade.purchase(ZERO_ADDRESS, ZERO_ADDRESS, startDate,
          intervalDays, intervalAmount, tradeAmount,
          tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });

        expect(await current(this.trade.address)).to.be.bignumber.equal(tradeAmount.muln(2));
      });
    });
  });

  describe('withdraw', function () {
    const withdrawAmount = new BN(10000);
    describe('when the token is zero address', function () {
      describe('When the parameter is invalid', function () {
        beforeEach(async function () {
          await this.trade.purchase(trustee, platform, startDate, intervalDays,
            intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
        });

        describe('When the trade is not exists', function () {
          const newTid = '0x303030303030303030303030303030303031';

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw('0x', withdrawAmount, couponRate, newTid, couponId, { from: trustee, value: 0 }),
              'VIV5005',
            );
          });
        });

        describe('When the withdrawal amount is zero', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw('0x', 0, couponRate, tid, couponId, { from: trustee, value: 0 }),
              'VIV0001',
            );
          });
        });

        describe('When the sender is not principal or trustee', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw('0x', withdrawAmount, couponRate, tid, couponId, { from: platform, value: 0 }),
              'VIV5802',
            );
          });
        });
      });

      describe('When the coupon rate is not zero', function () {
        const couponRate = new BN(500);
        const signedValue = getSign(['uint256', 'bytes', 'bytes'], [couponRate, couponId, tid], platformPrivateKey);

        beforeEach('purchase', async function () {
          await this.trade.purchase(trustee, platform, startDate, intervalDays,
            intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
        });

        describe('When the coupon is reused', function () {
          beforeEach('Withdraw as normal and use coupons', async function () {
            await this.trade.withdraw(
              signedValue,
              withdrawAmount,
              couponRate,
              tid,
              couponId,
              { from: trustee, value: 0 },
            );
          });

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw(signedValue, withdrawAmount, couponRate, tid, couponId, { from: trustee, value: 0 }),
              'VIV0006',
            );
          });
        });

        describe('When the signedValue is wrong', function () {
          // Sign with a non-platform private key
          const signedValue = getSign(['uint256', 'bytes', 'bytes'], [couponRate, couponId, tid], trusteePrivateKey);

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw(signedValue, withdrawAmount, couponRate, tid, couponId, { from: trustee, value: 0 }),
              'VIV0007',
            );
          });
        });

        describe('when the platform fee is not zero', function () {
          const feeAmount = withdrawAmount.mul(feeRate).divn(10000);
          const couponAmount = feeAmount.mul(couponRate).divn(10000);
          const finalFeeAmount = feeAmount.sub(couponAmount);

          it('The platform get the service fee after using the coupon', async function () {
            const platformBalance = await current(platform);
            const newBalance = platformBalance.add(finalFeeAmount);
            await this.trade.withdraw(
              signedValue,
              withdrawAmount,
              couponRate,
              tid,
              couponId,
              { from: trustee, value: 0 },
            );
            expect(await current(platform)).to.be.bignumber.equal(newBalance);
          });
        });

        describe('when the platform fee is zero', function () {
          // use 100% coupon
          const couponRate = new BN(10000);
          const signedValue = getSign(['uint256', 'bytes', 'bytes'], [couponRate, couponId, tid], platformPrivateKey);

          it('The balance of platform is not change', async function () {
            const platformBalance = await current(platform);
            await this.trade.withdraw(
              signedValue,
              withdrawAmount,
              couponRate,
              tid,
              couponId,
              { from: trustee, value: 0 },
            );
            expect(await current(platform)).to.be.bignumber.equal(platformBalance);
          });
        });
      });

      describe('When the coupon rate is zero', function () {
        const signedValue = getSign(['uint256', 'bytes', 'bytes'], [couponRate, couponId, tid], platformPrivateKey);
        const feeAmount = withdrawAmount.mul(feeRate).divn(10000);

        beforeEach('purchase', async function () {
          await this.trade.purchase(trustee, platform, startDate, intervalDays,
            intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
        });

        it('The platform get the full service fee', async function () {
          const platformBalance = await current(platform);
          const newBalance = platformBalance.add(feeAmount);
          await this.trade.withdraw(
            signedValue,
            withdrawAmount,
            couponRate,
            tid,
            couponId,
            { from: trustee, value: 0 },
          );
          expect(await current(platform)).to.be.bignumber.equal(newBalance);
        });
      });

      describe('When the principal pays, the trustee withdraws', function () {
        const signedValue = getSign(['uint256', 'bytes', 'bytes'], [couponRate, couponId, tid], platformPrivateKey);

        describe('When the withdrawal amount exceeds the amount that can be withdrawn', function () {
          const newWithdrawAmount = withdrawAmount.addn(1);

          beforeEach('purchase', async function () {
            await this.trade.purchase(trustee, platform, startDate, intervalDays,
              intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
          });

          it('reverts', async function () {
            await expectRevert(
              this.trade.withdraw(
                signedValue,
                newWithdrawAmount,
                couponRate,
                tid,
                couponId,
                { from: trustee, value: 0 },
              ),
              'VIV5405',
            );
          });
        });

        describe('When unlocking a period and withdrawing', function () {
          describe('When the trustee withdraws normally', function () {
            const feeAmount = withdrawAmount.mul(feeRate).divn(10000);
            const trusteeRecevieAmount = withdrawAmount.sub(feeAmount);

            beforeEach('purchase', async function () {
              await this.trade.purchase(trustee, platform, startDate, intervalDays,
                intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
            });

            it('Normal withdraw', async function () {
              expectEvent(
                await this.trade.withdraw(
                  signedValue,
                  withdrawAmount,
                  couponRate,
                  tid,
                  couponId,
                  { from: trustee, value: 0 },
                ),
                'Transfer',
                {
                  sender: this.trade.address,
                  receiver: trustee,
                  value: trusteeRecevieAmount,
                },
              );
            });
          });

          describe('When withdrawing multiple times', function () {
            beforeEach('purchase', async function () {
              await this.trade.purchase(trustee, platform, startDate, intervalDays,
                intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
            });

            it('When the trustee withdraws multiple times, the platform get multiple service fees', async function () {
              let newTradeAmount = withdrawAmount.subn(1000);
              let feeAmount = newTradeAmount.mul(feeRate).divn(10000);
              const platformBalance = await current(platform);
              let newBalance = platformBalance.add(feeAmount);
              await this.trade.withdraw(
                signedValue,
                newTradeAmount,
                couponRate,
                tid,
                couponId,
                { from: trustee, value: 0 },
              );
              expect(await current(platform)).to.be.bignumber.equal(newBalance);

              newTradeAmount = new BN(1000);
              feeAmount = newTradeAmount.mul(feeRate).divn(10000);
              newBalance = newBalance.add(feeAmount);
              await this.trade.withdraw(
                signedValue,
                newTradeAmount,
                couponRate,
                tid,
                couponId,
                { from: trustee, value: 0 },
              );
              expect(await current(platform)).to.be.bignumber.equal(newBalance);
            });
          });
        });

        describe('When one-time withdrawal when unlocked for multiple periods', function () {
          // first lock amount: 10000, second lock amount: 10000, total lock amount: 20000
          const withdrawAmount = new BN(20000);

          describe('When two phases have been unlocked', function () {
            beforeEach('purchase', async function () {
              await this.trade.purchase(trustee, platform, startDate, intervalDays,
                intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
            });

            it('When the buyer withdraws, the platform get the service fee', async function () {
              const feeAmount = withdrawAmount.mul(feeRate).divn(10000);
              const platformBalance = await current(platform);
              const newBalance = platformBalance.add(feeAmount);
              await this.trade.withdrawInternal(signedValue, withdrawAmount, couponRate,
                tid, couponId, startDate.addn(ONE_DAY_SECONDS), { from: trustee, value: 0 });
              expect(await current(platform)).to.be.bignumber.equal(newBalance);
            });
          });

          describe('When it is unlocked, it cannot be withdrawn', function () {
            beforeEach('purchase', async function () {
              await this.trade.purchase(trustee, platform, startDate, intervalDays,
                intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
            });

            it('reverts', async function () {
              await expectRevert(
                this.trade.withdraw(
                  signedValue,
                  withdrawAmount,
                  couponRate,
                  tid,
                  couponId,
                  { from: trustee, value: 0 },
                ),
                'VIV5405',
              );
            });
          });
        });
      });

      describe('When the principal withdraws', function () {
        const signedValue = getSign(['uint256', 'bytes', 'bytes'], [couponRate, couponId, tid], platformPrivateKey);

        beforeEach('purchase', async function () {
          await this.trade.purchase(trustee, platform, startDate, intervalDays,
            intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
        });

        describe('When the principal withdraws the remaining amount', function () {
          describe('When the withdrawal amount exceeds the amount that can be withdrawn', function () {
            const newTradeAmount = tradeAmount.addn(1);

            it('reverts', async function () {
              await expectRevert(
                this.trade.withdraw(
                  signedValue,
                  newTradeAmount,
                  couponRate,
                  tid,
                  couponId,
                  { from: principal, value: 0 },
                ),
                'VIV5405',
              );
            });
          });

          describe('When the trustee has not withdrawn', function () {
            it('When the principal withdraws, the platform get the service fee', async function () {
              const feeAmount = tradeAmount.mul(feeRate).divn(10000);
              const platformBalance = await current(platform);
              const newBalance = platformBalance.add(feeAmount);
              await this.trade.withdraw(
                signedValue,
                tradeAmount,
                couponRate,
                tid,
                couponId,
                { from: principal, value: 0 },
              );
              expect(await current(platform)).to.be.bignumber.equal(newBalance);
            });
          });

          describe('When the trustee has already withdrawn', function () {
            beforeEach('The trustee withdraws', async function () {
              await this.trade.withdraw(
                signedValue,
                withdrawAmount,
                couponRate,
                tid,
                couponId,
                { from: principal, value: 0 },
              );
            });

            it('When the principal withdraws, the platform get the service fee', async function () {
              const remainderAmount = tradeAmount.sub(withdrawAmount);
              const feeAmount = remainderAmount.mul(feeRate).divn(10000);
              const platformBalance = await current(platform);
              const newBalance = platformBalance.add(feeAmount);
              await this.trade.withdraw(
                signedValue,
                remainderAmount,
                couponRate,
                tid,
                couponId,
                { from: principal, value: 0 },
              );
              expect(await current(platform)).to.be.bignumber.equal(newBalance);
            });
          });
        });
      });
    });

    describe('When the token is erc20 address', function () {
      const signedValue = getSign(['uint256', 'bytes', 'bytes'], [couponRate, couponId, tid], platformPrivateKey);

      beforeEach(async function () {
        await this.erc20.approveInternal(principal, this.trade.address, tradeAmount);
        await this.trade.purchase(trustee, platform, startDate, intervalDays,
          intervalAmount, tradeAmount, tid, this.erc20.address, feeRate, { from: principal, value: tradeAmount });
      });

      it('Withdraw ERC20', async function () {
        const feeAmount = withdrawAmount.mul(feeRate).divn(10000);
        const platformBalance = await this.erc20.balanceOf(platform);
        const newBalance = platformBalance.add(feeAmount);
        await this.trade.withdraw(
          signedValue,
          withdrawAmount,
          couponRate,
          tid,
          couponId,
          { from: trustee, value: 0 },
        );
        expect(await this.erc20.balanceOf(platform)).to.be.bignumber.equal(newBalance);
      });
    });
  });

  describe('setProject', function () {
    describe('When the sender is not the principal', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.setProject(startDate, intervalDays, intervalAmount, tid, { from: trustee, value: 0 }),
          'VIV5804',
        );
      });
    });

    describe('When the start date is less than the original date', function () {
      beforeEach(async function () {
        await this.trade.purchase(trustee, platform, startDate, intervalDays,
          intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
      });

      it('reverts', async function () {
        await expectRevert(
          this.trade.setProject(
            startDate.subn(ONE_DAY_SECONDS),
            intervalDays,
            intervalAmount,
            tid,
            { from: principal, value: 0 },
          ),
          'VIV5805',
        );
      });
    });
  });

  describe('getProject', function () {
    const getValue = ({
      0: token,
      1: value,
      2: startDate,
      3: intervalDays,
      4: intervalAmount,
    }) => ({
      0: token,
      1: value.toString(),
      2: startDate.toString(),
      3: intervalDays.toString(),
      4: intervalAmount.toString(),
    });
    beforeEach(async function () {
      await this.trade.purchase(trustee, platform, startDate, intervalDays,
        intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
    });

    it('return project', async function () {
      const actual = getValue(await this.trade.getProject(tid));
      const expected = getValue({ 0: ZERO_ADDRESS, 1: tradeAmount, 2: startDate, 3: intervalDays, 4: intervalAmount });
      expect(actual).to.be.deep.equal(expected);
    });
  });

  describe('getAmount', function () {
    const getValue = ({
      0: value,
      1: remainderAmount,
      2: principalWithdrawed,
      3: trusteeWithdrawed,
      4: currentWithdrawed,
      5: canWithdraw,
    }) => ({
      0: value.toString(),
      1: remainderAmount.toString(),
      2: principalWithdrawed.toString(),
      3: trusteeWithdrawed.toString(),
      4: currentWithdrawed.toString(),
      5: canWithdraw.toString(),
    });
    beforeEach(async function () {
      await this.trade.purchase(trustee, platform, startDate, intervalDays,
        intervalAmount, tradeAmount, tid, ZERO_ADDRESS, feeRate, { from: principal, value: tradeAmount });
    });

    it('return project', async function () {
      const actual = getValue(await this.trade.getAmountInternal(tid, startDate.addn(ONE_DAY_SECONDS)));
      const expected = getValue({
        0: tradeAmount,
        1: tradeAmount,
        2: new BN(0),
        3: new BN(0),
        4: new BN(0),
        5: new BN(20000),
      });
      expect(actual).to.be.deep.equal(expected);
    });
  });
});
