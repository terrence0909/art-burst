// src/services/payfastService.ts
import CryptoJS from 'crypto-js';

export interface PayFastPaymentData {
  // Required fields
  amount: string;
  item_name: string;
  item_description: string;
  
  // Optional fields
  custom_int1?: number; // ✅ Changed to number for PayFast
  custom_str1?: string;
  custom_str2?: string;
  name_first?: string;
  name_last?: string;
  email_address?: string;
  cell_number?: string;
  
  // Payment method selection
  payment_method?: 'cc' | 'eft' | 'dc' | 'mp' | 'mc' | 'sc' | 'ss' | 'zp';
}

export interface PayFastConfig {
  merchantId: string;
  merchantKey: string;
  passPhrase?: string;
  environment: 'sandbox' | 'production';
}

class PayFastService {
  private config: PayFastConfig;

  constructor() {
    this.config = {
      merchantId: import.meta.env.VITE_PAYFAST_MERCHANT_ID || '10000100',
      merchantKey: import.meta.env.VITE_PAYFAST_MERCHANT_KEY || '46f0cd694581a',
      passPhrase: import.meta.env.VITE_PAYFAST_PASSPHRASE || '',
      environment: (import.meta.env.VITE_PAYFAST_ENV || 'sandbox') as 'sandbox' | 'production'
    };
  }

  getPaymentUrl(paymentData: PayFastPaymentData): string {
    const baseUrl = this.config.environment === 'production'
      ? 'https://www.payfast.co.za/eng/process'
      : 'https://sandbox.payfast.co.za/eng/process';

    // Required parameters - convert all values to strings
    const params: Record<string, string> = {
      merchant_id: this.config.merchantId,
      merchant_key: this.config.merchantKey,
      return_url: "https://terrence0909.github.io/art-burst/#/payment-success",
      cancel_url: "https://terrence0909.github.io/art-burst/#/payment-cancelled",
      notify_url: "https://jnjnpocvsosfj675lwd7pt6ksi0skrae.lambda-url.us-east-1.on.aws/", // ✅ FIXED: Use Lambda Function URL
      amount: paymentData.amount,
      item_name: paymentData.item_name,
      item_description: paymentData.item_description.substring(0, 255), // PayFast limit
    };

    // Optional parameters - convert numbers to strings
    if (paymentData.custom_int1 !== undefined) params.custom_int1 = paymentData.custom_int1.toString();
    if (paymentData.custom_str1) params.custom_str1 = paymentData.custom_str1;
    if (paymentData.custom_str2) params.custom_str2 = paymentData.custom_str2;
    if (paymentData.name_first) params.name_first = paymentData.name_first;
    if (paymentData.name_last) params.name_last = paymentData.name_last;
    if (paymentData.email_address) params.email_address = paymentData.email_address;
    if (paymentData.cell_number) params.cell_number = paymentData.cell_number;
    if (paymentData.payment_method) params.payment_method = paymentData.payment_method;

    // ⚠️ Only generate signature in production with a valid passphrase
    // Sandbox doesn't require signatures
    if (this.config.environment === 'production' && this.config.passPhrase) {
      params.signature = this.generateSignature(params);
    }

    const queryString = new URLSearchParams(params).toString();
    return `${baseUrl}?${queryString}`;
  }

  private generateSignature(data: Record<string, string>): string {
    // Remove signature and empty values
    const cleanData = Object.fromEntries(
      Object.entries(data)
        .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
        .filter(([key]) => key !== 'signature')
    );

    // Create parameter string
    const paramString = Object.keys(cleanData)
      .sort()
      .map(key => `${key}=${encodeURIComponent(cleanData[key]).replace(/%20/g, '+')}`)
      .join('&');

    // Add passphrase
    const signatureString = this.config.passPhrase 
      ? `${paramString}&passphrase=${encodeURIComponent(this.config.passPhrase)}`
      : paramString;

    // Generate MD5 signature
    return CryptoJS.MD5(signatureString).toString();
  }

  validateITN(data: any): boolean {
    try {
      // Verify signature
      const receivedSignature = data.signature;
      const calculatedSignature = this.generateSignature(data);
      
      return receivedSignature === calculatedSignature;
    } catch (error) {
      console.error('ITN validation error:', error);
      return false;
    }
  }

  parsePaymentResult(queryString: string): Record<string, string> {
    const params = new URLSearchParams(queryString);
    const result: Record<string, string> = {};
    
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    
    return result;
  }

  // Utility methods
  formatAmount(amount: number): string {
    return amount.toFixed(2);
  }

  getEnvironment(): string {
    return this.config.environment;
  }

  isSandbox(): boolean {
    return this.config.environment === 'sandbox';
  }
}

// Export a singleton instance
export const payfastService = new PayFastService();

// Also export the class for testing/mocking
export default PayFastService;