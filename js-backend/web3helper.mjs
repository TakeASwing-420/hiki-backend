import { ethers } from "ethers";
import abi from "./userdb.json" assert { type: "json" };
import express from 'express';
import { generateProof, verifyProof, generateToken, verifyToken} from './verifier.mjs';
import { config } from 'dotenv';
import routes from './routes.mjs';

config();
const privateKey = process.env.PRIVATE_KEY; //! use your own private key in a .env file
const app = express();
app.use(express.json(),routes);
export const contractaddress = process.env.CONTRACT_ADDRESS;//!use your deployed contract's address here

export const provider = new ethers.JsonRpcProvider("https://sepolia.optimism.io");
const manager_wallet_private_key = privateKey;
const manager = new ethers.Wallet(manager_wallet_private_key, provider);
export const usercontract = new ethers.Contract(contractaddress, abi, manager);

// Define gas limit based on the previous transaction's gas limit
const gasLimit = 50000; // Adjusted gas limit


app.post("/update-cid", async (req, res) => {
  const {username, cid} = req.body;
  try {
    await usercontract.Update_profile(username, cid);
    res.status(200).json({ message: "cid updated successfully"});
  } catch (error) { 
    res.status(500).json({ error: error.message });
  }
});

app.post("/redeem-tokens",async (req, res) => {
  const {amount, name} = req.body;
  try {
    await usercontract.redeemTokens(amount, name);  
    res.status(200).json({ message: `${amount} Tokens redeemed successfully!` });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get('/', (req, res) => {
  res.status(200).send('OK');
});

app.post("/register", async (req, res) => {
  const { wallet, username, confirm_password, password } = req.body;
  const user = await usercontract.wallets(username);
  if (!(password === confirm_password))
    res.status(401).json({error : "Passwords do not match"});
  else if(!(password.length >= 3 && password.length <= 6))
    res.status(401).json({error : "Passwords should be between 3 to 6 characters"});
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
      
      res.status(500).json({ error: error.message});
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
        res.status(200).json({token: token, cid: user.cid });
      } else {
        res.status(401).json({error: "Invalid credentials" });
      }
    } else {
      res.status(401).json({error: "User not found" });
    }
  } catch (error) {
    
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/protected-route", verifyToken, async (req, res) => {
  try {
    const { username } = req.user; 
    const user = await usercontract.wallets(username);
    if (user) {
      res.status(200).json({ user: user });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
 
    res.status(500).json({ error: "Internal server error" });
  }
}); 

app.post("/redeem-tokens",async (req, res) => {
  const {amount, name} = req.body;
  try {
    await usercontract.redeemTokens(amount, name);  
    res.status(200).json({ message: `${amount} Tokens redeemed successfully!` });
  } catch (error) {
    console.error(error.message);
    
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/fetch-tokens", async (req, res) => {
  const { amount, name } = req.body;
  const user = await usercontract.wallets(name);
  try {
    // const _nonce = await manager.getNonce();
    const tx = await usercontract.fetchTokens(amount, name, {
      gasLimit: gasLimit,
      maxFeePerGas: 250000000000,
      maxPriorityFeePerGas: 250000000000,
    });
    await tx.wait();
    res.status(200).json({ message: `${amount} Tokens fetched successfully!` });
  } catch (error) {
    console.log("fetch-tokens");
    console.error(error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/set-challenges", async (req, res) => {
  const { username, challengeIndex, isActive } = req.body;
  try {
    const tx = await usercontract.setChallenges(username, challengeIndex, isActive,{
      gasLimit: gasLimit,
      maxFeePerGas: 250000000000,
      maxPriorityFeePerGas: 250000000000,
    });
    await tx.wait();
    res.status(200).send("Challenge set successfully");
  } catch (error) {
    res.status(500).json({ error: "Error setting challenge" });
    console.log("set-challenges");
    console.error(error.message);
  }
});

const port = process.env.PORT;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running on ${port}`);
});
