const { signupSchema } = require('../authValidator');

describe("Signup/Auth Validator Tests", () => {
    
    // 1. A valid complete signup
    it("should allow a valid user to signup", () => {
        const validUser = {
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
            confirmPassword: "password123",
            phone: "03001234567"
        };
        const result = signupSchema.validate(validUser);
        expect(result.error).toBeUndefined();
    });

    // 2. Reject name with numbers during signup
    it("should reject a signup if the name contains numbers", () => {
        const invalidUser = {
            name: "John Doe 123",
            email: "john@example.com",
            password: "password123",
            confirmPassword: "password123",
            phone: "03001234567"
        };
        const result = signupSchema.validate(invalidUser);
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain("Name must only contain alphabets and spaces");
    });

    // 3. Reject invalid phone during signup
    it("should reject a signup if the phone number is not a valid Pakistani number", () => {
        const invalidUser = {
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
            confirmPassword: "password123",
            phone: "123456"
        };
        const result = signupSchema.validate(invalidUser);
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain("Phone number must be a valid Pakistani number");
    });

    // 4. Reject password mismatch
    it("should reject a signup if confirm password does not match", () => {
        const invalidUser = {
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
            confirmPassword: "wrongpassword",
            phone: "03001234567"
        };
        const result = signupSchema.validate(invalidUser);
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain("Confirm password must match password");
    });
});
