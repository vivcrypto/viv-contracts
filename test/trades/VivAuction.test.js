const {
  BN,
  constants,
  expectEvent,
  expectRevert,
  balance,
  time,
} = require('@openzeppelin/test-helpers');
const { current } = balance;
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { getSign } = require('../helpers/sign');

const ERC20Mock = artifacts.require('ERC20Mock');
const VivAuction = artifacts.require('VivAuctionMock');

contract('VivAuction', function (accounts) {
  const [publisher, bidder, guarantee, bidder2] = accounts;

  const [bidderPrivateKey, guaranteePrivateKey, bidder2PrivateKey] = [
    '0xb32f0ec38fc01c0dc9de03e08249ba52094e2194599c0346184a3fe6d4519112',
    '0x25eac5d15ebbe0c980db0ec0806abfa8022901b0b12a0523d438eb0347cd76ef',
    '0x803f890f213d454efb4e556cd0ef055e1ba04be95b28ecb01ec67b1aa2f3119c',
  ];

  const name = 'My Token';
  const symbol = 'MTKN';

  const tradeAmount = new BN(100000);
  const startPrice = new BN(20);
  const range = new BN(10);
  const signHex = '0x303030303030303030303030303030303030';
  const couponId = '0x303030303030303030303030303030303030';
  const feeRate = new BN(500);
  let blockTime;

  beforeEach(async function () {
    this.erc20Bidder1 = await ERC20Mock.new(name, symbol, bidder, tradeAmount);
    this.erc20Bidder2 = await ERC20Mock.new(
      name,
      symbol,
      bidder2,
      tradeAmount,
    );
    this.trade = await VivAuction.new();
    blockTime = await time.latest();
  });

  describe('publish', function () {
    describe('When the parameter is invalid', function () {
      describe('When guarantee is zero address', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.publish(
              ZERO_ADDRESS,
              signHex,
              blockTime,
              startPrice,
              range,
              feeRate,
            ),
            'VIV0045',
          );
        });
      });

      describe('When endTime value is zero', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.publish(
              guarantee,
              signHex,
              0,
              startPrice,
              range,
              feeRate,
            ),
            'VIV0046',
          );
        });
      });

      describe('When range value is zero', function () {
        it('reverts', async function () {
          const endTime = blockTime.addn(10);
          await expectRevert(
            this.trade.publish(
              guarantee,
              signHex,
              endTime,
              startPrice,
              0,
              feeRate,
            ),
            'VIV0047',
          );
        });
      });
    });
  });

  describe('bidding', function () {
    let id;
    beforeEach(async function () {
      const endTime = blockTime.addn(10);
      const receipt = await this.trade.publish(
        guarantee,
        signHex,
        endTime,
        startPrice,
        range,
        feeRate,
      );
      id = receipt.logs.find(({ event }) => event === 'VivReturnId').args.id;
    });

    describe('When auction is not end', function () {
      describe('When the parameter is invalid', function () {
        describe('When id value is zero', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.bidding(0, { from: bidder, value: startPrice }),
              'VIV0048',
            );
          });
        });

        describe('When bid amount less then StartPrice', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.bidding(id, {
                from: bidder,
                value: startPrice.subn(1),
              }),
              'VIV0050',
            );
          });
        });

        describe('When bid amount not multiple of Range', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.bidding(id, {
                from: bidder,
                value: startPrice.add(range).subn(1),
              }),
              'VIV0049',
            );
          });
        });

        describe('When bid amount less then top price', function () {
          beforeEach(async function () {
            await this.trade.bidding(id, {
              from: bidder,
              value: startPrice.add(range.muln(2)),
            });
          });
          it('reverts', async function () {
            await expectRevert(
              this.trade.bidding(id, {
                from: bidder2,
                value: startPrice.add(range),
              }),
              'VIV0051',
            );
          });
        });
      });
    });

    describe('When auction is end', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.biddingInternal(id, blockTime.addn(10), {
            from: bidder,
            value: startPrice,
          }),
          'VIV0048',
        );
      });
    });
  });

  describe('endAuction', function () {
    let id;
    beforeEach(async function () {
      const endTime = blockTime.addn(10);
      const { receipt } = await this.trade.publish(
        guarantee,
        signHex,
        endTime,
        startPrice,
        range,
        feeRate,
      );
      id = receipt.logs.find(({ event }) => event === 'VivReturnId').args.id;
    });

    describe('When auction is not end', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.endAuctionInternal(id, blockTime.subn(10)),
          'VIV0052',
        );
      });
    });

    describe('When auction is end', function () {
      describe('When auction no biding', function () {
        it('contract amount is zero', async function () {
          await this.trade.endAuction(0);
          expect(await current(this.trade.address)).to.be.bignumber.equal(
            new BN(0),
          );
        });
      });

      describe('When auction has bidding', function () {
        beforeEach(async function () {
          this.trade.bidding(id, { from: bidder, value: startPrice });
        });

        describe('When bidding one time', function () {
          it('no amount to refund', async function () {
            await this.trade.endAuctionInternal(id, blockTime.addn(10));
            expect(await current(this.trade.address)).to.be.bignumber.equal(
              startPrice,
            );
          });
        });

        describe('When bidding two and more times', function () {
          beforeEach(async function () {
            this.trade.bidding(id, {
              from: bidder2,
              value: startPrice.add(range),
            });
          });

          describe('When first calling EndAuction ', function () {
            it('refund amount to loser', async function () {
              expectEvent(
                await this.trade.endAuctionInternal(id, blockTime.addn(10)),
                'Transfer',
                { from: this.trade.address, to: bidder, value: startPrice },
              );

              expect(await current(this.trade.address)).to.be.bignumber.equal(
                startPrice.add(range),
              );
            });
          });
          describe('When repeat calling EndAuction ', function () {
            beforeEach(async function () {
              await this.trade.endAuctionInternal(id, blockTime.addn(10));
            });
            it('contract amount no change', async function () {
              expect(await current(this.trade.address)).to.be.bignumber.equal(
                startPrice.add(range),
              );
            });
          });
        });
      });
    });
  });

  describe('refund', function () {
    let id;
    beforeEach(async function () {
      const endTime = blockTime.addn(10);
      const { receipt } = await this.trade.publish(
        guarantee,
        signHex,
        endTime,
        startPrice,
        range,
        feeRate,
      );
      id = receipt.logs.find(({ event }) => event === 'VivReturnId').args.id;
      await this.trade.bidding(id, { from: bidder, value: startPrice });
    });

    describe('When the parameter is invalid', function () {
      describe('When id value is zero', function () {
        it('reverts', async function () {
          await expectRevert(this.trade.refund(0, { from: bidder }), 'VIV0054');
        });
      });
    });

    describe('When msg.sender is top bidder', function () {
      it('reverts', async function () {
        await expectRevert(this.trade.refund(id, { from: bidder }), 'VIV0053');
      });
    });

    describe('When msg.sender is not top bidder', function () {
      describe('When msg.sender never bidding', function () {
        it('reverts', async function () {
          await expectRevert(
            this.trade.refund(id, { from: bidder2 }),
            'VIV0054',
          );
        });
      });

      describe('When bidding amount is greater than zero', function () {
        const topBidPrice = startPrice.add(range);
        beforeEach(async function () {
          await this.trade.bidding(id, { from: bidder2, value: topBidPrice });
        });

        describe('When first calling refund ', function () {
          it('return amount to loser', async function () {
            await expectEvent(
              await this.trade.refund(id, { from: bidder }),
              'Transfer',
              { from: this.trade.address, to: bidder, value: startPrice },
            );
          });
          it('contract amount equals top bidding amount', async function () {
            await this.trade.refund(id, { from: bidder });
            expect(await current(this.trade.address)).to.be.bignumber.equal(
              topBidPrice,
            );
          });
        });
        describe('When repeat calling refund ', function () {
          beforeEach(async function () {
            await this.trade.refund(id, { from: bidder });
          });

          it('reverts', async function () {
            await expectRevert(
              this.trade.refund(id, { from: bidder }),
              'VIV0054',
            );
          });
        });
      });
    });
  });

  describe('withdraw', function () {
    let id;
    const couponRate = new BN(500);
    const sign1 = getSign(['bytes'], [signHex], bidderPrivateKey);
    const sign2 = getSign(
      ['uint256', 'bytes', 'bytes'],
      [couponRate, couponId, signHex],
      guaranteePrivateKey,
    );

    beforeEach(async function () {
      const endTime = blockTime.addn(10);
      const { receipt } = await this.trade.publish(
        guarantee,
        signHex,
        endTime,
        startPrice,
        range,
        feeRate,
        { from: publisher },
      );
      id = receipt.logs.find(({ event }) => event === 'VivReturnId').args.id;
      await this.trade.bidding(id, { from: bidder, value: startPrice });
    });

    describe('When auction is not end', function () {
      it('reverts', async function () {
        await expectRevert(
          this.trade.withdrawInternal(
            id,
            sign1,
            sign2,
            couponRate,
            couponId,
            blockTime.subn(10),
            { from: publisher },
          ),
          'VIV0052',
        );
      });
    });

    describe('When auction is end', function () {
      describe('When the parameter is invalid', function () {
        describe('When id value is zero', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(
                0,
                sign1,
                sign2,
                couponRate,
                couponId,
                blockTime.addn(10),
                { from: publisher },
              ),
              'VIV0055',
            );
          });
        });

        describe('When msg.sender is not publisher', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(
                id,
                sign1,
                sign2,
                couponRate,
                couponId,
                blockTime.addn(10),
                { from: bidder },
              ),
              'VIV0055',
            );
          });
        });

        describe('When sign1 value is wrong', function () {
          // bidder not winner or gurantee
          const wrongSign = getSign(['bytes'], [signHex], bidder2PrivateKey);
          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(
                id,
                wrongSign,
                sign2,
                couponRate,
                couponId,
                blockTime.addn(10),
                { from: publisher },
              ),
              'VIV0056',
            );
          });
        });
      });

      describe('When the withdraw not use coupon', function () {
        const feeAmount = startPrice.add(range).mul(feeRate).divn(10000);
        it('emit a Transfer event', async function () {
          expectEvent(
            await this.trade.withdrawInternal(
              id,
              sign1,
              sign2,
              0,
              couponId,
              blockTime.addn(10),
              { from: publisher },
            ),
            'Transfer',
            { from: this.trade.address, to: guarantee, value: feeAmount },
          );
        });
      });

      describe('When the withdraw use coupon', function () {
        const feeAmount = startPrice.add(range).mul(feeRate).divn(10000);

        describe('When couponRate is zero', function () {
          it('emit a Transfer event', async function () {
            expectEvent(
              await this.trade.withdrawInternal(
                id,
                sign1,
                sign2,
                0,
                couponId,
                blockTime.addn(10),
                { from: publisher },
              ),
              'Transfer',
              { from: this.trade.address, to: guarantee, value: feeAmount },
            );
          });
        });

        describe('When couponId is zero', function () {
          it('reverts', async function () {
            await expectRevert(
              this.trade.withdrawInternal(
                id,
                sign1,
                sign2,
                couponRate,
                '0x',
                blockTime.addn(10),
                { from: publisher },
              ),
              'VIV0007',
            );
          });
        });

        describe('When the coupon is reused', function () {
          beforeEach('The coupon first used', async function () {
            const endTime2 = blockTime.addn(10);
            const { receipt } = await this.trade.publish(
              guarantee,
              signHex,
              endTime2,
              startPrice,
              range,
              feeRate,
              { from: publisher },
            );
            const id2 = receipt.logs.find(({ event }) => event === 'VivReturnId').args
              .id;
            await this.trade.bidding(id2, { from: bidder, value: startPrice });
            await this.trade.withdrawInternal(
              id2,
              sign1,
              sign2,
              couponRate,
              couponId,
              blockTime.addn(10),
              { from: publisher },
            );
          });

          describe('When the coupon is used again', function () {
            it('reverts', async function () {
              await expectRevert(
                this.trade.withdrawInternal(
                  id,
                  sign1,
                  sign2,
                  couponRate,
                  couponId,
                  blockTime.addn(10),
                  { from: publisher },
                ),
                'VIV0006',
              );
            });
          });
        });
      });
    });
  });

  describe('getLosers', function () {
    let id;
    let endTime;
    let expected;

    beforeEach(async function () {
      endTime = blockTime.addn(10);
      const receipt = await this.trade.publish(
        guarantee,
        signHex,
        endTime,
        startPrice,
        range,
        feeRate,
      );
      id = receipt.logs.find(({ event }) => event === 'VivReturnId').args.id;
      await this.trade.bidding(id, { from: bidder, value: startPrice });
      await this.trade.bidding(id, {
        from: bidder2,
        value: startPrice.add(range),
      });

      expected = [];
      expected.push(bidder);
      expected.push(bidder2);
    });

    it('view all bidder', async function () {
      const actual = await this.trade.getLosers(id);
      expect(actual).to.be.deep.equal(expected);
    });
  });

  describe('info', function () {
    let id;
    let endTime;
    let currentTime;
    const getValue = ({ 0: sysTime, 1: endTime, 2: topPrice, 3: myPrice }) => ({
      0: sysTime.toString(),
      1: endTime.toString(),
      2: topPrice.toString(),
      3: myPrice.toString(),
    });

    beforeEach(async function () {
      endTime = blockTime.addn(10);
      currentTime = blockTime.addn(100);
      const receipt = await this.trade.publish(
        guarantee,
        signHex,
        endTime,
        startPrice,
        range,
        feeRate,
      );
      id = receipt.logs.find(({ event }) => event === 'VivReturnId').args.id;
      await this.trade.bidding(id, { from: bidder, value: startPrice });
    });

    it('view info for bidder', async function () {
      const actual = getValue(
        await this.trade.infoInternal(id, bidder, currentTime),
      );
      const expected = getValue({
        0: currentTime,
        1: endTime,
        2: startPrice,
        3: startPrice,
      });
      expect(actual).to.be.deep.equal(expected);
    });

    it('view bid info for guest', async function () {
      const actual = getValue(
        await this.trade.infoInternal(id, bidder2, currentTime),
      );
      const expected = getValue({
        0: currentTime,
        1: endTime,
        2: startPrice,
        3: new BN(0),
      });
      expect(actual).to.be.deep.equal(expected);
    });
  });
});
