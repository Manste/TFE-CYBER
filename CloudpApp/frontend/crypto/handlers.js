import crypto from "crypto";
import {generateMAC, generateSymmetricKey, generateHMACKey, encryptData, verifyMAC, decryptData, importKey, encryptAndSignKey, importHmacKey, storeEncryptedKey, encryptPrivateKey, getEncryptedKeyFromIndexedDB, deriveKEKFromPassphrase} from '@/crypto/symKeyUtils';
import {base64ToArrayBuffer, generateRSAKeyPair, decryptWithPrivateKey, verifySignatureWithPublicKey, importPrivateKey, importPublicKey, arrayBufferToBase64} from '@/crypto/rsaUtils';

export const handleRegistration = async(user_data) => {
    try {
        const key_pair = await generateRSAKeyPair();
        let public_key = key_pair.public_key;
        let private_key = key_pair.private_key;

        let salt = await crypto.getRandomValues(new Uint8Array(12));
        let kek = await deriveKEKFromPassphrase(userPassphrase, salt);
        const encryptedPrivateKey = await encryptPrivateKey(privateKey, kek);

        storeEncryptedKey(user_data.username, encryptedPrivateKey, arrayBufferToBase64(salt))

        if (!public_key || !private_key)
            throw new Error("Failed to generate RSA keys.");
  
        const symmetric_key = await generateSymmetricKey();
        const hmac_key = await generateHMACKey();
        const hmac_username = await generateMAC(user_data.username, hmac_key);
        const encrypted_email = JSON.stringify(await encryptData(user_data.email, symmetric_key));
        const hmac_email = await generateMAC(encrypted_email, hmac_key);
        const imported_public_key = await importPublicKey(public_key, 'encrypt'); // no need to do this again for videos
        const imported_private_key = await importPrivateKey(private_key, 'sign');
        const encrypted_signature_symmetric_key = await encryptAndSignKey(symmetric_key, imported_public_key, imported_private_key);
        const encrypted_signature_hmac_key = await encryptAndSignKey(hmac_key, imported_public_key, imported_private_key);
        
        var data = {
            username: user_data.username,
            hmac_username,
            email: encrypted_email,
            hmac_email,
            encrypted_symmetric_key: encrypted_signature_symmetric_key.key,
            signature_symmetric_key: encrypted_signature_symmetric_key.signature,
            encrypted_hmac_key: encrypted_signature_hmac_key.key,
            signature_hmac_key: encrypted_signature_hmac_key.signature,
            public_key,   
        };
        return data;
    } catch (error) {
        throw Error('Error during sign-up.');
    }
}

export const handleLogin = async(token) => {
    try {
        // TODO: encrypt the keys before storage
        /*
        localStorage.setItem(user_data.username + '_' + 'public_key', public_key);
        localStorage.setItem(user_data.username + '_' + 'private_key', private_key);
        */
    } catch (error) {
        throw Error('Error during login.');
    }
}


export const handleProfile = async(user_data) => {
    try {
        const {
            username,
            hmac_username,
            email: encrypted_email,
            hmac_email,
            encrypted_symmetric_key,
            signature_symmetric_key,
            encrypted_hmac_key,
            signature_hmac_key,
        } = user_data;

        // Retrieve and validate public key
        const public_key = localStorage.getItem(user_data.username + '_' + 'public_key');
        if (!public_key) throw new Error('Public key not found.');

        const private_key = localStorage.getItem(user_data.username + '_' + 'private_key');
        if (!private_key) throw new Error('Private key not found.');

        const imported_public_key = await importPublicKey(public_key, 'verify');
        const imported_private_key = await importPrivateKey(private_key, 'decrypt');

        // Verify the keys
        const is_symmetric_key_valid = await verifySignatureWithPublicKey(encrypted_symmetric_key, signature_symmetric_key, imported_public_key);
        const is_hmac_key_valid = await verifySignatureWithPublicKey(encrypted_hmac_key, signature_hmac_key, imported_public_key);
        if (!is_symmetric_key_valid || !is_hmac_key_valid) {
            // TODO delete user with false data
            //await deleteUser(username);
            throw new Error('Invalid user: The user\'s keys has been modified or is invalid.');
        }

        // Decrypt symmetric key
        const symmetric_key_base64 = await decryptWithPrivateKey(encrypted_symmetric_key, imported_private_key);
        const symmetric_key = await importKey(base64ToArrayBuffer(symmetric_key_base64));
        // Decrypt HMAC key
        const hmac_key_base64 = await decryptWithPrivateKey(encrypted_hmac_key, imported_private_key);
        const hmac_key = await importHmacKey(base64ToArrayBuffer(hmac_key_base64));

        // Verify the HMAC
        const is_username_valid = await verifyMAC(username, hmac_username, hmac_key);
        const is_email_valid = await verifyMAC(encrypted_email, hmac_email, hmac_key);
        if (!is_username_valid || !is_email_valid) {
            //await deleteUser(username);
            throw new Error('Invalid user: The user\'s data has been modified or is invalid.');
        }

        // Decrypt and verify user data
        const enc_email = JSON.parse(encrypted_email);
        const decrypted_email = await decryptData(enc_email, symmetric_key);
        return {
            username,
            email: decrypted_email
        };

    } catch (error) {
        throw Error('Unable to decrypt data.');
    }
};


export const handleImage = async (video_data) => {
    try {
        const {
            username,
            videos, // Array contenant les chemins des vidéos
            encrypted_symmetric_key_videos,
            signature_symmetric_key_videos,
            encypted_hmac_key_videos,
            signature_hmac_key_videos,
        } = video_data;

        // Récupération des clés publiques et privées
        const public_key = localStorage.getItem(username + '_public_key');
        if (!public_key) throw new Error('Clé publique introuvable.');

        const private_key = localStorage.getItem(username + '_private_key');
        if (!private_key) throw new Error('Clé privée introuvable.');

        const imported_public_key = await importPublicKey(public_key, 'verify');
        const imported_private_key = await importPrivateKey(private_key, 'decrypt');

        // Vérification des signatures numériques
        const is_symmetric_key_valid = await verifySignatureWithPublicKey(
            encrypted_symmetric_key_videos,
            signature_symmetric_key_videos,
            imported_public_key
        );

        if (!is_symmetric_key_valid) {
            throw new Error('Clés de vidéos invalides ou altérées.');
        }

        // Décryptage des clés symétriques et HMAC
        const symmetric_key_base64 = await decryptWithPrivateKey(encrypted_symmetric_key_videos, imported_private_key);
        const symmetric_key = await importKey(base64ToArrayBuffer(symmetric_key_base64));

        const hmac_key_base64 = await decryptWithPrivateKey(encypted_hmac_key_videos, imported_private_key);
        const hmac_key = await importHmacKey(base64ToArrayBuffer(hmac_key_base64));

        // Vérification des HMAC pour les vidéos
        const verified_videos = [];
        for (const video of videos) {
            const hmac_video = localStorage.getItem(username + '_hmac_video_' + video); // Récupérer le HMAC associé
            const is_video_valid = await verifyMAC(video, hmac_video, hmac_key);

            if (!is_video_valid) {
                throw new Error(`Données vidéo invalides ou altérées : ${video}`);
            }

            // Déchiffrer si besoin (si vidéos stockées chiffrées)
            const decrypted_video = await decryptData(video, symmetric_key);
            verified_videos.push(decrypted_video);
        }

        return {
            username,
            videos: verified_videos,
        };
    } catch (error) {
        console.error('Erreur dans handleVideo:', error.message);
        throw new Error('Impossible de traiter les informations des vidéos.');
    }
};


  