import { ethers } from "ethers";
import { create as ipfsHttpClient } from "ipfs-http-client";
import abi from "./userdb.json" assert { type: "json" };
import express from 'express';
import multer from 'multer'; 
import { generateProof, verifyProof } from './verifier.mjs';
import { config } from 'dotenv';
import routes from './routes.mjs';
import fs from 'fs';

config();
const privateKey = process.env.PRIVATE_KEY; //! use your own private key in a .env file
const app = express();
app.use(express.json(),routes);


//TODO 2. create a separate database to store registered addresses using mongoDb, mySQL or cloud in node.js or python to check valid address or not while registering a new user
const addressesFilePath = 'registered_addresses.json';

function getRegisteredAddresses() {
  try {
    const data = fs.readFileSync(addressesFilePath);
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

function addAddressToRegistry(address) {
  const registeredAddresses = getRegisteredAddresses();
  registeredAddresses.push(address);
  fs.writeFileSync(addressesFilePath, JSON.stringify(registeredAddresses));
}

function isAddressRegistered(address) {
  const registeredAddresses = getRegisteredAddresses();
  return registeredAddresses.includes(address);
}
//------------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads') 
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now(); 
    cb(null, `${timestamp}_${file.originalname}`); 
  }
});

const upload = multer({ storage: storage });

export const client = ipfsHttpClient("http://192.168.0.152:5002");
export const contractaddress = "0x6833b0fa623bac5cff3ac13bdcb66767452caa86";

export const provider = new ethers.JsonRpcProvider("https://nd-497-262-836.p2pify.com/378f9ce63323c084fccaf08dcf9a0e1f");

const manager_wallet_private_key = privateKey;
const manager = new ethers.Wallet(manager_wallet_private_key, provider);
export const usercontract = new ethers.Contract(contractaddress, abi, manager);

app.post("/upload", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error("No file uploaded");
    }
    const {username} = req.body;
    const fileContent = fs.readFileSync(req.file.path);
    const result = await client.add(fileContent);
    const cid = result.cid.toString();

    await client.pin.add(cid);
    fs.unlinkSync(req.file.path);
    await usercontract.Update_profile(username, cid);
    res.status(200).json({ message: "File uploaded successfully", cid: cid });
        } catch (error) 
     {
    console.error(error);
    res.status(500).json({ error: error.message });
     }
});
// TODO 5. return access token to keep user logged in using json web token in node.js (validity 24 hours)
app.post("/register", async (req, res) => {
  const { wallet, username, password } = req.body;
  const user = await usercontract.wallets(username);
  
  if (user.username === username){
    res.status(401).json({ error: "Username already exists"});
  } else if (isAddressRegistered(wallet)) {
    res.status(401).json({ error: "Address already registered"});
  } else {
    try {
      const { commitment, private_key } = generateProof(password);
      await usercontract.saveUser(wallet, username, commitment);
      addAddressToRegistry(wallet);
      const user = await usercontract.wallets(username);
      res.status(200).json({ message: "User registered successfully!", private_key: private_key, _user: user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error Encountered"});
    }
  }
});
// TODO 5. return access token to keep user logged in using json web token in node.js (validity 24 hours0
app.post("/login", async (req, res) => {
  const { username, password, private_key } = req.body;

  try {
    const user = await usercontract.wallets(username);

    if (user.wallet !== "0x0000000000000000000000000000000000000000") {
      const hashedPassword = user.password;

      if (verifyProof(password, hashedPassword, private_key)) {
        res.status(200).json({ loggedIn: true,_user: user});
      } else {
        res.status(401).json({ loggedIn: false, message: "Invalid credentials" });
      }
    } else {
      res.status(401).json({ loggedIn: false, message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/redeem-tokens",async (req, res) => {
  const {amount, name} = req.body;
  try {
    await usercontract.redeemTokens(amount, name);  
    res.status(200).json({ message: "Tokens redeemed successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/fetch-tokens",async (req, res) => {
  const {amount, name} = req.body;
  try {
    await usercontract.fetchTokens(amount, name);  
    res.status(200).json({ message: "Tokens fetched successfully!" });
  } 
  catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/set-challenges", async (req, res) => {
  const { username, challengeIndex, isActive } = req.body;

  try {
      // Call the setChallenges function in the smart contract
      const tx = await usercontract.setChallenges(username, challengeIndex, isActive);

      // Wait for the transaction to be mined
      await tx.wait();

      res.status(200).json({ message: "Challenges set successfully" });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error setting challenges" });
  }
});

const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on ${port}`);
});


