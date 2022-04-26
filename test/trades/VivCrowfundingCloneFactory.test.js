const { BN, constants, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;

const VivCrowfundingCloneFactory = artifacts.require('VivCrowfundingCloneFactory');
const VivCrowfundingClonable = artifacts.require('VivCrowfundingClonable');

contract('VivCrowfundingCloneFactory', function (accounts) {
  const [ platform ] = accounts;

  const feeRate = new BN(500);

  beforeEach(async function () {
    this.trade = await VivCrowfundingCloneFactory.new();
    this.clone = await VivCrowfundingClonable.new();
  });

  describe('createVivCrowfunding', function () {
    describe('When clone a contract', function () {
      it('return a clone contract', async function () {
        expectEvent(
          await this.trade.createVivCrowfunding(this.clone.address, platform, feeRate, ZERO_ADDRESS),
          'VivCrowfundingCreated',
          { },
        );
      });
    });
  });

  describe('getVivCrowfunding', function () {
    beforeEach(async function () {
      await this.trade.createVivCrowfunding(this.clone.address, platform, feeRate, ZERO_ADDRESS);
    });

    it('return clone contracts', async function () {
      const result = await this.trade.getVivCrowfunding();
      expect(result.length).to.be.equal(1);
    });
  });
});
