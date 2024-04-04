//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./database_helper.sol";

contract Hikiko is ERC20Capped, Ownable, UserDB, ERC20Burnable{ 
    address public Manager;
    
    uint256 public limit = 2000000000 ;
    uint256 public initial_coinbase = 10000000 ; 
    
    constructor() ERC20("Relife", "R") ERC20Capped(limit) Ownable() {
        Manager = msg.sender;
        _mint(Manager, initial_coinbase);
    }

      function _mint(address account, uint256 amount) internal override(ERC20, ERC20Capped) {
        ERC20Capped._mint(account, amount);
    }

    // Allow users to transfer tokens to the Manager when redeeming rewards
    function redeemTokens(uint256 amount, string calldata name) public onlyOwner {
        address x= wallets[name].wallet;
        _transfer(x, Manager, amount);
    }

    // Allow the user to fetch tokens from the contract
    function fetchTokens(uint256 amount,string calldata name) public onlyOwner{
        address x= wallets[name].wallet;
        transfer(x, amount);
    }

    function delete_user(string calldata name) public onlyOwner{
        address x= wallets[name].wallet;
        uint256 amount = balanceOf(x);
        _transfer(x, Manager, amount); // Transfer all the amount of tokens before deletion
        burn(amount);//burn the extra tokens
        delete wallets[name];
    }

    // Function to check if minting is needed
    function shouldMintCoins() internal view returns (bool) {
        return balanceOf(Manager) < initial_coinbase / 10;
    }

    // Function to mint coins to the manager
    function additionalcoins() private {
        uint256 a;
        if(shouldMintCoins()==false){ 
            a=0;
        }
        else{
        a = (initial_coinbase / 2) - balanceOf(Manager);
        _mint(Manager,a);
              }
    }

    //Update the wallet address
    function Update_address(string calldata name, address data) public onlyOwner{
        address x= wallets[name].wallet;
        uint256 amount = balanceOf(x);
        _transfer(x, data, amount);//Before doing so send the existing tokens to new account
         wallets[name].wallet = data;
    }
    
    function saveUser(address wallet, string memory name, string memory password) public onlyOwner {
        wallets[name].username = name;
        wallets[name].wallet = wallet;
        wallets[name].password = password;
    }

    function Update_password(string calldata name, string memory data) public onlyOwner {
        wallets[name].password = data;
    }

    function Update_profile(string calldata name, string memory data) public onlyOwner {
        wallets[name].cid = data;
    }
   function setChallenges(string calldata name, uint256 challengeIndex, bool isActive) public onlyOwner {
    if (challengeIndex == 0) {
        wallets[name].c1 = isActive;
    } else if (challengeIndex == 1) {
        wallets[name].c2 = isActive;
    } else if (challengeIndex == 2) {
        wallets[name].c3 = isActive;
    } else if (challengeIndex == 3) {
        wallets[name].c4 = isActive;
    } else if (challengeIndex == 4) {
        wallets[name].c5 = isActive;
    } else if (challengeIndex == 5) {
        wallets[name].c6 = isActive;
    }
}


}