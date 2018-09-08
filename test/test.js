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
const buyer2 = web3.eth.accounts[2];

let currentPrice = 0.8*decimals;

let options;
let optionID;
let token;
let tokenAddress;

function advanceBlock () {
  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync({
      jsonrpc: '2.0',
      method: 'evm_mine',
      id: Date.now(),
    }, (err, res) => {
      return err ? reject(err) : resolve(res);
    });
  });
}

contract('Token Options', async() => {
  // Deploy token contract
  it ('Deploy MyBit Token contract', async() => {
    token = await Token.new(tokenSupply, "MyBit Token", 8, "MyB");
    tokenAddress = await token.address;
    console.log(tokenAddress);

    assert.equal(await token.totalSupply(), tokenSupply);
    assert.equal(await token.balanceOf(owner), tokenSupply);
  });

  it('Spread tokens', async() => {
    token.transfer(buyer1, 1000*decimals);
    token.transfer(buyer2, 1000*decimals);
  });

  it('Deploy Options contract', async() => {
    options = await Options.new();
  });

  it('Fail to create sell call', async() => {
    let err;
    try{
      await options.sellCall(tokenAddress, 100*decimals, 0.5*decimals, premium, blocksUntilExpiry);
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
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

  it('Fail to create sell call', async() => {
    let err;
    try{
      token.approve(options.address, 10000*decimals);
      tx = await options.sellCall(tokenAddress, 100*decimals, 0.5*decimals, premium, blocksUntilExpiry-2);
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail to buy call', async() => {
    let err;
    try{
      await options.buyOption(optionID, 110*decimals, {from: buyer1, value: 110*premium}); //Buy a call option for 110 tokens
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail to buy call', async() => {
    let err;
    try{
      await options.buyOption(optionID, 10*decimals, {from: buyer1, value: 100*premium}); //Buy a call option for 110 tokens
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
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

  it('Fail to buy call', async() => {
    let err;
    try{
      await options.buyOption(optionID, 10*decimals, {from: buyer1, value: 10*premium});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail cancel call', async() => {
    let err;
    try{
      await options.cancelOption(optionID);
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail to exercise call', async() => {
    let err;
    try{
      await options.exerciseCall(optionID, 10*decimals, {from: owner});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail to exercise call', async() => {
    let err;
    try{
      await options.exerciseCall(optionID, 10*decimals, {from: buyer1});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail to exercise call', async() => {
    let err;
    try{
      await options.exerciseCall(optionID, 110*decimals, {from: buyer1});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });


  it('Exercise call', async() => {
    buyerTokenBalanceBefore = new BigNumber(await token.balanceOf(buyer1));
    await options.exerciseCall(optionID, 10*decimals, {from: buyer1, value: 10*0.5*decimals});
    buyerTokenBalanceAfter = new BigNumber(await token.balanceOf(buyer1));
    optionStruct = await options.options(optionID);
    optionTokens = optionStruct[2];
    optionExercised = optionStruct[7];
    assert.equal(optionTokens, 10*decimals); //Tokens currently held in the option
    assert.equal(optionExercised, true);
    assert.equal(buyerTokenBalanceAfter.minus(buyerTokenBalanceBefore), 10*decimals); //Escrowed tokens returned that options were not bought for
  });

  it('Fail to exercise call', async() => {
    let err;
    try{
      await options.exerciseCall(optionID, 10*decimals, {from: buyer1, value: 10*0.5*decimals});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail cancel call', async() => {
    let err;
    try{
      await options.cancelOption(optionID);
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail to liquidate call', async() => {
    let err;
    try{
      await options.liquidateOption(optionID);
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Sell new call', async() => {
    token.approve(options.address, 10000*decimals);
    tx = await options.sellCall(tokenAddress, 100*decimals, 0.5*decimals, premium, blocksUntilExpiry);
    optionID = tx.logs[0].args._optionID;
  });

  it('Fail cancel call', async() => {
    let err;
    try{
      await options.cancelOption(optionID, {from: buyer2});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Cancel call', async() => {
    await options.cancelOption(optionID);
  });

  it('Fail to buy call', async() => {
    let err;
    try{
      await options.buyOption(optionID, 10*decimals, {from: buyer1, value: 10*premium});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Sell new call', async() => {
    token.approve(options.address, 10000*decimals);
    tx = await options.sellCall(tokenAddress, 100*decimals, 0.5*decimals, premium, blocksUntilExpiry);
    optionID = tx.logs[0].args._optionID;
  });

  it('Buy call', async() => {
    await options.buyOption(optionID, 10*decimals, {from: buyer1, value: 10*premium}); //Buy a call option for 10 tokens
  });

  it('Cancel call', async() => {
    await options.cancelOption(optionID, {from: buyer1});
  });

  it('Fail to exercise call', async() => {
    let err;
    try{
      await options.exerciseCall(optionID, 10*decimals, {from: buyer1, value: 10*0.5*decimals});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail cancel call', async() => {
    let err;
    try{
      await options.cancelOption(optionID, {from: buyer1});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Sell new call', async() => {
    token.approve(options.address, 10000*decimals);
    tx = await options.sellCall(tokenAddress, 100*decimals, 0.5*decimals, premium, 2);
    optionID = tx.logs[0].args._optionID;
  });

  it('Buy call', async() => {
    await options.buyOption(optionID, 10*decimals, {from: buyer1, value: 10*premium}); //Buy a call option for 10 tokens
  });

  it('Fail to exercise call', async() => {
    let err;
    try{
      await options.exerciseCall(optionID, 10*decimals, {from: buyer1, value: 10*0.5*decimals});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail to cancel call', async() => {
    let err;
    try{
      await options.cancelOption(optionID, {from: buyer1});
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Liquidate call', async() => {
    await options.liquidateOption(optionID);
    //Get balances of seller !!!!!
  });

  it('Sell new call', async() => {
    token.approve(options.address, 10000*decimals);
    tx = await options.sellCall(tokenAddress, 100*decimals, 0.5*decimals, premium, blocksUntilExpiry);
    optionID = tx.logs[0].args._optionID;
  });

  it('Buy call', async() => {
    await options.buyOption(optionID, 100*decimals, {from: buyer1, value: 100*premium}); //Buy a call option for 10 tokens
  });

  it('Exercise call', async() => {
    await options.exerciseCall(optionID, 10*decimals, {from: buyer1, value: 10*0.5*decimals});
  });

  it('Fail to sell put', async() => {
    let err;
    try{
      await options.sellPut(tokenAddress, 100*decimals, 0.5*decimals, premium, blocksUntilExpiry);
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Sell put', async() => {
    tx = await options.sellPut(tokenAddress, 100*decimals, 0.5*decimals, premium, blocksUntilExpiry, {value: 100*0.5*decimals});
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


    assert.equal(optionType, 'Put');
    assert.equal(optionTokenAddress, tokenAddress);
    assert.equal(optionTokens, 100*decimals);
    assert.equal(optionStrike, 0.5*decimals);
    assert.equal(optionPremium, premium);
    assert.equal(optionExpiry, web3.eth.getBlock('latest').number + blocksUntilExpiry)
    assert.equal(optionPurchased, false);
    assert.equal(optionCancelled, false);
  });

  it('Buy put', async() => {
    sellerTokenBalanceBefore = new BigNumber(await token.balanceOf(owner));
    sellerEtherBalanceBefore = new BigNumber(await web3.eth.getBalance(owner));
    tx = await options.buyOption(optionID, 100*decimals, {from: buyer1, value: 100*premium}); //Buy a call option for 100 tokens
    sellerTokenBalanceAfter = new BigNumber(await token.balanceOf(owner));
    sellerEtherBalanceAfter = new BigNumber(await web3.eth.getBalance(owner));
    optionStruct = await options.options(optionID);
    optionTokens = optionStruct[2];
    optionPurchased = optionStruct[6];
    assert.equal(optionTokens, 100*decimals); //Tokens currently held in the option
    assert.equal(optionPurchased, true);
    console.log(Number(sellerEtherBalanceAfter.minus(sellerEtherBalanceBefore)));
    assert.equal(sellerEtherBalanceAfter.minus(sellerEtherBalanceBefore), 100*premium); //Premium paid for option
    assert.equal(sellerTokenBalanceAfter.minus(sellerTokenBalanceBefore), 0); //Escrowed tokens returned that options were not bought for
});

  it('Fail to exercise put', async() => {
    let err;
    try{
      await options.exercisePut(optionID, 10*decimals, {from: buyer2});//Buyer2 can't exercise buyer1's put
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Fail to exercise put', async() => {
    let err;
    try{
      await options.exercisePut(optionID, 110*decimals, {from: buyer1});//too many tokens
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Exercise put', async() => {
    buyerEtherBalanceBefore = new BigNumber(await web3.eth.getBalance(buyer1));
    sellerTokenBalanceBefore = new BigNumber(await token.balanceOf(owner));
    await token.approve(options.address, 10*decimals, {from: buyer1});
    await options.exercisePut(optionID, 10*decimals, {from: buyer1});
    buyerEtherBalanceAfter = new BigNumber(await web3.eth.getBalance(buyer1));
    sellerTokenBalanceAfter = new BigNumber(await token.balanceOf(owner));
    optionStruct = await options.options(optionID);
    optionTokens = optionStruct[2];
    optionExercised = optionStruct[7];
    assert.equal(optionExercised, true);
    assert.equal(sellerTokenBalanceAfter.minus(sellerTokenBalanceBefore), 10*decimals); //Escrowed tokens returned that options were not bought for
  });

  it('Fail to exercise put', async() => {
    let err;
    try{
      await options.exercisePut(optionID, 10*decimals, {from: buyer1});//alread exercised
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Sell put', async() => {
    tx = await options.sellPut(tokenAddress, 100*decimals, 0.5*decimals, premium, blocksUntilExpiry, {value: 100*0.5*decimals});
    optionID = tx.logs[0].args._optionID;
  });

  it('Buy put', async() => {
    await options.buyOption(optionID, 10*decimals, {from: buyer1, value: 10*premium}); //Buy a call option for 10 tokens
  });

  it('Fail to exercise put', async() => {
    let err;
    try{
      await options.exercisePut(optionID, 10*decimals, {from: buyer1});//token transfer not approved
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Exercise put', async() => {
    await token.approve(options.address, 1*decimals, {from: buyer1});
    await options.exercisePut(optionID, 1*decimals, {from: buyer1});
  });

  it('Sell put', async() => {
    tx = await options.sellPut(tokenAddress, 100*decimals, 0.5*decimals, premium, blocksUntilExpiry, {value: 100*0.5*decimals});
    optionID = tx.logs[0].args._optionID;
  });

  it('Buy put', async() => {
    await options.buyOption(optionID, 10*decimals, {from: buyer1, value: 10*premium}); //Buy a call option for 10 tokens
  });

  it('Cancel call', async() => {
    await options.cancelOption(optionID, {from: buyer1});
  });

  it('Fail to exercise put', async() => {
    let err;
    try{
      await options.exercisePut(optionID, 10*decimals, {from: buyer1});//alread exercised
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Sell put', async() => {
    tx = await options.sellPut(tokenAddress, 100*decimals, 0.5*decimals, premium, 2, {value: 100*0.5*decimals});
    optionID = tx.logs[0].args._optionID;
  });

  it('Buy put', async() => {
    await options.buyOption(optionID, 10*decimals, {from: buyer1, value: 10*premium}); //Buy a call option for 10 tokens
  });

  it('Fail to exercise put', async() => {
    let err;
    try{
      await options.exercisePut(optionID, 1*decimals, {from: buyer1});//expired
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Liquidate put', async() => {
    await options.liquidateOption(optionID);
  });

  it('Sell put', async() => {
    tx = await options.sellPut(tokenAddress, 10*decimals, 0.5*decimals, premium, 4, {value: 10*0.5*decimals});
    optionID = tx.logs[0].args._optionID;
  });

  it('Buy put', async() => {
    await options.buyOption(optionID, 10*decimals, {from: buyer1, value: 10*premium}); //Buy a call option for 10 tokens
  });

  it('Exercise put', async() => {
    await token.approve(options.address, 10*decimals, {from: buyer1});
    await options.exercisePut(optionID, 10*decimals, {from: buyer1});
  });

  it('Fail to liquidate put', async() => {
    let err;
    try{
      advanceBlock();
      await options.liquidateOption(optionID);
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

  it('Sell put', async() => {
    tx = await options.sellPut(tokenAddress, 100*decimals, 0.5*decimals, premium, 2, {value: 100*0.5*decimals});
    optionID = tx.logs[0].args._optionID;
  });

  it('Cancel put', async() => {
    await options.cancelOption(optionID);
  });

  it('Fail to liquidate put', async() => {
    let err;
    try{
      await options.liquidateOption(optionID);
    } catch(e){
      err = e;
    }
    assert.notEqual(err, undefined);
  });

});
