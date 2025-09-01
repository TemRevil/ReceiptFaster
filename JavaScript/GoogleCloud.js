import { Receipt } from './Main.js';
import { parseTalabatReceipt } from './LayoutsReceipts/receipt-talabat.js';

// -----------------------------------------
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyCT4q9P5jHjSLo-gKJsFY5rS-lrmKzZawE",
    authDomain: "receiptfaster1.firebaseapp.com",
    projectId: "receiptfaster1",
    storageBucket: "receiptfaster1.firebasestorage.app",
    messagingSenderId: "788987450794",
    appId: "1:788987450794:web:cfd4ba2e5f9e65106a87d3",
    measurementId: "G-G2FKYEV3MM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// -----------------------------------------
const API_KEY = 'AIzaSyD67ovCEv5bm8eVmvdy4EC0t2SbTJrRgO0';
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

async function vision(imageData) {
    try {
        if (!imageData) {
            console.error('No image data provided');
            return;
        }

        // Convert image data to base64 (remove data:image/jpeg;base64, prefix)
        const base64Image = imageData.split(',')[1];

        // Prepare the request
        const requestBody = {
            requests: [
                {
                    image: {
                        content: base64Image
                    },
                    features: [
                        {
                            type: 'TEXT_DETECTION',
                            maxResults: 50
                        },
                        {
                            type: 'DOCUMENT_TEXT_DETECTION',
                            maxResults: 50
                        }
                    ]
                }
            ]
        };

        // Make API request
        const response = await fetch(`${VISION_API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error('Failed to analyze image');
        }

        const data = await response.json();
        
        // Get text annotations
        const textAnnotations = data.responses[0].textAnnotations;
        if (textAnnotations && textAnnotations.length > 0) {
            const fullText = textAnnotations[0].description;
            
            // Try to parse as Talabat receipt
            const parsedReceipt = parseTalabatReceipt(fullText);
            if (parsedReceipt) {
                console.log('Receipt Details:', parsedReceipt);
                Receipt(JSON.stringify(parsedReceipt, null, 2));
            }
        } else {
            console.error('No text detected in the image');
        }

    } catch (error) {
        console.error('Error analyzing image:', error);
    }
}

// -----------------------------------------
// EXPORTS
export { vision };
