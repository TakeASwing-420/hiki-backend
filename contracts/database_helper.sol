//SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract UserDB {
    struct user {
        string username;
        string password;
        address wallet;
        string cid; // IPFS CID will be stored here 
        bool c1;
        bool c2;
        bool c3;
        bool c4;
        bool c5;
        bool c6; // Set true for those challenges that are active
        
    }
  mapping(string => user) public wallets;
}
