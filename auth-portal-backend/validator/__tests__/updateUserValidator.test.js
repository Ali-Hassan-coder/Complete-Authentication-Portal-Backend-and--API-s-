const { updateUserSchema } = require('../updateUserValidator');

describe("Update User Validator Tests", () => {
    
    // 1. Phone number test (03 format)
    it("should allow a valid Pakistani phone number starting with 03", () => {
        const result = updateUserSchema.validate({ phone: "03001234567" });
        expect(result.error).toBeUndefined();
    });

    // 2. Phone number test (+92 format)
    it("should allow a valid Pakistani phone number starting with +92", () => {
        const result = updateUserSchema.validate({ phone: "+923001234567" });
        expect(result.error).toBeUndefined();
    });

    // 3. Failing Phone test (Too short)
    it("should reject a phone number that is too short", () => {
        const result = updateUserSchema.validate({ phone: "0300123456" });
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain("Phone number must be a valid Pakistani number");
    });

    // 4. Name test (Good scenario)
    it("should allow a valid name containing only alphabets and spaces", () => {
        const result = updateUserSchema.validate({ name: "John Doe" });
        expect(result.error).toBeUndefined();
    });

    // 5. Failing Name test (Numbers included)
    it("should reject a name containing numbers", () => {
        const result = updateUserSchema.validate({ name: "John Doe 123" });
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain("Name must only contain alphabets and spaces");
    });

});
