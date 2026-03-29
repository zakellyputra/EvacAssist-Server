import crypto from 'crypto';

// Simple envelope encryption for incident PII
// In production, use KMS for key management
const INCIDENT_KEK = process.env.INCIDENT_KEK || 'default-dev-key-change-in-production';

class IncidentEncryption {
  // Generate a random DEK for each incident
  generateDEK() {
    return crypto.randomBytes(32); // 256-bit key
  }

  // Encrypt DEK with KEK
  encryptDEK(dek) {
    const cipher = crypto.createCipher('aes-256-gcm', INCIDENT_KEK);
    let encrypted = cipher.update(dek);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return {
      encrypted_dek: encrypted.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    };
  }

  // Decrypt DEK with KEK
  decryptDEK(encryptedDek, tag) {
    const decipher = crypto.createDecipher('aes-256-gcm', INCIDENT_KEK);
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    let decrypted = decipher.update(Buffer.from(encryptedDek, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
  }

  // Encrypt PII fields
  encryptField(plainText, dek) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', dek);
    cipher.setIV(iv);

    let encrypted = cipher.update(plainText, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return {
      encrypted: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    };
  }

  // Decrypt PII fields
  decryptField(encryptedData, dek) {
    const decipher = crypto.createDecipher('aes-256-gcm', dek);
    decipher.setIV(Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(Buffer.from(encryptedData.encrypted, 'hex'));
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  // Check if encryption is enabled
  isEnabled() {
    return !!INCIDENT_KEK && INCIDENT_KEK !== 'default-dev-key-change-in-production';
  }
}

const incidentEncryption = new IncidentEncryption();
export default incidentEncryption;