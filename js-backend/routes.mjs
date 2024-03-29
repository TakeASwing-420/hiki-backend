import { usercontract, provider, client } from './web3helper.mjs'; 
import express from 'express';
import { generateProof, verifyProof } from './verifier.mjs';
import fs from 'fs';
const router = express.Router();

router.post("/update-password", async (req, res) => {
  const { username, new_password } = req.body;

  try {
    const { commitment, private_key } = generateProof(new_password);
    await usercontract.Update_password(username, commitment);
    res.status(200).json({ message: "Password updated successfully!" , private_key: private_key});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error Encountered" });
  }
});

router.post("/update-wallet", async (req, res) => {
  const { username, new_wallet } = req.body;

  try {
    await usercontract.Update_address(username, new_wallet);
    res.status(200).json({ message: "Wallet address updated successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error Encountered" });
  }
});



router.delete("/delete-user", async (req, res) => {
  const { username, cid } = req.body;

  try {
    const user = await usercontract.wallets(username);

    if (user.wallet !== "0x0000000000000000000000000000000000000000") {
      await usercontract.delete_user(username);
      
      res.status(200).json({ message: "User deleted successfully!" });

      try {
        client.pin.rm(cid);
        console.log(`Content with CID ${cid} successfully unpinned.`);
      } catch (error) {
        console.error(`Error while unpinning content with CID ${cid}:`, error);
      }


    } else {
      res.status(401).json({ message: "User not found" });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error Encountered" });
  }
});


router.post("/balance", async (req, res) => {
  const { username } = req.body;

  try {
    const user = await usercontract.wallets(username);
    const user_balance = await usercontract.balanceOf(user.wallet);
    res.status(200).json({ _balance: user_balance.toString()});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error Encountered" });
  }
});

export default router;
