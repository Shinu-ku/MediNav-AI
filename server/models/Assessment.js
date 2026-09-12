import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema({
  patientId: String,
  concern: String,
  triage: { type: Object, required: true },
  source: { type: String, default: 'api' },
  createdAt: { type: Date, default: Date.now }
});

export const Assessment = mongoose.model('Assessment', assessmentSchema);
