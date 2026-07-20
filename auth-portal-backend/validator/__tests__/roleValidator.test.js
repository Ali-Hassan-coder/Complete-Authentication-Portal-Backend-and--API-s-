const { createRoleSchema } = require('../roleValidator');

describe("Role Validator Tests", () => {

    // 1. A passing test (Good scenario)
    it("should allow a valid role name like 'Manager'", () => {
        const result = createRoleSchema.validate({ name: "Manager", description: "This is a valid manager" });

        // We 'expect' there to be NO error.
        expect(result.error).toBeUndefined();
    });

    // 2. A failing test (The security check you built!)
    it("should reject a role name with special characters", () => {
        const result = createRoleSchema.validate({ name: "Admin@123!", description: "Invalid role" });

        // We 'expect' Joi to throw an error
        expect(result.error).toBeDefined();

        // We 'expect' the error message to match your custom security message
        expect(result.error.message).toContain("Role name must start with at least 3 alphabets");
    });

    // 3. Another failing test (Numbers only check)
    it("should reject a role name that is just numbers", () => {
        const result = createRoleSchema.validate({ name: "12345", description: "Invalid role" });
        expect(result.error).toBeDefined();
    });

});
