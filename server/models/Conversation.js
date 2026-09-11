import mongoose from 'mongoose';
export const Conversation = mongoose.model('Conversation', new mongoose.Schema({ patientId: String, message: String, reply: String, triage: Object, createdAt: { type: Date, default: Date.now } }));
