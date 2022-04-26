const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  send,
} = require('@openzeppelin/test-helpers');
const assertFailure = require('../helpers/assertFailure');
const { ether, transaction } = send;
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { getSign } = require('../helpers/sign');

const ERC20Mock = artifacts.require('ERC20Mock');
const VivNormal = artifacts.require('VivNormal');

contract('VivNormal', function (accounts) {
  const [seller, buyer, guarantor, platform, other] = accounts;

  const [
    sellerPrivateKey,
    buyerPrivateKey,
    guarantorPrivateKey,
    platformPrivateKey,
  ] = [
    '0xbe4cf486849abc347e947fd76f94f7402a4342b209b9680b02335b7f97bd4e19',
    '0xb32f0ec38fc01c0dc9de03e08249ba52094e2194599c0346184a3fe6d4519112',
    '0x25eac5d15ebbe0c980db0ec0806abfa8022901b0b12a0523d438eb0347cd76ef',
    '0x803f890f213d454efb4e556cd0ef055e1ba04be95b28ecb01ec67b1aa2f3119c',
  ];

  const name = 'My Token';
  const symbol = 'MTKN';

  const tradeAmount = new BN(100000);
  const feeRate = new BN(500);
  const tid = '0x303030303030303030303030303030303030';
  const couponId = '0x303030303030303030303030303030303030';
  const arbitrateFee = new BN(0);
  const couponRate = new BN(0);

  beforeEach(async function () {
    this.erc20 = await ERC20Mock.new(name, symbol, buyer, tradeAmount);
    this.trade = await VivNormal.new();
  });

  describe('purchase', function () {
    describe('When the parameter is invalid', function () {
      describe('When seller is zero address', function () {
        it('reverts', async function () {
          await expectRevert(
            transaction(
              this.trade,
              'purchase',
              'address,address,address,uint256,uint256,bytes,address',
              [
                ZERO_ADDRESS,
                platform,
                guarantor,
                feeRate,
                tradeAmount,
                tid,
                ZERO_ADDRESS,
              ],
              { from: buyer, value: tradeAmount },
            ),
            'VIV5001',
          );
        });
      });

      describe('When platform is zero address', function () {
        it('reverts', async function () {
          await expectRevert(
            transaction(
              this.trade,
              'purchase',
              'address,address,address,uint256,uint256,bytes,address',
              [
                seller,
                ZERO_ADDRESS,
                guarantor,
                feeRate,
                tradeAmount,
                tid,
                ZERO_ADDRESS,
              ],
              { from: buyer, value: tradeAmount },
            ),
            'VIV5002',
          );
        });
      });

      describe('When guarantor is zero address', function () {
        it('reverts', async function () {
          await expectRevert(
            transaction(
              this.trade,
              'purchase',
              'address,address,address,uint256,uint256,bytes,address',
              [
                seller,
                platform,
                ZERO_ADDRESS,
                feeRate,
                tradeAmount,
                tid,
                ZERO_ADDRESS,
              ],
              { from: buyer, value: tradeAmount },
            ),
            'VIV5003',
          );
        });
      });

      describe('When trade amount is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            transaction(
              this.trade,
              'purchase',
              'address,address,address,uint256,uint256,bytes,address',
              [seller, platform, guarantor, feeRate, 0, tid, ZERO_ADDRESS],
              { from: buyer, value: 0 },
            ),
            'VIV0001',
          );
        });
      });
    });

    describe('When transaction id is duplicated', function () {
      beforeEach(async function () {
        await transaction(
          this.trade,
          'purchase',
          'address,address,address,uint256,uint256,bytes,address',
          [
            seller,
            platform,
            guarantor,
            feeRate,
            tradeAmount,
            tid,
            ZERO_ADDRESS,
          ],
          { from: buyer, value: tradeAmount },
        );
      });

      it('reverts', async function () {
        await expectRevert(
          transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          ),
          'VIV5004',
        );
      });
    });

    describe('when the token is zero address', function () {
      const value = tradeAmount.subn(1);

      describe('When trade amount does not equals the value', function () {
        it('reverts', async function () {
          await expectRevert(
            transaction(
              this.trade,
              'purchase',
              'address,address,address,uint256,uint256,bytes,address',
              [
                seller,
                platform,
                guarantor,
                feeRate,
                tradeAmount,
                tid,
                ZERO_ADDRESS,
              ],
              { from: buyer, value: value },
            ),
            'VIV0002',
          );
        });
      });

      describe('When buyer does not have enough balance', function () {
        let newTradeAmount = 0;
        beforeEach(async function () {
          newTradeAmount = await current(buyer);
          await ether(buyer, other, 1);
        });

        it('reverts', async function () {
          await assertFailure(
            transaction(
              this.trade,
              'purchase',
              'address,address,address,uint256,uint256,bytes,address',
              [
                seller,
                platform,
                guarantor,
                feeRate,
                newTradeAmount,
                tid,
                ZERO_ADDRESS,
              ],
              { from: buyer, value: newTradeAmount },
            ),
          );
        });
      });

      describe('When buyer have enough balance', function () {
        it('pay the trade amount', async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          );

          expect(await current(this.trade.address)).to.be.bignumber.equal(
            tradeAmount,
          );
        });
      });
    });

    describe('when the token is erc20 address', function () {
      describe('when the buyer does not have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.transferInternal(buyer, other, 1);
        });

        it('reverts', async function () {
          await expectRevert(
            transaction(
              this.trade,
              'purchase',
              'address,address,address,uint256,uint256,bytes,address',
              [
                seller,
                platform,
                guarantor,
                feeRate,
                tradeAmount,
                tid,
                this.erc20.address,
              ],
              { from: buyer, value: 0 },
            ),
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
            transaction(
              this.trade,
              'purchase',
              'address,address,address,uint256,uint256,bytes,address',
              [
                seller,
                platform,
                guarantor,
                feeRate,
                tradeAmount,
                tid,
                this.erc20.address,
              ],
              { from: buyer, value: 0 },
            ),
            'VIV0004',
          );
        });
      });

      describe('When buyer have enough balance', function () {
        beforeEach(async function () {
          await this.erc20.approveInternal(
            buyer,
            this.trade.address,
            tradeAmount,
          );
        });

        it('pay the trade amount', async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              this.erc20.address,
            ],
            { from: buyer, value: 0 },
          );

          expect(
            await this.erc20.balanceOf(this.trade.address),
          ).to.be.bignumber.equal(tradeAmount);
        });

        it('emits a transfer event', async function () {
          expectEvent.inTransaction(
            await transaction(
              this.trade,
              'purchase',
              'address,address,address,uint256,uint256,bytes,address',
              [
                seller,
                platform,
                guarantor,
                feeRate,
                tradeAmount,
                tid,
                this.erc20.address,
              ],
              { from: buyer, value: 0 },
            ),
            'Transfer',
            { sender: buyer, receiver: this.trade.address, value: tradeAmount },
          );
        });
      });
    });
  });

  describe('withdraw', function () {
    describe('when the token is zero address', function () {
      describe('When the parameter is invalid', function () {
        beforeEach(async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          );
        });

        describe('When the trade is not exists', function () {
          const newTid = '0x303030303030303030303030303030303031';

          it('reverts', async function () {
            await expectRevert(
              transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                [
                  '0x',
                  '0x',
                  '0x',
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  newTid,
                  '0x',
                ],
                { from: seller, value: 0 },
              ),
              'VIV5005',
            );
          });
        });

        describe('When the withdrawal amount is zero', function () {
          it('reverts', async function () {
            await expectRevert(
              transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                ['0x', '0x', '0x', 0, couponRate, arbitrateFee, tid, '0x'],
                { from: seller, value: 0 },
              ),
              'VIV0001',
            );
          });
        });

        describe('When the sender is not buyer or seller', function () {
          it('reverts', async function () {
            await expectRevert(
              transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                [
                  '0x',
                  '0x',
                  '0x',
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  '0x',
                ],
                { from: platform, value: 0 },
              ),
              'VIV5011',
            );
          });
        });
      });

      describe('When the coupon rate is not zero', function () {
        const couponRate = new BN(500);
        const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
        const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        beforeEach('purchase', async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          );
        });

        describe('When the coupon is reused', function () {
          beforeEach('Withdraw as normal and use coupons', async function () {
            await transaction(
              this.trade,
              'withdraw',
              'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
              [
                signedValue1,
                signedValue2,
                signedValue3,
                tradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
              ],
              { from: seller, value: 0 },
            );
          });

          it('reverts', async function () {
            await expectRevert(
              transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                [
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                ],
                { from: seller, value: 0 },
              ),
              'VIV0006',
            );
          });
        });

        describe('When the signedValue3 is wrong', function () {
          // Sign with a non-platform private key
          const signedValue3 = getSign(
            ['uint256', 'bytes', 'bytes'],
            [couponRate, couponId, tid],
            buyerPrivateKey,
          );

          it('reverts', async function () {
            await expectRevert(
              transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                [
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                ],
                { from: seller, value: 0 },
              ),
              'VIV0007',
            );
          });
        });

        describe('when the platform fee is not zero', function () {
          const availableAmount = tradeAmount.sub(arbitrateFee);
          const feeAmount = availableAmount.mul(feeRate).divn(10000);
          const couponAmount = feeAmount.mul(couponRate).divn(10000);
          const finalFeeAmount = feeAmount.sub(couponAmount);

          it('The platform get the service fee after using the coupon', async function () {
            const platformBalance = await current(platform);
            const newBalance = platformBalance.add(finalFeeAmount);
            await transaction(
              this.trade,
              'withdraw',
              'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
              [
                signedValue1,
                signedValue2,
                signedValue3,
                tradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
              ],
              { from: seller, value: 0 },
            );
            expect(await current(platform)).to.be.bignumber.equal(newBalance);
          });
        });

        describe('when the platform fee is zero', function () {
          // use 100% coupon
          const couponRate = new BN(10000);
          const signedValue3 = getSign(
            ['uint256', 'bytes', 'bytes'],
            [couponRate, couponId, tid],
            platformPrivateKey,
          );

          it('The balance of platform is not change', async function () {
            const platformBalance = await current(platform);
            await transaction(
              this.trade,
              'withdraw',
              'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
              [
                signedValue1,
                signedValue2,
                signedValue3,
                tradeAmount,
                couponRate,
                arbitrateFee,
                tid,
                couponId,
              ],
              { from: seller, value: 0 },
            );
            expect(await current(platform)).to.be.bignumber.equal(
              platformBalance,
            );
          });
        });
      });

      describe('When the coupon rate is zero', function () {
        const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
        const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        const availableAmount = tradeAmount.sub(arbitrateFee);
        const feeAmount = availableAmount.mul(feeRate).divn(10000);

        beforeEach('purchase', async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          );
        });

        it('The platform get the full service fee', async function () {
          const platformBalance = await current(platform);
          const newBalance = platformBalance.add(feeAmount);
          await transaction(
            this.trade,
            'withdraw',
            'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
            [
              signedValue1,
              signedValue2,
              signedValue3,
              tradeAmount,
              couponRate,
              0,
              tid,
              couponId,
            ],
            { from: seller, value: 0 },
          );
          expect(await current(platform)).to.be.bignumber.equal(newBalance);
        });
      });

      describe('When arbitrate fee is zero', function () {
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        beforeEach('purchase', async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          );
        });

        describe('When the signedValue1 is wrong', function () {
          //  Not the signature of any one of the seller, buyer and guarantor
          const signedValue1 = getSign(['bytes'], [tid], platformPrivateKey);
          const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);

          it('reverts', async function () {
            await expectRevert(
              transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                [
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                ],
                { from: seller, value: 0 },
              ),
              'VIV5006',
            );
          });
        });

        describe('When the signedValue2 is wrong', function () {
          const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
          //  Not the signature of any one of the seller, buyer and guarantor
          const signedValue2 = getSign(['bytes'], [tid], platformPrivateKey);
          it('reverts', async function () {
            await expectRevert(
              transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                [
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                ],
                { from: seller, value: 0 },
              ),
              'VIV5006',
            );
          });
        });

        describe('When the signedValue1 and signedValue2 is right', function () {
          const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
          const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);

          const availableAmount = tradeAmount.sub(arbitrateFee);
          const feeAmount = availableAmount.mul(feeRate).divn(10000);
          const sellerRecevieAmount = availableAmount.sub(feeAmount);

          it('Normal withdraw', async function () {
            expectEvent.inTransaction(
              await transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                [
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                ],
                { from: seller, value: 0 },
              ),
              'Transfer',
              {
                sender: this.trade.address,
                receiver: seller,
                value: sellerRecevieAmount,
              },
            );
          });
        });
      });

      describe('When arbitrate fee is not zero', function () {
        const arbitrateFee = new BN(100000);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        beforeEach('purchase', async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          );
        });

        describe('When the signedValue1 is wrong', function () {
          //  Not the signature of any one of the seller, buyer and guarantor
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            platformPrivateKey,
          );
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            sellerPrivateKey,
          );

          it('reverts', async function () {
            await expectRevert(
              transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                [
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                ],
                { from: seller, value: 0 },
              ),
              'VIV5006',
            );
          });
        });

        describe('When the signedValue2 is wrong', function () {
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            buyerPrivateKey,
          );
          //  Not the signature of any one of the seller, buyer and guarantor
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            platformPrivateKey,
          );
          it('reverts', async function () {
            await expectRevert(
              transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                [
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                ],
                { from: seller, value: 0 },
              ),
              'VIV5006',
            );
          });
        });

        describe('When the signedValue1 and signedValue2 is right', function () {
          const signedValue1 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            buyerPrivateKey,
          );
          const signedValue2 = getSign(
            ['uint256', 'uint256', 'bytes'],
            [tradeAmount, arbitrateFee, tid],
            sellerPrivateKey,
          );

          const availableAmount = tradeAmount.sub(arbitrateFee);
          const feeAmount = availableAmount.mul(feeRate).divn(10000);
          const sellerRecevieAmount = availableAmount.sub(feeAmount);

          it('Normal withdraw', async function () {
            expectEvent.inTransaction(
              await transaction(
                this.trade,
                'withdraw',
                'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
                [
                  signedValue1,
                  signedValue2,
                  signedValue3,
                  tradeAmount,
                  couponRate,
                  arbitrateFee,
                  tid,
                  couponId,
                ],
                { from: seller, value: 0 },
              ),
              'Transfer',
              {
                sender: this.trade.address,
                receiver: seller,
                value: sellerRecevieAmount,
              },
            );
          });
        });
      });

      describe('When remainder amount is not enough', function () {
        const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
        const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );
        const newTradeAmount = tradeAmount.addn(1);

        beforeEach('purchase', async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          );
        });

        it('reverts', async function () {
          await expectRevert(
            transaction(
              this.trade,
              'withdraw',
              'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
              [
                signedValue1,
                signedValue2,
                signedValue3,
                newTradeAmount,
                couponRate,
                0,
                tid,
                couponId,
              ],
              { from: seller, value: 0 },
            ),
            'VIV5010',
          );
        });
      });

      describe('When withdrawing multiple times', function () {
        const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
        const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        beforeEach('purchase', async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          );
        });

        it('When the seller withdraws multiple times, the platform get multiple service fees', async function () {
          let newTradeAmount = tradeAmount.subn(10000);
          let feeAmount = newTradeAmount.mul(feeRate).divn(10000);
          const platformBalance = await current(platform);
          let newBalance = platformBalance.add(feeAmount);
          await transaction(
            this.trade,
            'withdraw',
            'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
            [
              signedValue1,
              signedValue2,
              signedValue3,
              newTradeAmount,
              couponRate,
              arbitrateFee,
              tid,
              couponId,
            ],
            { from: seller, value: 0 },
          );
          expect(await current(platform)).to.be.bignumber.equal(newBalance);

          newTradeAmount = new BN(10000);
          feeAmount = newTradeAmount.mul(feeRate).divn(10000);
          newBalance = newBalance.add(feeAmount);
          await transaction(
            this.trade,
            'withdraw',
            'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
            [
              signedValue1,
              signedValue2,
              signedValue3,
              newTradeAmount,
              couponRate,
              arbitrateFee,
              tid,
              couponId,
            ],
            { from: seller, value: 0 },
          );
          expect(await current(platform)).to.be.bignumber.equal(newBalance);
        });
      });

      describe('When buyer withraw', function () {
        const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
        const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        beforeEach('purchase', async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          );
        });

        it('When the buyer withdraws, the platform get the service fee', async function () {
          const feeAmount = tradeAmount.mul(feeRate).divn(10000);
          const platformBalance = await current(platform);
          const newBalance = platformBalance.add(feeAmount);
          await transaction(
            this.trade,
            'withdraw',
            'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
            [
              signedValue1,
              signedValue2,
              signedValue3,
              tradeAmount,
              couponRate,
              arbitrateFee,
              tid,
              couponId,
            ],
            { from: buyer, value: 0 },
          );
          expect(await current(platform)).to.be.bignumber.equal(newBalance);
        });
      });

      describe('When guarantor sign', function () {
        const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
        const signedValue2 = getSign(['bytes'], [tid], guarantorPrivateKey);
        const signedValue3 = getSign(
          ['uint256', 'bytes', 'bytes'],
          [couponRate, couponId, tid],
          platformPrivateKey,
        );

        beforeEach('purchase', async function () {
          await transaction(
            this.trade,
            'purchase',
            'address,address,address,uint256,uint256,bytes,address',
            [
              seller,
              platform,
              guarantor,
              feeRate,
              tradeAmount,
              tid,
              ZERO_ADDRESS,
            ],
            { from: buyer, value: tradeAmount },
          );
        });

        it('When the buyer withdraws, the platform get the service fee', async function () {
          const feeAmount = tradeAmount.mul(feeRate).divn(10000);
          const platformBalance = await current(platform);
          const newBalance = platformBalance.add(feeAmount);
          await transaction(
            this.trade,
            'withdraw',
            'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
            [
              signedValue1,
              signedValue2,
              signedValue3,
              tradeAmount,
              couponRate,
              arbitrateFee,
              tid,
              couponId,
            ],
            { from: buyer, value: 0 },
          );
          expect(await current(platform)).to.be.bignumber.equal(newBalance);
        });
      });
    });

    describe('when the token is erc20 address', function () {
      const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
      const signedValue2 = getSign(['bytes'], [tid], guarantorPrivateKey);
      const signedValue3 = getSign(
        ['uint256', 'bytes', 'bytes'],
        [couponRate, couponId, tid],
        platformPrivateKey,
      );

      beforeEach(async function () {
        await this.erc20.approveInternal(
          buyer,
          this.trade.address,
          tradeAmount,
        );

        await transaction(
          this.trade,
          'purchase',
          'address,address,address,uint256,uint256,bytes,address',
          [
            seller,
            platform,
            guarantor,
            feeRate,
            tradeAmount,
            tid,
            this.erc20.address,
          ],
          { from: buyer, value: 0 },
        );
      });

      it('Withdraw ERC20', async function () {
        const feeAmount = tradeAmount.mul(feeRate).divn(10000);
        const platformBalance = await this.erc20.balanceOf(platform);
        const newBalance = platformBalance.add(feeAmount);
        await transaction(
          this.trade,
          'withdraw',
          'bytes,bytes,bytes,uint256,uint256,uint256,bytes,bytes',
          [
            signedValue1,
            signedValue2,
            signedValue3,
            tradeAmount,
            couponRate,
            arbitrateFee,
            tid,
            couponId,
          ],
          { from: buyer, value: 0 },
        );
        expect(await this.erc20.balanceOf(platform)).to.be.bignumber.equal(
          newBalance,
        );
      });
    });
  });
});
