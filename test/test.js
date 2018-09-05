var BigNumber = require('bignumber.js');

const Options = artifacts.require("./TokenOptions.sol");
const Token = artifacts.require('./ERC20.sol');
//const MyBitBurner = artifacts.require('./MyBitBurner.sol');

const decimals = 1000000000000000000;
const tokenSupply = 10000*decimals;
const premium = 0.05*decimals; //5% premium
const blocksUntilExpiry = 100;

const owner = web3.eth.accounts[0];
const buyer1 = web3.eth.accounts[1];

let currentPrice = 0.8*decimals;

let options;
let optionID;
let token;
let tokenAddress;

contract('Token Options', async(accounts) => {
  // Deploy token contract
  it ('Deploy MyBit Token contract', async() => {
    token = await Token.new(tokenSupply, "MyBit Token", 8, "MyB");
    tokenAddress = await token.address;
    console.log(tokenAddress);

    assert.equal(await token.totalSupply(), tokenSupply);
    assert.equal(await token.balanceOf(owner), tokenSupply);
  });

  it('Deploy Options contract', async() => {
    options = await Options.new();
  });

  it('Sell call', async() => {
    token.approve(options.address, 10000*decimals);
    tx = await options.sellCall(tokenAddress, 100*decimals, 0.5*decimals, premium, blocksUntilExpiry);
    optionID = tx.logs[0].args._optionID;
    console.log(optionID);
    optionStruct = await options.options(optionID);

    optionType = optionStruct[0];
    optionTokenAddress = optionStruct[1];
    optionTokens = optionStruct[2];
    optionStrike = optionStruct[3];
    optionPremium = optionStruct[4];
    optionExpiry = optionStruct[5];
    optionPurchased = optionStruct[6];
    optionCancelled = optionStruct[7];


    assert.equal(optionType, 'Call');
    assert.equal(optionTokenAddress, tokenAddress);
    assert.equal(optionTokens, 100*decimals);
    assert.equal(optionStrike, 0.5*decimals);
    assert.equal(optionPremium, premium);
    assert.equal(optionExpiry, web3.eth.getBlock('latest').number + blocksUntilExpiry)
    assert.equal(optionPurchased, false);
    assert.equal(optionCancelled, false);
  });

  it('Buy call', async() => {
    sellerTokenBalanceBefore = new BigNumber(await token.balanceOf(owner));
    sellerEtherBalanceBefore = new BigNumber(await web3.eth.getBalance(owner));
    tx = await options.buyOption(optionID, 10*decimals, {from: buyer1, value: 10*premium}); //Buy a call option for 10 tokens
    sellerTokenBalanceAfter = new BigNumber(await token.balanceOf(owner));
    sellerEtherBalanceAfter = new BigNumber(await web3.eth.getBalance(owner));
    optionStruct = await options.options(optionID);
    optionTokens = optionStruct[2];
    optionPurchased = optionStruct[6];
    assert.equal(optionTokens, 10*decimals); //Tokens currently held in the option
    assert.equal(optionPurchased, true);
    assert.equal(sellerEtherBalanceAfter.minus(sellerEtherBalanceBefore), 10*premium); //Premium paid for option
    assert.equal(sellerTokenBalanceAfter.minus(sellerTokenBalanceBefore), 90*decimals); //Escrowed tokens returned that options were not bought for
  });

});
