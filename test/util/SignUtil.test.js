const {
  getSign,
  getHash,
  getHashString,
} = require('../helpers/sign');

const { expect } = require('chai');

const SignUtilMock = artifacts.require('SignUtilMock');

contract('SignUtil', function (accounts) {
  const [seller, buyer, guarantor] = accounts;

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

  const tid = '0x303030303030303030303030303030303030';

  beforeEach(async function () {
    this.sign = await SignUtilMock.new();
  });

  describe('checkSign 1', function () {
    const hashValue = getHash(['bytes'], [tid]);
    const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
    const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
    const signedValue3 = getSign(['bytes'], [tid], guarantorPrivateKey);
    const signedValue4 = getSign(['bytes'], [tid], platformPrivateKey);

    describe('When the verification passes', function () {
      it('return true', async function () {
        expect(
          await this.sign.checkSign1(
            hashValue,
            signedValue1,
            signedValue2,
            buyer,
            seller,
            guarantor,
          ),
        ).to.be.equal(true);
        expect(
          await this.sign.checkSign1(
            hashValue,
            signedValue1,
            signedValue3,
            buyer,
            seller,
            guarantor,
          ),
        ).to.be.equal(true);
        expect(
          await this.sign.checkSign1(
            hashValue,
            signedValue2,
            signedValue3,
            buyer,
            seller,
            guarantor,
          ),
        ).to.be.equal(true);
      });
    });

    describe('When the verification fails', function () {
      it('return false', async function () {
        expect(
          await this.sign.checkSign1(
            hashValue,
            signedValue1,
            signedValue4,
            buyer,
            seller,
            guarantor,
          ),
        ).to.be.equal(false);
        expect(
          await this.sign.checkSign1(
            hashValue,
            signedValue2,
            signedValue4,
            buyer,
            seller,
            guarantor,
          ),
        ).to.be.equal(false);
        expect(
          await this.sign.checkSign1(
            hashValue,
            signedValue3,
            signedValue4,
            buyer,
            seller,
            guarantor,
          ),
        ).to.be.equal(false);
      });
    });
  });

  describe('checkSign 2', function () {
    const hashValue = getHashString(['bytes'], [tid]);
    const signedValue1 = getSign(['bytes'], [tid], buyerPrivateKey);
    const signedValue2 = getSign(['bytes'], [tid], sellerPrivateKey);
    const signedValue3 = getSign(['bytes'], [tid], guarantorPrivateKey);

    describe('When the verification passes', function () {
      it('return true', async function () {
        expect(
          await this.sign.checkSign2(
            hashValue,
            signedValue1,
            signedValue2,
            buyer,
            seller,
          ),
        ).to.be.equal(true);
        expect(
          await this.sign.checkSign2(
            hashValue,
            signedValue2,
            signedValue3,
            seller,
            guarantor,
          ),
        ).to.be.equal(true);
        expect(
          await this.sign.checkSign2(
            hashValue,
            signedValue1,
            signedValue3,
            buyer,
            guarantor,
          ),
        ).to.be.equal(true);
      });
    });

    describe('When the verification fails', function () {
      describe('When signedValue1 equal to signedValue2', function () {
        it('return false', async function () {
          expect(
            await this.sign.checkSign2(
              hashValue,
              signedValue1,
              signedValue1,
              buyer,
              seller,
            ),
          ).to.be.equal(false);
        });
      });

      describe('When the recover from signedValue1 is not buyer or seller', function () {
        it('return false', async function () {
          expect(
            await this.sign.checkSign2(
              hashValue,
              signedValue3,
              signedValue2,
              buyer,
              seller,
            ),
          ).to.be.equal(false);
        });
      });

      describe('When the recover from signedValue2 is not buyer or seller', function () {
        it('return false', async function () {
          expect(
            await this.sign.checkSign2(
              hashValue,
              signedValue1,
              signedValue3,
              buyer,
              seller,
            ),
          ).to.be.equal(false);
        });
      });
    });
  });

  describe('checkSign 3', function () {
    const hashValue = getHashString(['bytes'], [tid]);
    const signedValue = getSign(['bytes'], [tid], buyerPrivateKey);

    describe('When the verification passes', function () {
      it('return true', async function () {
        expect(
          await this.sign.checkSign3(hashValue, signedValue, buyer),
        ).to.be.equal(true);
      });
    });

    describe('When the verification fails', function () {
      it('return false', async function () {
        expect(
          await this.sign.checkSign3(hashValue, signedValue, seller),
        ).to.be.equal(false);
      });
    });
  });
});
