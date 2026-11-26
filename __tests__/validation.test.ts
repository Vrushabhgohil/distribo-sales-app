import {
  passwordSchema,
  loginSchema,
  signUpSchema,
  phoneSchema,
  pincodeSchema,
  storeFormSchema,
  paymentFormSchema,
  orderFormSchema,
  orderItemInputSchema,
  visitFormSchema,
  followUpFormSchema,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('phoneSchema', () => {
    it('validates 10-digit Indian phone numbers', () => {
      expect(phoneSchema.safeParse('9876543210').success).toBe(true);
      expect(phoneSchema.safeParse('8123456789').success).toBe(true);
    });

    it('rejects invalid phone numbers', () => {
      expect(phoneSchema.safeParse('12345').success).toBe(false);
      expect(phoneSchema.safeParse('98765432101').success).toBe(false);
      expect(phoneSchema.safeParse('abcdefghij').success).toBe(false);
      expect(phoneSchema.safeParse('3876543210').success).toBe(false); // Does not start with 6-9
    });
  });

  describe('pincodeSchema', () => {
    it('validates 6-digit Indian PIN codes', () => {
      expect(pincodeSchema.safeParse('380015').success).toBe(true);
      expect(pincodeSchema.safeParse('110001').success).toBe(true);
    });

    it('rejects invalid PIN codes', () => {
      expect(pincodeSchema.safeParse('38001').success).toBe(false);
      expect(pincodeSchema.safeParse('080015').success).toBe(false); // Starts with 0
      expect(pincodeSchema.safeParse('3800155').success).toBe(false);
      expect(pincodeSchema.safeParse('ABCDEF').success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('validates password with min 8 characters matching Admin Panel policy', () => {
      expect(passwordSchema.safeParse('AdminPass1').success).toBe(true);
      expect(passwordSchema.safeParse('12345678').success).toBe(true);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('short1');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 8 characters');
      }
    });
  });

  describe('loginSchema', () => {
    it('validates email or employee ID with non-empty password', () => {
      const validEmailLogin = {
        identifier: 'sales@motiba.example.com',
        password: 'Password123!',
      };
      expect(loginSchema.safeParse(validEmailLogin).success).toBe(true);

      const validEmployeeLogin = {
        identifier: 'EMP00123',
        password: 'pass123',
      };
      expect(loginSchema.safeParse(validEmployeeLogin).success).toBe(true);
    });

    it('rejects empty password on sign-in', () => {
      const emptyPw = {
        identifier: 'EMP00123',
        password: '',
      };
      const result = loginSchema.safeParse(emptyPw);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Please enter your password');
      }
    });

    it('rejects empty identifier on sign-in', () => {
      const emptyId = {
        identifier: '   ',
        password: 'password123',
      };
      const result = loginSchema.safeParse(emptyId);
      expect(result.success).toBe(false);
    });
  });

  describe('signUpSchema', () => {
    it('validates a complete signup payload', () => {
      const validSignup = {
        fullName: 'Vikas Sharma',
        email: 'vikas@motiba.example.com',
        mobile: '9825098250',
        password: 'SuperSecretPassword123!',
        confirmPassword: 'SuperSecretPassword123!',
        agreeTerms: true,
      };
      expect(signUpSchema.safeParse(validSignup).success).toBe(true);
    });

    it('rejects mismatched passwords and invalid emails', () => {
      const invalidSignup = {
        fullName: '',
        email: 'not-an-email',
        mobile: '12345',
        password: 'SuperSecretPassword123!',
        confirmPassword: 'MismatchedPassword123!',
        agreeTerms: false,
      };
      expect(signUpSchema.safeParse(invalidSignup).success).toBe(false);
    });
  });

  describe('storeFormSchema', () => {
    it('validates store creation data', () => {
      const validStore = {
        name: 'Shree Krishna Provisions',
        owner_name: 'Ramesh Bhai',
        mobile: '9876543210',
        address: 'Shop 4, Market Yard',
        area: 'Navrangpura',
        city: 'Ahmedabad',
        pincode: '380009',
        store_type: 'kirana',
      };
      expect(storeFormSchema.safeParse(validStore).success).toBe(true);
    });
  });

  describe('paymentFormSchema', () => {
    it('validates positive payment amounts', () => {
      const validPayment = {
        storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        amount: 2500,
        paymentMode: 'cash',
        referenceNumber: 'REC-001',
      };
      expect(paymentFormSchema.safeParse(validPayment).success).toBe(true);
    });

    it('rejects zero or negative payments', () => {
      expect(
        paymentFormSchema.safeParse({
          storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          amount: 0,
          paymentMode: 'cash',
        }).success
      ).toBe(false);

      expect(
        paymentFormSchema.safeParse({
          storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          amount: -500,
          paymentMode: 'cash',
        }).success
      ).toBe(false);
    });
  });

  describe('orderFormSchema', () => {
    it('validates order structure with positive items', () => {
      const validOrder = {
        storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        items: [
          { productId: '3fa85f64-5717-4562-b3fc-2c963f66afa1', quantity: 10 },
          { productId: '3fa85f64-5717-4562-b3fc-2c963f66afa2', quantity: 5 },
        ],
        notes: 'Deliver before 5 PM',
      };
      expect(orderFormSchema.safeParse(validOrder).success).toBe(true);
    });

    it('rejects order with zero items', () => {
      const emptyOrder = {
        storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        items: [],
      };
      expect(orderFormSchema.safeParse(emptyOrder).success).toBe(false);
    });
  });

  describe('visitFormSchema', () => {
    it('validates store checkin visit', () => {
      const validVisit = {
        storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        latitude: 23.0225,
        longitude: 72.5714,
        notes: 'Stock verified at counter.',
      };
      expect(visitFormSchema.safeParse(validVisit).success).toBe(true);
    });
  });

  describe('followUpFormSchema', () => {
    it('validates follow up task schedule', () => {
      const validFollowUp = {
        storeId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        followUpDate: '2026-12-01',
        reason: 'Payment Collection Follow-up',
        status: 'pending',
      };
      expect(followUpFormSchema.safeParse(validFollowUp).success).toBe(true);
    });
  });
});
