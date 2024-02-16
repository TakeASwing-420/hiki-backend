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
export const contractaddress = "0x8ad36Bd2E911959550Bf57507F4A99e95A5C7d31";

export const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/q1jVC3tLd3_PoadQyMR08osZJ8SDKEqq");

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
      const blockNumber = await provider.getBlockNumber();
      addAddressToRegistry(wallet);
      const user = await usercontract.wallets(username);
      res.status(200).json({ message: "User registered successfully!", private_key: private_key, _user: user });
      console.log('Current block number:', blockNumber);
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

// !3. create a purchase(input should not be a single item but a list of goods) api using mongoDB, mySQL or cloud in node.js and the api should also return the deducted balance from user but....

// !4. while updating the user balance using redeem tokens or fetch tokens api move the incoming requests into a queue.
// !   Process this queue once in a 48 hours...as if you process ech query instantly you will be paying much gas fees.
// !  But here is the catch! you must be able to return the deducted balance or increased balance as if it was actually
// !  processed.Use database for storing balance

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

const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on ${port}`);
});
