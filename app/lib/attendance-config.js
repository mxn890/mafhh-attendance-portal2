import { AttendanceConfig } from './db/models';
import { validLocationPin } from './geo';

// One-time client-approved location repair. Later reads preserve saved changes.
const LOCATION_VERSION = '2026-11-office-aqd-v1';
export async function getAttendanceConfig() {
  let config = await AttendanceConfig.findOne({ key: 'default' });
  if (config?.locationSetupVersion === LOCATION_VERSION) return config;
  if (!config) {
    try {
      await AttendanceConfig.updateOne({ key: 'default' }, { $setOnInsert: { key: 'default' } }, { upsert: true });
    } catch (error) { if (error.code !== 11000) throw error; }
    config = await AttendanceConfig.findOne({ key: 'default' });
  }
  const changes = {
    'officeLocation.lat': 31.49377697719845,
    'officeLocation.lng': 74.41923897290278,
    'officeLocation.radiusMeters': 1000,
    'quarantineLocation.address': 'Animal Quarantine Department (AQD), Lahore',
    'quarantineLocation.lat': 31.5645,
    'quarantineLocation.lng': 74.4010,
    'quarantineLocation.radiusMeters': 1000,
    'airportLocation.radiusMeters': 1000,
    locationSetupVersion: LOCATION_VERSION,
  };
  // Retain any existing valid airport pin; use the requirements document if missing.
  if (!validLocationPin(config?.airportLocation)) {
    changes['airportLocation.lat'] = 31.5216;
    changes['airportLocation.lng'] = 74.4036;
  }
  await AttendanceConfig.updateOne(
    { key: 'default', locationSetupVersion: { $ne: LOCATION_VERSION } },
    { $set: changes }
  );
  return AttendanceConfig.findOne({ key: 'default' });
}
