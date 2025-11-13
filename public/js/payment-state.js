class PaymentState {
    constructor() {
        this.state = {
            currentPackage: null,
            paymentStatus: 'idle',
            transactionData: null,
            error: null
        };
        this.subscribers = [];
    }
    
    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notifySubscribers();
    }
    
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }
    
    notifySubscribers() {
        this.subscribers.forEach(callback => callback(this.state));
    }
    
    setPackage(pkg) {
        console.log('Setting package:', pkg);
        this.setState({
            currentPackage: pkg,
            paymentStatus: 'idle',
            error: null
        });
    }
    
    async processPayment(phoneNumber) {
        console.log('Processing payment for package:', this.state.currentPackage);
        
        if (!this.state.currentPackage) {
            console.error('No package selected');
            this.setState({
                paymentStatus: 'error',
                error: 'No package selected. Please try again.'
            });
            return;
        }
        
        this.setState({ 
            paymentStatus: 'processing',
            error: null 
        });
        
        try {
            const response = await fetch('/api/payments/stk-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: phoneNumber,
                    amount: this.state.currentPackage.amount,
                    package: this.state.currentPackage.name
                })
            });
            
            const result = await response.json();
            console.log('STK Push response:', result);
            
            if (result.success) {
                this.setState({
                    paymentStatus: 'success',
                    transactionData: result.data
                });
            } else {
                this.setState({
                    paymentStatus: 'error',
                    error: result.error || 'Payment failed. Please try again.'
                });
            }
        } catch (error) {
            console.error('Payment error:', error);
            this.setState({
                paymentStatus: 'error',
                error: 'Network error. Please check your connection and try again.'
            });
        }
    }
    
    reset() {
        this.setState({
            currentPackage: null,
            paymentStatus: 'idle',
            transactionData: null,
            error: null
        });
    }
}

// Create global state instance
const paymentState = new PaymentState();

// State subscriber for UI updates
paymentState.subscribe((state) => {
    const statusElement = document.getElementById('paymentStatus');
    const payButton = document.getElementById('payButton');
    const payButtonText = document.getElementById('payButtonText');
    const payButtonSpinner = document.getElementById('payButtonSpinner');
    
    console.log('Payment state updated:', state);
    
    // Only update UI if elements exist (modal is open)
    if (statusElement) {
        statusElement.className = 'mt-4 p-3 rounded-lg';
        statusElement.classList.remove('hidden');
        
        switch (state.paymentStatus) {
            case 'processing':
                statusElement.classList.add('bg-blue-50', 'border', 'border-blue-200', 'text-blue-700');
                statusElement.innerHTML = `
                    <div class="flex items-center">
                        <i class="fas fa-spinner fa-spin mr-3 text-blue-600"></i>
                        <div>
                            <p class="font-medium text-sm">Initiating payment...</p>
                            <p class="text-xs mt-1">Please wait while we process your request.</p>
                        </div>
                    </div>
                `;
                break;
                
            case 'success':
                statusElement.classList.add('bg-green-50', 'border', 'border-green-200', 'text-green-700');
                statusElement.innerHTML = `
                    <div class="flex items-center">
                        <i class="fas fa-check-circle mr-3 text-green-600 text-lg"></i>
                        <div>
                            <p class="font-medium text-sm">Payment initiated successfully!</p>
                            <p class="text-xs mt-1">Check your phone to complete the M-Pesa transaction.</p>
                        </div>
                    </div>
                `;
                
                setTimeout(() => {
                    if (document.getElementById('paymentModal')) {
                        closePaymentModal();
                    }
                }, 5000);
                break;
                
            case 'error':
                statusElement.classList.add('bg-red-50', 'border', 'border-red-200', 'text-red-700');
                statusElement.innerHTML = `
                    <div class="flex items-center">
                        <i class="fas fa-exclamation-triangle mr-3 text-red-600"></i>
                        <div>
                            <p class="font-medium text-sm">Payment Failed</p>
                            <p class="text-xs mt-1">${state.error}</p>
                        </div>
                    </div>
                `;
                break;
                
            default:
                statusElement.classList.add('hidden');
        }
    }
    
    if (payButton && payButtonText && payButtonSpinner) {
        switch (state.paymentStatus) {
            case 'processing':
                payButton.disabled = true;
                payButtonText.textContent = 'Processing...';
                payButtonSpinner.classList.remove('hidden');
                break;
                
            case 'success':
                payButton.disabled = true;
                payButtonText.textContent = 'Payment Sent';
                payButtonSpinner.classList.add('hidden');
                break;
                
            case 'error':
                payButton.disabled = false;
                payButtonText.textContent = 'Try Again';
                payButtonSpinner.classList.add('hidden');
                break;
                
            default:
                payButton.disabled = false;
                payButtonText.textContent = 'Pay Now';
                payButtonSpinner.classList.add('hidden');
        }
    }
});