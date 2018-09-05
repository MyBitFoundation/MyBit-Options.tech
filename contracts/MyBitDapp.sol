pragma solidity ^0.4.24;

import './SafeMath.sol';
import './MyBitBurner.sol';

contract MyBitDapp {
  using SafeMath for uint;

  MyBitBurner public mybBurner;
  address public owner;

  uint public decimals = 1000000000000000000;
  uint public mybFee = 250;
  bool public expired = false;

  constructor() public{
    owner = msg.sender;
  }

  // @notice If called by owner, this function prevents more Trust contracts from being made once
  // @notice Old contracts will continue to function
  function closeContract()
  external {
    require(msg.sender == owner);
    require (!expired);
    expired = true;
  }

  function changeMYBFee(uint _newFee)
  external {
    require(msg.sender == owner);
    mybFee = _newFee;
  }

  //Overloaded functions
  function encode(string _label, bytes32 _arg1) pure public returns(bytes32){
    return keccak256(abi.encodePacked(_label, _arg1));
  }

  function encode(string _label, bytes32 _arg1, bytes32 _arg2) pure public returns(bytes32){
    return keccak256(abi.encodePacked(_label, _arg1, _arg2));
  }

  function encode(string _label, bytes32 _arg1, uint _arg2) pure public returns(bytes32){
    return keccak256(abi.encodePacked(_label, _arg1, _arg2));
  }

  function encode(string _label, address _arg1, address _arg2, uint _arg3, uint _arg4) pure public returns(bytes32){
    return keccak256(abi.encodePacked(_label, _arg1, _arg2, _arg3, _arg4));
  }

}
