pragma solidity ^0.4.24;

/// @title Payroll smart contract for simple payroll distribution
/// @author Kyle Dewhurst, MyBit Foundation
/// @notice Allows owner of organization set the addresses and how much to distribute to employees

import './SafeMath.sol';
import './ERC20.sol';

contract MyBitBurner {
  using SafeMath for uint;

  ERC20 public mybToken;
  address public owner;
  mapping (address => bool) public authorizedBurner;

  constructor(address _myBitTokenAddress)
  public {
    mybToken = ERC20(_myBitTokenAddress);
    owner = msg.sender;
  }


  function burn(address _tokenHolder, uint _amount)
  external
  returns (bool) {
    require(authorizedBurner[msg.sender]);
    require(mybToken.allowance(_tokenHolder, address(this)) >= _amount);
    require(mybToken.burnFrom(_tokenHolder, _amount));
    emit LogMYBBurned(_tokenHolder, msg.sender, _amount);
    return true;
  }

  function authorizeBurner(address _burningContract)
  external
  returns (bool) {
    require(msg.sender == owner);
    require(!authorizedBurner[msg.sender]);
    authorizedBurner[_burningContract] = true;
    emit LogBurnerAuthorized(msg.sender, _burningContract);
    return true;
  }

  function removeBurner(address _burningContract)
  external
  returns (bool) {
    require(msg.sender == owner);
    require(authorizedBurner[msg.sender]);
    delete authorizedBurner[_burningContract];
    return true;
  }

  event LogMYBBurned(address _tokenHolder, address _burningContract, uint _amount);
  event LogBurnerAuthorized(address _owner, address _burningContract);
}
