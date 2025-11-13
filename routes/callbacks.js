const express = require('express');
const mpesaService = require('../services/mpesaService');

const router = express.Router();

// M-Pesa STK Push Callback
router.post('/mpesa', (req, res) => {
    try {
        console.log('📞 M-Pesa Callback Received:', new Date().toISOString());
        
        const result = mpesaService.handleCallback(req.body);
        
        res.json(result);
    } catch (error) {
        console.error('Callback error:', error);
        res.status(500).json({
            ResultCode: 1,
            ResultDesc: 'Callback processing failed'
        });
    }
});

module.exports = router;