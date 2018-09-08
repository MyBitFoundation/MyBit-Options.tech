pragma solidity 0.4.24;

import "./SafeMath.sol";

contract SafeMathWrapper {
  using SafeMath for uint;
  using SafeMath for bytes;

  function multiply(uint256 a, uint256 b) external pure returns (uint256) {
    return a.mul(b);
  }

  function divide(uint256 a, uint256 b) external pure returns (uint256) {
    return a.div(b);
  }

  function subtract(uint256 a, uint256 b) external pure returns (uint256) {
    return a.sub(b);
  }

  function addto(uint256 a, uint256 b) external pure returns (uint256) {
    return a.add(b);
  }

  function fraction(uint256 _amount, uint256 _percentage) external pure returns (uint256) {
    return _amount.getFractionalAmount(_percentage);
  }

  function getUint(bytes b) external pure returns (uint256){
    return b.bytesToUint();
  }

}
