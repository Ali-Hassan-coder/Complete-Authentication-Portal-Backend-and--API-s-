const { createPermissionSchema } = require('../permissionValidator');

describe("Permission Validator Tests", () => {
    
    // 1. A passing test (Good scenario)
    it("should allow a valid permission name like 'Edit Users'", () => {
        const result = createPermissionSchema.validate({ name: "Edit Users", description: "This permission allows editing users" });
        expect(result.error).toBeUndefined();
    });

    // 2. A failing test (Special characters check)
    it("should reject a permission name with special characters", () => {
        const result = createPermissionSchema.validate({ name: "Edit@Users!", description: "Invalid permission" });
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain("Permission name must start with at least 3 alphabets");
    });

    // 3. Another failing test (Numbers only check)
    it("should reject a permission name that is just numbers", () => {
        const result = createPermissionSchema.validate({ name: "12345", description: "Invalid permission" });
        expect(result.error).toBeDefined();
    });

});
