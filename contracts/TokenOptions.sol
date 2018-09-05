pragma solidity ^0.4.24;

import './ERC20.sol';
import './MyBitDapp.sol';
import './StringUtils.sol';
import './SafeMath.sol';

contract TokenOptions is MyBitDapp{
  using SafeMath for uint;
  using StringUtils for string;

  struct Order{
    string optionType;
    address tokenAddress;
    uint tokens;
    uint strikePrice;
    uint premium; //Not sure if this is needed if premium is calculated at time of purchase
    uint expiry;
    bool purchased;
    bool exercised;
    bool cancelled;
  }

  //mapping(address => uint) private balances;
  mapping(bytes32 => Order) public options;
  mapping(bytes32 => address) private optionSellers;
  mapping(bytes32 => address) private optionBuyers;
  //mapping(address => bytes32[]) private optionBook;

  function createOption(string _type, address _sellerAddress, address _tokenAddress, uint _tokens, uint _strikePrice, uint _premium, uint _blockUntilExpiry) private{
    uint expiry = block.number.add(_blockUntilExpiry);
    bytes32 optionID = encode(_type, _sellerAddress, _tokenAddress, _strikePrice, expiry);
    require(optionSellers[optionID] == address(0));
    options[optionID].optionType = _type;
    options[optionID].tokenAddress = _tokenAddress;
    options[optionID].tokens = _tokens;
    options[optionID].strikePrice = _strikePrice;
    options[optionID].premium = _premium;
    options[optionID].expiry = expiry;
    optionSellers[optionID] = _sellerAddress;
    emit logNewOption(optionID, _type, _tokenAddress, _tokens, _strikePrice, _premium, expiry);
  }

  // @dev should premium be decided algorithmically at the time of purchase??
  function sellPut(address _tokenAddress, uint _tokens, uint _strikePrice, uint _premium, uint _blockUntilExpiry) //Short put
  payable
  external{
    //ERC20(tokenAddress).transferFrom(msg.sender, address(this), tokens);
    require(msg.value == _strikePrice.mul(_tokens) );
    //amount = _strikePrice.mul(_tokens);
    createOption('Put', msg.sender, _tokenAddress, _tokens, _strikePrice, _premium, _blockUntilExpiry);
  }

  // @dev should premium be decided algorithmically at the time of purchase??
  function sellCall(address _tokenAddress, uint _tokens, uint _strikePrice, uint _premium, uint _blockUntilExpiry) //Short call
  external{
    require(ERC20(_tokenAddress).transferFrom(msg.sender, address(this), _tokens));
    createOption('Call', msg.sender, _tokenAddress, _tokens, _strikePrice, _premium, _blockUntilExpiry);
  }

  function buyOption(bytes32 _optionID, uint _tokens)
  payable
  external{
    require(!options[_optionID].purchased);
    require(!options[_optionID].cancelled);
    require(options[_optionID].tokens >= _tokens);
    //Pay premium to the option seller
    uint payment = _tokens.mul(options[_optionID].premium).div(decimals);
    emit logPayment(payment);
    assert(msg.value == payment);
    optionSellers[_optionID].transfer(payment);
    //Give ownership of the option to buyer
    options[_optionID].purchased = true;
    optionBuyers[_optionID] = msg.sender;
    //Check if any escrow needs to be returned to seller
    uint remainder = options[_optionID].tokens.sub(_tokens);
    if(remainder > 0){
      //If it's a put option, return ether remainder
      if(options[_optionID].optionType.equal('Put')){
        uint amount = options[_optionID].strikePrice.mul(remainder);
        optionSellers[_optionID].transfer(amount);
      }
      //If it's a call option, return token remainder
      if(options[_optionID].optionType.equal('Call')){
        ERC20(options[_optionID].tokenAddress).transfer(optionSellers[_optionID], remainder);
      }
    }
    //Set the correct token value
    options[_optionID].tokens = _tokens;
  }

  function exercisePut(bytes32 _optionID, uint _tokens)
  payable
  external{
    require(!options[_optionID].exercised);
    require(!options[_optionID].cancelled);
    require(optionBuyers[_optionID] == msg.sender);
    require(options[_optionID].expiry > block.number);
    require(options[_optionID].tokens >= _tokens);
    //Mark option exercised
    options[_optionID].exercised = true;
    //Give seller tokens
    require(ERC20(options[_optionID].tokenAddress).transferFrom(msg.sender, optionSellers[_optionID], _tokens));
    //Buyer receive ether from escrow
    uint amount = options[_optionID].strikePrice.mul(_tokens);
    msg.sender.transfer(amount);
    //Return remaining balance to seller
    uint remainder = options[_optionID].tokens.sub(_tokens);
    if(remainder > 0){
      amount = options[_optionID].strikePrice.mul(remainder);
      optionSellers[_optionID].transfer(amount);
    }
  }

  function exerciseCall(bytes32 _optionID, uint _tokens)
  payable
  external{
    require(!options[_optionID].exercised);
    require(!options[_optionID].cancelled);
    require(optionBuyers[_optionID] == msg.sender);
    require(options[_optionID].expiry > block.number);
    require(options[_optionID].tokens >= _tokens);
    require(options[_optionID].strikePrice.mul(_tokens) == msg.value);
    //Mark option exercised
    options[_optionID].exercised = true;
    //Give seller ether
    uint amount = options[_optionID].strikePrice.mul(_tokens);
    optionSellers[_optionID].transfer(amount);
    //Buyer receives tokens from escrow
    ERC20(options[_optionID].tokenAddress).transferFrom(msg.sender, optionSellers[_optionID], _tokens);
    //Return remaining balance to seller
    uint remainder = options[_optionID].tokens.sub(_tokens);
    if(remainder > 0){
      ERC20(options[_optionID].tokenAddress).transfer(optionSellers[_optionID], remainder);
    }
  }

  function cancelOption(bytes32 _optionID) external{
    require(options[_optionID].expiry > block.number);
    require(!options[_optionID].exercised);
    if(options[_optionID].purchased){
      require(msg.sender == optionBuyers[_optionID]);
    } else {
      require(msg.sender == optionSellers[_optionID]);
    }
    //address tokenAddress = options[_optionID].tokenAddress;
    //uint tokens = options[_optionID].tokens;
    //uint strikePrice = options[_optionID].strikePrice;
    //If it's a put option, return ether
    if(options[_optionID].optionType.equal('Put')){
      uint amount = options[_optionID].strikePrice.mul(options[_optionID].tokens);
      optionSellers[_optionID].transfer(amount);
    }
    //If it's a call option, return tokens
    if(options[_optionID].optionType.equal('Call')){
      ERC20(options[_optionID].tokenAddress).transfer(optionSellers[_optionID], options[_optionID].tokens);
    }
  }

  function liquidateOption(bytes32 _optionID) external {
    require(options[_optionID].expiry <= block.number);
    require(!options[_optionID].exercised);
    require(!options[_optionID].cancelled);
    //Mark option as cancelled
    options[_optionID].cancelled = true;
    //If it's a put option, return ether
    if(options[_optionID].optionType.equal('Put')){
      uint amount = options[_optionID].strikePrice.mul(options[_optionID].tokens);
      optionSellers[_optionID].transfer(amount);
    }
    //If it's a call option, return tokens
    if(options[_optionID].optionType.equal('Call')){
      ERC20(options[_optionID].tokenAddress).transfer( optionSellers[_optionID], options[_optionID].tokens);
    }
  }

/**
  function viewOpenPuts(_tokenAddress) external {}

  function viewOpenCalls(_tokenAddress) external {}
*/
/**
  function withdraw() external{
    require(balances[msg.sender] > 0);
  }

  function withdrawToken(_tokenAddress) external{

  }
*/

  event logNewOption(bytes32 _optionID, string _type, address _tokenAddress, uint _tokens, uint _strikePrice, uint _premium, uint _expiry);
  event logPayment(uint _payment);
}
