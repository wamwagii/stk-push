const axios = require('axios');
const authService = require('./authService');

class MpesaService {
    constructor() {
        this.baseURL = process.env.MPESA_ENVIRONMENT === 'live' 
            ? 'https://api.safaricom.co.ke' 
            : 'https://sandbox.safaricom.co.ke';
    }

    async initiateSTKPush(phone, amount, packageName) {
        try {
            const accessToken = await authService.getAccessToken();
            const timestamp = this.getTimestamp();
            const password = this.generatePassword(timestamp);

            console.log('📱 STK Push Request Details:', {
                timestamp,
                passwordLength: password.length,
                phone: this.formatPhoneNumber(phone),
                amount,
                packageName
            });

            const requestData = {
                BusinessShortCode: process.env.MPESA_BUSINESS_SHORTCODE,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerPayBillOnline',
                Amount: amount,
                PartyA: this.formatPhoneNumber(phone),
                PartyB: process.env.MPESA_BUSINESS_SHORTCODE,
                PhoneNumber: this.formatPhoneNumber(phone),
                CallBackURL: process.env.MPESA_CALLBACK_URL,
                AccountReference: packageName,
                TransactionDesc: `Payment for ${packageName}`
            };

            console.log('🔧 Request Data:', JSON.stringify(requestData, null, 2));

            const response = await axios.post(
                `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
                requestData,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 30000
                }
            );

            console.log('✅ STK Push Success:', response.data);

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ STK Push Error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            let errorMessage = 'Payment failed. Please try again.';
            
            if (error.response?.data) {
                const mpesaError = error.response.data;
                errorMessage = mpesaError.errorMessage || mpesaError.errorMessage || 'M-Pesa API error';
                
                // Specific error handling
                if (mpesaError.errorCode === '400.002.02') {
                    errorMessage = 'Invalid phone number format';
                } else if (mpesaError.errorCode === '400.002.01') {
                    errorMessage = 'Invalid amount';
                }
            } else if (error.code === 'ECONNABORTED') {
                errorMessage = 'Request timeout. Please try again.';
            }

            return {
                success: false,
                error: errorMessage,
                details: error.response?.data
            };
        }
    }

    formatPhoneNumber(phone) {
        let cleaned = phone.replace(/\s+/g, '');
        
        if (cleaned.startsWith('0')) {
            return '254' + cleaned.substring(1);
        } else if (cleaned.startsWith('+254')) {
            return cleaned.substring(1);
        } else if (!cleaned.startsWith('254')) {
            return '254' + cleaned;
        }
        
        return cleaned;
    }

    getTimestamp() {
        // M-Pesa requires format: YYYYMMDDHHmmss
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    generatePassword(timestamp) {
        const shortcode = process.env.MPESA_BUSINESS_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;
        const data = shortcode + passkey + timestamp;
        
        console.log('🔑 Password Generation:', {
            shortcode,
            passkey: passkey ? '***' : 'MISSING',
            timestamp,
            dataLength: data.length
        });

        return Buffer.from(data).toString('base64');
    }

    handleCallback(callbackData) {
        console.log('📞 M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));

        const stkCallback = callbackData.Body.stkCallback;
        if (!stkCallback) {
            return { ResultCode: 1, ResultDesc: 'Invalid callback data' };
        }

        const resultCode = stkCallback.ResultCode;
        const checkoutRequestID = stkCallback.CheckoutRequestID;

        if (resultCode === 0) {
            const metadata = stkCallback.CallbackMetadata?.Item || [];
            const transactionData = this.extractTransactionData(metadata);
            
            console.log('✅ Payment Successful:', {
                checkoutRequestID,
                transactionData
            });

            // TODO: Implement your business logic here
            // - Activate VPN access
            // - Update user account
            // - Send confirmation

        } else {
            const errorDesc = stkCallback.ResultDesc || 'Payment failed';
            console.log('❌ Payment Failed:', {
                checkoutRequestID,
                error: errorDesc
            });
        }

        return { ResultCode: 0, ResultDesc: 'Success' };
    }

    extractTransactionData(metadata) {
        const data = {};
        metadata.forEach(item => {
            data[item.Name] = item.Value;
        });
        return data;
    }
}

module.exports = new MpesaService();