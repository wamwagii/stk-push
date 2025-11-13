const axios = require('axios');

class AuthService {
    constructor() {
        this.baseURL = process.env.MPESA_ENVIRONMENT === 'live' 
            ? 'https://api.safaricom.co.ke' 
            : 'https://sandbox.safaricom.co.ke';
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        // Check if token is still valid (expires after 1 hour)
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const credentials = Buffer.from(
                `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
            ).toString('base64');

            const response = await axios.get(
                `${this.baseURL}/oauth/v1/generate?grant_type=client_credentials`,
                {
                    headers: {
                        'Authorization': `Basic ${credentials}`
                    }
                }
            );

            this.accessToken = response.data.access_token;
            // Set expiry to 55 minutes from now (5 minutes buffer)
            this.tokenExpiry = new Date(Date.now() + 55 * 60 * 1000);

            console.log('✅ New access token generated');
            return this.accessToken;

        } catch (error) {
            console.error('❌ Access Token Error:', error.response?.data || error.message);
            throw new Error('Failed to get access token');
        }
    }
}

module.exports = new AuthService();