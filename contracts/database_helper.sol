// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract UserDB {
    struct user {
        string username;//use username as index while creating event
        string password;
        address wallet;
        bool ismentor;
    }
    mapping(string => user) public wallets;
}