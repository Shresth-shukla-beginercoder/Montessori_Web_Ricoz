"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCentre = exports.createCentre = exports.getCentre = exports.listCentres = void 0;
const DaycareCentre_1 = require("../models/DaycareCentre");
const errors_1 = require("../utils/errors");
const auditService_1 = require("./auditService");
const listCentres = async (actor) => {
    if (actor.role === 'super_admin') {
        return DaycareCentre_1.DaycareCentre.find().sort({ name: 1 });
    }
    if (!actor.centreId)
        throw (0, errors_1.forbidden)('No centre assigned');
    return DaycareCentre_1.DaycareCentre.find({ _id: actor.centreId });
};
exports.listCentres = listCentres;
const getCentre = async (actor, id) => {
    if (actor.role !== 'super_admin' && String(actor.centreId) !== String(id)) {
        throw (0, errors_1.notFound)('Centre not found');
    }
    const centre = await DaycareCentre_1.DaycareCentre.findById(id);
    if (!centre)
        throw (0, errors_1.notFound)('Centre not found');
    return centre;
};
exports.getCentre = getCentre;
const createCentre = async (actor, input) => {
    if (actor.role !== 'super_admin')
        throw (0, errors_1.forbidden)('Only HQ can create centres');
    const centre = await DaycareCentre_1.DaycareCentre.create({
        name: input.name,
        address: input.address,
        status: input.status ?? 'active',
    });
    await (0, auditService_1.writeAudit)({
        centreId: String(centre._id),
        userId: actor.id,
        action: 'CREATE',
        resourceType: 'DaycareCentre',
        resourceId: String(centre._id),
    });
    return centre;
};
exports.createCentre = createCentre;
const updateCentre = async (actor, id, input) => {
    if (actor.role !== 'super_admin' && String(actor.centreId) !== String(id)) {
        throw (0, errors_1.notFound)('Centre not found');
    }
    if (actor.role === 'centre_manager' && input.status !== undefined) {
        throw (0, errors_1.badRequest)('Managers cannot change centre status');
    }
    const centre = await DaycareCentre_1.DaycareCentre.findByIdAndUpdate(id, input, { new: true, runValidators: true });
    if (!centre)
        throw (0, errors_1.notFound)('Centre not found');
    await (0, auditService_1.writeAudit)({
        centreId: String(centre._id),
        userId: actor.id,
        action: 'UPDATE',
        resourceType: 'DaycareCentre',
        resourceId: String(centre._id),
    });
    return centre;
};
exports.updateCentre = updateCentre;
