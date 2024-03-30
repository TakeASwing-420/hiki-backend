import crypto from 'crypto';
import jwt from 'jsonwebtoken'; 
import { config } from 'dotenv';

config();

export function generateProof(password) {
	const private_key = crypto.randomBytes(4).toString('hex');
	const commitment = crypto.createHash('sha256').update(password + private_key).digest('hex');
	return {commitment, private_key};
  }
  
export function verifyProof(password, actual_commitment, randomValue) {
	const computedCommitment = crypto.createHash('sha256').update(password + randomValue).digest('hex');
	return computedCommitment === actual_commitment;
  }

export const generateToken = (userData) => {
	return jwt.sign(userData, process.env.JWT_SECRET, { expiresIn: '24h' });
  };

export const verifyToken = (req, res, next) => {
	const token = req.headers['authorization'];
	if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
	jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
	  if (err) return res.status(401).json({ error: 'Unauthorized' });
	  req.user = decoded;
	  next();
	});
  };
