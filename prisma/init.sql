PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS User (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE,
  fullName TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'PARALEGAL',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  lastLoginAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Matter (
  id TEXT PRIMARY KEY NOT NULL,
  referenceNumber TEXT NOT NULL UNIQUE,
  clientName TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  createdById TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdById) REFERENCES User(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS DepositionTarget (
  id TEXT PRIMARY KEY NOT NULL,
  matterId TEXT NOT NULL,
  fullName TEXT NOT NULL,
  roleTitle TEXT,
  requestedDate DATETIME,
  scheduledDate DATETIME,
  status TEXT NOT NULL DEFAULT 'NEEDS_REQUEST',
  followUpStage TEXT NOT NULL DEFAULT 'FIRST_EMAIL_PENDING',
  followUpDueDate DATETIME,
  lastContactedAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matterId) REFERENCES Matter(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS OpposingCounsel (
  id TEXT PRIMARY KEY NOT NULL,
  matterId TEXT NOT NULL,
  fullName TEXT NOT NULL,
  email TEXT NOT NULL,
  firmName TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matterId) REFERENCES Matter(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS AuditLog (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT,
  action TEXT NOT NULL,
  entityType TEXT NOT NULL,
  entityId TEXT,
  metadata TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS Session (
  id TEXT PRIMARY KEY NOT NULL,
  tokenId TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  expiresAt DATETIME NOT NULL,
  revokedAt DATETIME,
  lastSeenAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS LoginAttempt (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  ipAddress TEXT,
  successful INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  userId TEXT,
  FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS Matter_clientName_idx ON Matter(clientName);
CREATE INDEX IF NOT EXISTS Matter_status_idx ON Matter(status);
CREATE INDEX IF NOT EXISTS Matter_createdById_idx ON Matter(createdById);
CREATE INDEX IF NOT EXISTS DepositionTarget_matterId_idx ON DepositionTarget(matterId);
CREATE INDEX IF NOT EXISTS DepositionTarget_status_idx ON DepositionTarget(status);
CREATE INDEX IF NOT EXISTS DepositionTarget_followUpStage_idx ON DepositionTarget(followUpStage);
CREATE INDEX IF NOT EXISTS DepositionTarget_followUpDueDate_idx ON DepositionTarget(followUpDueDate);
CREATE INDEX IF NOT EXISTS OpposingCounsel_matterId_idx ON OpposingCounsel(matterId);
CREATE INDEX IF NOT EXISTS OpposingCounsel_email_idx ON OpposingCounsel(email);
CREATE INDEX IF NOT EXISTS User_role_idx ON User(role);
CREATE INDEX IF NOT EXISTS User_status_idx ON User(status);
CREATE INDEX IF NOT EXISTS AuditLog_userId_idx ON AuditLog(userId);
CREATE INDEX IF NOT EXISTS AuditLog_entityType_createdAt_idx ON AuditLog(entityType, createdAt);
CREATE INDEX IF NOT EXISTS Session_userId_idx ON Session(userId);
CREATE INDEX IF NOT EXISTS Session_expiresAt_idx ON Session(expiresAt);
CREATE INDEX IF NOT EXISTS LoginAttempt_email_createdAt_idx ON LoginAttempt(email, createdAt);
CREATE INDEX IF NOT EXISTS LoginAttempt_ipAddress_createdAt_idx ON LoginAttempt(ipAddress, createdAt);
CREATE INDEX IF NOT EXISTS LoginAttempt_successful_createdAt_idx ON LoginAttempt(successful, createdAt);
