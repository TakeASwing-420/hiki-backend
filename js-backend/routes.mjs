import { usercontract} from './web3helper.mjs'; 
import express from 'express';
import { generateProof, verifyProof } from './verifier.mjs';
import crypto from "crypto";

const router = express.Router();
const gasLimit = 100000;

router.post("/update-password", async (req, res) => {
  const {username,  private_key , previous_password, new_one ,confirm_password} = req.body;

  if (!(new_one === confirm_password))
    res.status(401).json({error : "Passwords do not match"});
  else if(!(new_one.length >= 3 && confirm_password.length <= 6))
    res.status(401).json({error : "Passwords should be between 3 to 6 characters"});
  else {
    const user = await usercontract.wallets(username);
  if(verifyProof(previous_password, user.password, private_key)){
    const new_private_key = crypto.randomBytes(3).toString('hex');
    const commitment = crypto.createHash('sha256').update(new_one + new_private_key).digest('hex');

      try{
       const tx = await usercontract.Update_password(username, commitment, {
        gasLimit: gasLimit,
        maxFeePerGas: 250000000000,
        maxPriorityFeePerGas: 250000000000,
      });
      await tx.wait();
      res.status(200).json({private_key: new_private_key});
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message});
    }
    }
      else{
        res.status(401).json({ message: "Invalid credentials" });
      }
    
  }
}); 

router.post("/wallet", async (req, res) => {
  const { username} = req.body;
  try {
    const user = await usercontract.wallets(username);
    res.status(200).json({ message: "Wallet address fetched successfully!", wallet: user.wallet });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/delete-user", async (req, res) => {
  const { username, previous_password, private_key } = req.body;
  
  try {
    const user = await usercontract.wallets(username);

    if (user.wallet !== "0x0000000000000000000000000000000000000000") {
      if (verifyProof(previous_password, user.password, private_key)) {

        const tx = await usercontract.delete_user(username,{
          gasLimit: gasLimit,
          maxFeePerGas: 250000000000,
          maxPriorityFeePerGas: 250000000000,
        }); 
        await tx.wait();
        res.status(200).json({ message: "User deleted successfully!" });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } else {
      res.status(401).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/update-wallet", async (req, res) => {
  const { username, wallet} = req.body;
  
  try {
    const user = await usercontract.wallets(username);
    if (user.wallet !== "0x0000000000000000000000000000000000000000") {

        const tx = await usercontract.Update_address(username, wallet, {
          gasLimit: gasLimit,
          maxFeePerGas: 250000000000,
          maxPriorityFeePerGas: 250000000000,
        }); 
        await tx.wait();
        res.status(200).json({ message: "Wallet Updated successfully!" });
      
    } else {
      res.status(401).json({ message: "Requested wallet can't be updated as it is not attached to the account" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/balance", async (req, res) => {
  const { username } = req.body;

  try {
    const user = await usercontract.wallets(username);
    const user_balance = await usercontract.balanceOf(user.wallet);
    res.status(200).json({ _balance: user_balance.toString()});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/get-challenges", async (req, res) => {
  const { username } = req.body;

  try {
    if (!username) {
      throw new Error("Username is missing in the request body");
    }
    const user = await usercontract.wallets(username);
    const challenge_list = [user.c1,user.c2,user.c3,user.c4,user.c5,user.c6];
    res.status(200).json({ challenges: challenge_list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
