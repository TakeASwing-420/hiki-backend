import crypto from 'crypto';

export function generateProof(password) {
	const private_key = crypto.randomBytes(32).toString('hex');
	const commitment = crypto.createHash('sha256').update(password + private_key).digest('hex');
	return {commitment, private_key};
  }
  
export function verifyProof(password, actual_commitment, randomValue) {
	const computedCommitment = crypto.createHash('sha256').update(password + randomValue).digest('hex');
	return computedCommitment === actual_commitment;
  }

