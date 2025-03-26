import crypto from "crypto";

/**
 * Converts an ArrayBuffer to a Base64 encoded string.
 * Useful for storing or transmitting binary data in a textual format.
 * @param {ArrayBuffer} buffer - The buffer to be converted to Base64.
 * @returns {string} - Base64 encoded string.
 */
export const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(byte => binary += String.fromCharCode(byte));
    return window.btoa(binary);
};
  
/**
 * Converts a Base64 encoded string to an ArrayBuffer.
 * This is used to convert textual binary data back into a usable ArrayBuffer.
 * @param {string} base64 - The Base64 string to be converted to ArrayBuffer.
 * @returns {ArrayBuffer} - The resulting ArrayBuffer.
 */
export const base64ToArrayBuffer = (base64) => {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
};


/**
 * Generates an RSA key pair (public and private keys) for encryption and decryption.
 * Exports the keys as Base64 strings for easy storage and usage.
 * @returns {Promise<{public_key: string, private_key: string}>} - The RSA key pair as Base64 strings.
 */
export const generateRSAKeyPair = async () => {
    try {
        const keyPair = await crypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );
    

        const publicKeyArrayBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
        const privateKeyArrayBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

        return {
            public_key: arrayBufferToBase64(publicKeyArrayBuffer),
            private_key: arrayBufferToBase64(privateKeyArrayBuffer),
        };
    } catch (error) {
        throw new Error("Key generation failed.");
    }
};

/**
 * Encrypts data using the provided RSA public key.
 * @param {string} data - The plaintext data to be encrypted.
 * @param {CryptoKey} publicKey - The RSA public key used for encryption.
 * @returns {Promise<string>} - The encrypted data as a Base64 string.
 */

export const encryptWithPublicKey = async (data, publicKey) => {
  const enc = new TextEncoder();
  const encoded = enc.encode(data);

  const encrypted = await crypto.subtle.encrypt(
      {
          name: "RSA-OAEP",
      },
      publicKey,
      encoded
  );

  return arrayBufferToBase64(encrypted);
};

/**
 * Imports a private RSA key from a Base64 string for use in decryption or signing.
 * @param {string} base64Key - The Base64-encoded private key.
 * @param {string} [useFor='decrypt'] - Specifies whether the key is used for 'decrypt' or 'sign'.
 * @returns {Promise<CryptoKey>} - The imported private key.
 */
export const importPrivateKey = async (base64Key, useFor = 'decrypt') => {
    try {
        const keyBuffer = base64ToArrayBuffer(base64Key);
        let keyUsages;
        let algorithmName;

        if (useFor === 'decrypt') {
            keyUsages = ['decrypt'];
            algorithmName = 'RSA-OAEP';
        } else if (useFor === 'sign') {
            keyUsages = ['sign'];
            algorithmName = 'RSASSA-PKCS1-v1_5';  // Or 'RSA-PSS' if you're using that
        } else {
            throw new Error('Invalid useFor parameter. Use "decrypt" or "sign".');
        }

        return await crypto.subtle.importKey(
            "pkcs8",
            keyBuffer,
            {
                name: algorithmName,
                hash: { name: "SHA-256" }
            },
            true,
            keyUsages
        );
    } catch (error) {
        throw new Error("Failed to import private key.");
    }
};

/**
 * Imports a public RSA key from a Base64 string for use in encryption or signature verification.
 * @param {string} base64Key - The Base64-encoded public key.
 * @param {string} [useFor='encrypt'] - Specifies whether the key is used for 'encrypt' or 'verify'.
 * @returns {Promise<CryptoKey>} - The imported public key.
 */
export const importPublicKey = async (base64Key, useFor = 'encrypt') => {
    try {
        const keyBuffer = base64ToArrayBuffer(base64Key);
        let keyUsages;
        let algorithmName;

        if (useFor === 'encrypt') {
            keyUsages = ['encrypt'];
            algorithmName = 'RSA-OAEP';
        } else if (useFor === 'verify') {
            keyUsages = ['verify'];
            algorithmName = 'RSASSA-PKCS1-v1_5';  // Or  if you're using that
        } else {
            throw new Error('Invalid useFor parameter. Use "encrypt" or "verify".');
        }

        return await crypto.subtle.importKey(
            "spki",
            keyBuffer,
            {
                name: algorithmName,
                hash: { name: "SHA-256" }
            },
            true,
            keyUsages
        );
    } catch (error) {
        throw new Error("Failed to import public key.");
    }
};

/**
 * Decrypts encrypted data using the provided RSA private key.
 * @param {string} encryptedData - The Base64-encoded encrypted data.
 * @param {CryptoKey} importedPrivateKey - The RSA private key used for decryption.
 * @returns {Promise<string>} - The decrypted plaintext data.
 */
export const decryptWithPrivateKey = async (encryptedData, importedPrivateKey) => {  
    const decrypted = await crypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        importedPrivateKey,
        base64ToArrayBuffer(encryptedData)
    );

    return new TextDecoder().decode(decrypted);
};

/**
 * Signs data using the provided RSA private key.
 * @param {string} data - The plaintext data to be signed.
 * @param {CryptoKey} privateKey - The RSA private key used for signing.
 * @returns {Promise<string>} - The generated signature as a Base64 string.
 */
export const signWithPrivateKey = async (data, privateKey) => {
    try {
        const enc = new TextEncoder();
        const encoded = enc.encode(data);

        const signature = await crypto.subtle.sign(
            {
                name: "RSASSA-PKCS1-v1_5",  // Ensure this matches with the key's algorithm
                saltLength: 32  
            },
            privateKey,
            encoded
        );

        return arrayBufferToBase64(signature);
    } catch (error) {
        throw new Error("Failed to sign data.");
    }
};

/**
 * Verifies a signature using the provided RSA public key.
 * @param {string} data - The plaintext data to verify.
 * @param {string} signatureBase64 - The Base64-encoded signature.
 * @param {CryptoKey} publicKeyBuffer - The RSA public key used for verification.
 * @returns {Promise<boolean>} - Whether the signature is valid or not.
 */

export const verifySignatureWithPublicKey = async (data, signatureBase64, publicKeyBuffer) => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const signatureBuffer = base64ToArrayBuffer(signatureBase64);

  const isValid = await crypto.subtle.verify(
      {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
      },
      publicKeyBuffer,
      signatureBuffer,
      dataBuffer
  );

  return isValid;
};

/**
 * Checks which users have signed a specific piece of data.
 * Iterates through a list of signatures and verifies them against public keys.
 * @param {string[]} signatures - An array of Base64-encoded signatures.
 * @param {string} username - The username associated with the public key.
 * @param {string} data - The data that was signed.
 * @returns {Promise<string | null>} - The username of the valid signer, or null if no valid signer is found.
 */
export const checkSignatures = async (signatures, username, data) => {
    // Loop through each signature and username
    for (let i = 0; i < signatures.length; i++) {
        const signature = signatures[i];
        const publicKeyBase64 = getSecret(`${username}_public_key`); 

        if (!publicKeyBase64) {
            continue;
        }

        // Import the public key
        const publicKey = await importPublicKey(publicKeyBase64, 'verify');

        // Verify the signature with the public key
        const isValid = await verifySignatureWithPublicKey(data, signature, publicKey);

        // If valid, add the username to the signedUsers array
        if (isValid) {
            return username;
        }
    }
    return null;
};
