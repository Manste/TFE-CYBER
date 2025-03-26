import {arrayBufferToBase64} from './rsaUtils';
import crypto from 'crypto';
import {encryptWithPublicKey, signWithPrivateKey, decryptWithPrivateKey, base64ToArrayBuffer, verifySignatureWithPublicKey} from './rsaUtils';

export const exportKey = async (key) => {
  const exportedKey = await window.crypto.subtle.exportKey(
    'raw', // Export the key in its raw format
    key
  );
  return exportedKey;
};

export const importKey = async (rawKey) => {
  const key = await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    {
      name: 'AES-GCM',
    },
    true,// Extractable
    ['encrypt', 'decrypt']
  );
  return key;
};

export const importHmacKey = async (rawKey) => {
  return await window.crypto.subtle.importKey(
    'raw',
    rawKey,
    {
      name: 'HMAC',
      hash: { name: 'SHA-256' } // Ensure this matches the HMAC hash function
    },
    true, // Non-extractable for HMAC
    ['sign', 'verify']
  );
};
export const encryptDatachunk = async (data, key) => {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Generate a random Initialization Vector (IV)

  // Convert Blob to ArrayBuffer (if data is Blob)
  let dataBuffer;
  if (data instanceof Blob) {
    dataBuffer = await data.arrayBuffer();
  } else {
    throw new Error("Data to encrypt must be a Blob.");
  }

  // Encrypt the data
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv, // Initialization vector
    },
    key, // AES key
    dataBuffer // Data as ArrayBuffer
  );

  return {
    encrypted_data: arrayBufferToBase64(encryptedBuffer), // Base64 for storage or transmission
    iv: arrayBufferToBase64(iv), // IV as Base64
  };
};


export const encryptData = async (data, key) => {
  const encoder = new TextEncoder(); // Encode the data as a Uint8Array
  const encoded_data = encoder.encode(data);
  
  const iv = crypto.getRandomValues(new Uint8Array(12)); // Generate a random Initialization Vector (IV)

  const encrypted_data = await crypto.subtle.encrypt(
      {
          name: "AES-GCM",
          iv: iv  // Initialization vector
      },
      key,  // The AES key
      encoded_data  // Data to encrypt
  );

  return {
      encrypted_data: arrayBufferToBase64(new Uint8Array(encrypted_data)), // Convert to a Uint8Array for easier handling
      iv: arrayBufferToBase64(iv)  // Return the IV used for encryption
  };
};

export const decryptData = async (encryptedObject, key) => {
   // Extract the encrypted data and IV from the provided object
   const encryptedBuffer = base64ToArrayBuffer(encryptedObject.encrypted_data);
   const ivBuffer = base64ToArrayBuffer(encryptedObject.iv);

   // Decrypt the data using the Web Crypto API
   const decryptedBuffer = await crypto.subtle.decrypt(
     {
       name: "AES-GCM",
       iv: ivBuffer // Initialization vector (must be the same as used during encryption)
     },
     key,  // The AES key (CryptoKey)
     encryptedBuffer // Data to decrypt (ArrayBuffer or Uint8Array)
   );

   // Decode the decrypted data back to a string
   const decoder = new TextDecoder();
   const decryptedData = decoder.decode(decryptedBuffer);

   return decryptedData; // Return the decrypted string
};

export const decryptDataChunk = async (encryptedObject, key) => {
  try {
    // Convert Base64-encoded strings back to ArrayBuffers
    const encryptedBuffer = base64ToArrayBuffer(encryptedObject.encrypted_data);
    const ivBuffer = base64ToArrayBuffer(encryptedObject.iv);

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuffer, // Ensure this matches the encryption IV
      },
      key, // AES key
      encryptedBuffer // Encrypted data as ArrayBuffer
    );

    // Return decrypted data as a Blob
    return new Blob([decryptedBuffer], { type: "video/webm" });
  } catch (error) {
    console.error("Error decrypting data chunk:", error);
    throw new Error("Decryption failed.");
  }
};



export const generateSymmetricKey = async () => {
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256, // Length of the key in bits
      },
      true, // Whether the key is extractable (i.e., can be used for export)
      ['encrypt', 'decrypt'] // Usages
    );
    return key;
};

export const generateHMACKey = async () => {
    return await crypto.subtle.generateKey(
      {
        name: 'HMAC',
        hash: { name: 'SHA-256' },
        length: 256,
      },
      true,
      ['sign', 'verify']
    );
};

export const generateMAC = async (message, key) => {
    const enc = new TextEncoder();
    const messageBuffer = enc.encode(message);
    
    const mac = await crypto.subtle.sign(
      {
        name: 'HMAC',
        hash: { name: 'SHA-256' }
      },
      key,
      messageBuffer
    );
    
    return arrayBufferToBase64(mac);
};
  
export const verifyMAC = async (message, mac, key) => {
  const enc = new TextEncoder();
  const messageBuffer = enc.encode(message);

  // Convert the provided MAC from Base64 to ArrayBuffer
  const macBuffer = base64ToArrayBuffer(mac);

  // Use the Web Crypto API to verify the HMAC
  const isValid = await crypto.subtle.verify(
    {
      name: 'HMAC',
      hash: { name: 'SHA-256' }, // Ensure this matches the hash used in HMAC
    },
    key,         // HMAC key
    macBuffer,   // The MAC to be verified (in ArrayBuffer form)
    messageBuffer // The original message data (in ArrayBuffer form)
  );

  return isValid;
};


