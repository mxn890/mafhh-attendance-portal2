import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  employeeId: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  email: String,
  phone: String,
  designation: String,
  department: String,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  assigned_pc: { type: String, default: null },
  shift_timing: String,
  profile_photo: String,

  password: { type: String, default: null },
  mustChangePassword: { type: Boolean, default: true },
  attendanceRole: { type: String, enum: ['employee', 'manager'], default: 'employee' },

  isEnrolled: { type: Boolean, default: false },
  faceDescriptor: { type: [Number], default: null },
  enrollmentPhoto: { type: String, default: null },

  // Which zone this employee must be near to check in. 'either' (the
  // default) allows both configured zones — safe until a manager
  // confirms each person's actual base, so no one gets locked out by an
  // unset default.
  assignedLocation: { type: String, enum: ['office', 'airport', 'either'], default: 'either' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const attendanceEventSchema = new mongoose.Schema({
  time: Date,
  lat: Number,
  lng: Number,
  photo: String,
  faceMatchDistance: Number,
  faceMatchStatus: { type: String, enum: ['verified', 'needs_review', 'no_face_detected'], default: 'needs_review' },
  locationLabel: { type: String, enum: ['office', 'airport', 'out_of_range', 'not_configured'], default: 'not_configured' },
  distanceMeters: Number,
}, { _id: false });

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true },
  employeeName: String,
  date: { type: String, required: true, index: true },
  checkIn: attendanceEventSchema,
  checkOut: attendanceEventSchema,
  status: { type: String, enum: ['OnTime', 'Late', 'HalfDay', 'Absent', 'Leave'], default: 'Absent' },
  reviewedBy: String,
  reviewNote: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const attendanceConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  officeLocation: { address: String, lat: { type: Number, default: null }, lng: { type: Number, default: null }, radiusMeters: { type: Number, default: 150 } },
  airportLocation: { address: String, lat: { type: Number, default: null }, lng: { type: Number, default: null }, radiusMeters: { type: Number, default: 300 } },
  shiftRules: {
    startTime: { type: String, default: '09:00' },
    lateAfter: { type: String, default: '09:30' },
    halfDayAfter: { type: String, default: '10:00' },
    endTime: { type: String, default: '18:00' },
  },
});

export const Employee = mongoose.models.Employee || mongoose.model('Employee', employeeSchema);
export const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
export const AttendanceConfig = mongoose.models.AttendanceConfig || mongoose.model('AttendanceConfig', attendanceConfigSchema);

const locationPingSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, index: true },
  lat: Number,
  lng: Number,
  timestamp: { type: Date, default: Date.now, index: true },
});
// Kept 90 days — this is the "GPS Verification Logs" the scope doc calls
// for (timestamped location history per employee), not just a short-lived
// live-map trail.
locationPingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 86400 });

export const LocationPing = mongoose.models.LocationPing || mongoose.model('LocationPing', locationPingSchema);
