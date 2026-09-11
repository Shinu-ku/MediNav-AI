import mongoose from 'mongoose';
export const Patient = mongoose.model('Patient', new mongoose.Schema({ name: String, age: String, language: String, medications: [String], emergencyContact: { name: String, phone: String }, updatedAt: { type: Date, default: Date.now } }));
