"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChildSchema = void 0;
const zod_1 = require("zod");
exports.createChildSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    dob: zod_1.z.coerce.date(),
    parentIds: zod_1.z.array(zod_1.z.string()),
});
