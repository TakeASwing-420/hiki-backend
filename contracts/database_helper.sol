// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract UserDB {
    struct user {
        string username;//use username as index while creating event
        string password;
        address wallet;
        string cid;//ipfs cid will be stored here 
        bool[6] challenges;//set true for those challenges are active
    }
    mapping(string => user) public wallets;
}