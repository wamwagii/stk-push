const express = require('express');
const mpesaService = require('../services/mpesaService');

const router = express.Router();

// Initiate STK Push
router.post('/stk-push', async (req, res) => {
    try {
        const { phone, amount, package } = req.body;

        console.log('🔄 STK Push Request:', { phone, amount, package });

        // Validation
        if (!phone || !amount || !package) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: phone, amount, package'
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
        }

        const result = await mpesaService.initiateSTKPush(phone, amount, package);

        if (result.success) {
            res.json({
                success: true,
                data: result.data,
                message: 'STK Push initiated successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error,
                details: result.details
            });
        }

    } catch (error) {
        console.error('💥 Payment route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// Debug endpoint to test timestamp and password generation
router.get('/debug-timestamp', (req, res) => {
    const timestamp = mpesaService.getTimestamp();
    const password = mpesaService.generatePassword(timestamp);
    
    res.json({
        timestamp,
        password,
        timestampLength: timestamp.length,
        passwordLength: password.length,
        expectedFormat: 'YYYYMMDDHHmmss (14 characters)',
        currentTime: new Date().toISOString()
    });
});

// Get payment status (optional)
router.get('/status/:checkoutRequestID', async (req, res) => {
    res.json({ message: 'Status endpoint - implement as needed' });
});

module.exports = router;