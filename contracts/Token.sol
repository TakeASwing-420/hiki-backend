//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./database_helper.sol";

contract Hikiko is ERC20Capped, Ownable, UserDB{ 
    address public Manager;
    
    uint256 public limit = 2000000000 ;
    uint256 public initial_coinbase = 10000000 ; 
    
    constructor() ERC20("Hikiko", "HK") ERC20Capped(limit) Ownable() {
        Manager = msg.sender;
        _mint(Manager, initial_coinbase);
    }

    // Allow users to transfer tokens to the Manager when redeeming rewards
    function redeemTokens(uint256 amount,address x) public onlyOwner {
        _transfer(x, Manager, amount);
    }

    // Allow the user to fetch tokens from the contract
    function fetchTokens(uint256 amount,address x) public onlyOwner{
        transfer(x, amount);
    }

    function delete_user(string memory name) public onlyOwner{
        address x= wallets[name].wallet;
        uint256 amount = balanceOf(x);
        _transfer(x, Manager, amount); // Transfer all the amount of tokens before deletion
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
    function Update_address(string memory name, address data) public onlyOwner{
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

    function Update_password(string memory name, string memory data) public onlyOwner {
        wallets[name].password = data;
    }

    function Update_mentorship(string memory name) public onlyOwner {
        wallets[name].ismentor = true;
    }

}
