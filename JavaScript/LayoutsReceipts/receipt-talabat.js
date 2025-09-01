/**
 * Parse Talabat receipt text to extract specific information
 * @param {string} text - The full text from Google Vision API
 * @returns {Object} Extracted receipt information
 */
export function parseTalabatReceipt(text) {
    // Split text into lines for easier processing
    const lines = text.split('\n').map(line => line.trim());
    const receipt = {
        type: 'talabat',
        orderNumber: '',
        referenceNumber: '',
        customerName: '',
        customerPhone: '',
        date: '',
        time: '',
        paymentMethod: ''
    };

    try {
        // Iterate through lines to find relevant information
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';

            // Find reference number (usually a 10-digit number)
            if (/^\d{10}$/.test(line)) {
                receipt.referenceNumber = line;
            }

            // Find customer name and phone
            if (line.includes('Nour El Ain')) {
                receipt.customerName = line;
                // Check next line for phone
                if (nextLine.startsWith('+20')) {
                    receipt.customerPhone = nextLine;
                }
            }

            // Find payment method
            if (line.toUpperCase() === 'CASH' || line.includes('نقدا')) {
                receipt.paymentMethod = 'Cash';
            } else if (line.toLowerCase().includes('credit') || line.toLowerCase().includes('card')) {
                receipt.paymentMethod = 'Credit Card';
            }

            // Find date and time (in format DD.MM.YYYY HH.MM)
            if (/\d{2}\.\d{2}\.\d{4}\s+\d{2}\.\d{2}/.test(line)) {
                const [date, time] = line.split(' ');
                receipt.date = date;
                receipt.time = time;
            }
        }

        // Extract order number from first line
        const firstLine = lines[0].trim();
        if (firstLine.toLowerCase().includes('talabat')) {
            const match = firstLine.match(/#(\d+)/);
            if (match) {
                receipt.orderNumber = '#' + match[1];
            }
        }

        // Clean up any empty fields
        Object.keys(receipt).forEach(key => {
            if (!receipt[key]) {
                receipt[key] = 'Not found';
            }
        });

        return receipt;
    } catch (error) {
        console.error('Error parsing Talabat receipt:', error);
        return null;
    }
}