export const deriveKeyFromWord = async (word) => {
  try {
    // Convert word and salt to Uint8Array
    const encoder = new TextEncoder();
    const wordBuffer = encoder.encode(word);
    const saltBuffer = crypto.getRandomValues(new Uint8Array(16)); // Use a random salt if not provided

    // Import the word as raw key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      wordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive the AES key from the word and salt
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000, // Use a high number of iterations for security
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return {
      derivedKey,
      salt: arrayBufferToBase64(saltBuffer) // Return the salt for future use
    };
  } catch (error) {
    throw new Error('Failed to derive AES key.');
  }
};

const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
};

export const encryptImage = async (file, key) => {
  const data = await readFileAsArrayBuffer(file);
  const iv = crypto.getRandomValues(new Uint8Array(12)); 

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  
  // Combine IV and encrypted data
  const combinedBuffer = new Uint8Array(iv.byteLength + encryptedBuffer.byteLength);
  combinedBuffer.set(new Uint8Array(iv), 0);
  combinedBuffer.set(new Uint8Array(encryptedBuffer), iv.byteLength);

  return combinedBuffer;
};

export const decryptAndDisplayImage = async (combinedBuffer, key) => {
  try {
    const decryptedData = await decryptImage(combinedBuffer, key);
    const blob = new Blob([decryptedData]);
    const url = URL.createObjectURL(blob);
    return url;
  } catch (error) {
    console.error('Decryption failed', error);
  }
};

const extractIVAndEncryptedContent = (combinedBuffer) => {
  const iv = combinedBuffer.slice(0, 12);
  const encryptedContent = combinedBuffer.slice(12);
  return { iv, encryptedContent };
};

const decryptImage = async (combinedBuffer, key) => {
  const { iv, encryptedContent } = extractIVAndEncryptedContent(combinedBuffer);
  const cryptoKey = await importKey(key);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    cryptoKey,
    encryptedContent
  );

  return new Uint8Array(decryptedBuffer);
};

export const encryptAndSignKey = async (key, publicKey, privateKey) => {
    try {
        const exportedKey = await exportKey(key);
        const base64Key = arrayBufferToBase64(exportedKey);      
        const encryptedKey = await encryptWithPublicKey(base64Key, publicKey);   
        const signedKey = await signWithPrivateKey(encryptedKey, privateKey);        
        return { key: encryptedKey, signature: signedKey };
    } catch (error) {
        throw new Error("Failed to encrypt and sign the key.");
    }
};

export const decryptAndVerifyKey = async (encryptedKey, signedKey, publicKey, privateKey) => {
    try {
        const decryptedBase64Key = await decryptWithPrivateKey(encryptedKey, base64ToArrayBuffer(privateKey));
        const decryptedKeyBuffer = base64ToArrayBuffer(decryptedBase64Key);
        const importedKey = await importKey(decryptedKeyBuffer);
        const isKeyValid = await verifySignatureWithPublicKey(decryptedBase64Key, signedKey, publicKey);
        if (!isKeyValid) {
            throw new Error('Key verification failed.');
        }
        return importedKey;
    } catch (error) {
        throw new Error('Failed to decrypt and verify key.');
    }
};

export const deriveKEKFromPassphrase = async (passphrase_user, salt) => {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(passphrase_user),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
  
    const passphrase = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: typeof salt === "string" ? base64ToArrayBuffer(salt) : salt,  // Always use a unique salt!
        iterations: 100000,  
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },  // AES-256 for encryption
      false,
      ["encrypt", "decrypt"]
    );

    return {
        passphrase,
        salt: arrayBufferToBase64(salt)
    }
 };

export const encryptPrivateKey = async (privateKey, kek) => {
    const iv = crypto.getRandomValues(new Uint8Array(12));  // 96-bit IV for AES-GCM
  
    const encryptedKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      kek,
      privateKey
    );
  
    return {
      iv: arrayBufferToBase64(iv),
      encryptedKey: arrayBufferToBase64(encryptedKey),
    };
};

export const decryptPrivateKey = async (encryptedData, kek) => {
    const iv = base64ToArrayBuffer(encryptedData.iv);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      kek,
      await base64ToArrayBuffer(encryptedData.encryptedKey)
    );
    return arrayBufferToBase64(decrypted); // Returns ArrayBuffer (can import as CryptoKey if needed)
};
  
export const storeEncryptedKey = async (userId, encryptedData, salt) => {
    const request = indexedDB.open("CryptoStore", 1);
  
    request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains("keys")) {
        db.createObjectStore("keys", { keyPath: "userId" });
    }
    };

    request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction("keys", "readwrite");
    const store = tx.objectStore("keys");

    store.put({ userId, encryptedData, salt });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    };

    request.onerror = () => reject(request.error);
  };

export const loadPrivateKey = async (userId, userPassphrase) => {
    const encryptedData = await getEncryptedKeyFromIndexedDB(userId);
    const kek = await deriveKEKFromPassphrase(userPassphrase, encryptData.salt);
    return await decryptPrivateKey(encryptedData, kek);
  };

// Fetch from IndexedDB
const getEncryptedKeyFromIndexedDB = async (userId) => {
    const db = await indexedDB.open("CryptoStore", 1);
    return new Promise((resolve) => {
      db.onsuccess = () => {
        const tx = db.result.transaction("keys", "readonly");
        const store = tx.objectStore("keys");
        const request = store.get(userId);
        request.onsuccess = () => resolve(request.result);
      };
    });
};


export  const attemptDecryptPrivateKey = async (userId, passphrase) => {
    try {
      const encryptedData = await getEncryptedKeyFromIndexedDB(userId); 
      const kek = await deriveKEKFromPassphrase(passphrase, encryptedData.salt);
      return await decryptPrivateKey(encryptedData, kek);
    } catch (error) {
      console.error("Decryption failed (wrong passphrase?)", error);
      return null;
    }
  };