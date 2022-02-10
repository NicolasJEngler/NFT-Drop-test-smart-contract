import {expect} from './chai-setup';
import {ethers, deployments, getUnnamedAccounts} from 'hardhat';
import {setupUsers} from './utils';
import {NFTDrop} from '../typechain/NFTDrop';
import {Bytes} from '@ethersproject/bytes';
import {MerkleTree} from 'merkletreejs';
import {keccak256, toBuffer} from 'ethereumjs-util';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('NFTDrop');

  const contracts = {
    NFTDrop: <NFTDrop>await ethers.getContract('NFTDrop'),
  };

  const users = await setupUsers(await getUnnamedAccounts(), contracts);

  const leaves = users.slice(0, 4).map((x) => keccak256(toBuffer(x.address)));

  const tree = new MerkleTree(leaves, keccak256, {
    sortLeaves: true,
    sortPairs: true,
  });

  contracts.NFTDrop.setMerkleRoot(tree.getRoot());

  return {
    ...contracts,
    users,
    tree,
  };
});

const emptyBytes32Array: Bytes[] = [];
const dummyBytes32 =
  '0x0000000000000000000000000000000000000000000000000000000000000001';

describe('NFTDrop', function () {
  it('can mint with merkleroot', async function () {
    const {users, NFTDrop, tree} = await setup();

    const leaf = '0x' + keccak256(toBuffer(users[0].address)).toString('hex');
    const proof = tree.getHexProof(leaf);

    await expect(users[0].NFTDrop.mint(proof, leaf))
      .to.emit(NFTDrop, 'Transfer')
      .withArgs(
        '0x0000000000000000000000000000000000000000',
        users[0].address,
        51
      );
  });
  it('should fail merkleproof verification', async function () {
    const {users, tree} = await setup();

    const leaf = '0x' + keccak256(toBuffer(users[5].address)).toString('hex');
    const proof = tree.getHexProof(leaf);

    await expect(users[0].NFTDrop.mint(proof, leaf)).to.be.revertedWith(
      'This leaf does not belong to the sender'
    );
  });
  it('can mint without merkleroot', async function () {
    const {users, NFTDrop} = await setup();

    await NFTDrop.stopMerkle();

    await expect(users[0].NFTDrop.mint(emptyBytes32Array, dummyBytes32))
      .to.emit(NFTDrop, 'Transfer')
      .withArgs(
        '0x0000000000000000000000000000000000000000',
        users[0].address,
        51
      );
  });
  it('should mint entire collection', async function () {
    const {users, NFTDrop} = await setup();

    // avoid testing this if collection has over 60 items due to unnamed accounts length
    if ((await NFTDrop.maxMint()).toNumber() < 61) {
      await NFTDrop.stopMerkle();

      await NFTDrop.reserveNFTs(users[0].address, 25);
      await NFTDrop.reserveNFTs(users[0].address, 25);

      for (let i = 0; i < 10; i++)
        await expect(users[i].NFTDrop.mint(emptyBytes32Array, dummyBytes32))
          .to.emit(NFTDrop, 'Transfer')
          .withArgs(
            '0x0000000000000000000000000000000000000000',
            users[i].address,
            51 + i
          );

      await expect(await NFTDrop.totalSupply()).to.be.equal('60');
    }
  });

  it('should read saleStarted value', async function () {
    const {NFTDrop} = await setup();

    await expect(await NFTDrop.saleStarted()).to.be.equal(true || false);
  });
});
