import { ethers } from "ethers";
import { create as ipfsHttpClient } from "ipfs-http-client";
import abi from "./userdb.json" assert { type: "json" };
import express from 'express';
import multer from 'multer'; 
import { generateProof, verifyProof, generateToken, verifyToken } from './verifier.mjs';
import { config } from 'dotenv';
import routes from './routes.mjs';
import fs from 'fs';

config();
const privateKey = process.env.PRIVATE_KEY; //! use your own private key in a .env file
const app = express();
app.use(express.json(),routes);

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
export const contractaddress = "0x0A2A867D8a6a2D2f41d96546B163E5329F8D4637";

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/register", async (req, res) => {
  const { wallet, username, confirm_password, password } = req.body;
  const user = await usercontract.wallets(username);
  if (!(password === confirm_password))
    res.status(401).json({error : "Passwords do not match"});
  else if (user.username === username){
    res.status(401).json({ error: "Username already exists"});
  }  else {
    try {
      const { commitment, private_key } = generateProof(password);
      await usercontract.saveUser(wallet, username, commitment);
      const user = await usercontract.wallets(username);      
      const token = generateToken({ username: user.username });
      res.status(200).json({private_key: private_key, token: token});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error Encountered"});
    }
  }
});

app.post("/login", async (req, res) => {
  const { username, password, private_key } = req.body;

  try {
    const user = await usercontract.wallets(username);

    if (user.wallet !== "0x0000000000000000000000000000000000000000") {
      const hashedPassword = user.password;
      if (verifyProof(password, hashedPassword, private_key)) {
        const token = generateToken({ username: user.username });
        res.status(200).json({token: token });
      } else {
        res.status(401).json({error: "Invalid credentials" });
      }
    } else {
      res.status(401).json({error: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/user-info", verifyToken, async (req, res) => {
  const { username } = req.body;
  try {
    const _user = await usercontract.wallets(username);
    res.status(200).json({ user: _user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on ${port}`);
});
