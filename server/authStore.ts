import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  verifyFirebaseIdToken,
  getFirestoreUserDoc,
  syncFirestoreUserDoc,
  setFirebaseCustomRoleClaim,
} from './firebaseAdmin';

export type UserRole = 'Admin' | 'DevOps / SRE' | 'Viewer';

export const VALID_ROLES: readonly UserRole[] = ['Admin', 'DevOps / SRE', 'Viewer'] as const;

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt: string;
}

interface StoredUser extends User {
  passwordHash?: string;
  salt?: string;
  isFirebaseUser?: boolean;
}

export interface DemoAccountSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  description: string;
}

const USERS_FILE_PATH = path.resolve(process.cwd(), 'data', 'users_store.json');

// Server-side persistent store of users and active sessions
const usersByEmail: Map<string, StoredUser> = new Map();
const usersById: Map<string, StoredUser> = new Map();
const sessions: Map<string, string> = new Map(); // token -> userId

function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && (VALID_ROLES as readonly string[]).includes(role);
}

function toPublicUser(stored: StoredUser): User {
  const { passwordHash: _ph, salt: _s, isFirebaseUser: _fb, ...publicUser } = stored;
  return publicUser;
}

function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  if (hash.length !== expected.length) return false;
  return timingSafeEqual(hash, expected);
}

function saveUsersStore() {
  try {
    const dir = path.dirname(USERS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const payload = {
      savedAt: Date.now(),
      users: Array.from(usersById.values()),
    };
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AuthStore] Failed to persist users store:', err);
  }
}

function loadUsersStore() {
  try {
    if (!fs.existsSync(USERS_FILE_PATH)) return;
    const raw = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.users)) return;

    for (const u of parsed.users as StoredUser[]) {
      if (u && u.id && u.email && isValidRole(u.role)) {
        const normalizedEmail = u.email.toLowerCase();
        usersById.set(u.id, { ...u, email: normalizedEmail });
        usersByEmail.set(normalizedEmail, { ...u, email: normalizedEmail });
      }
    }
  } catch (err) {
    console.warn('[AuthStore] Could not load persisted users store:', err);
  }
}

const DEV_DEMO_DEFINITIONS: Array<{
  id: string;
  name: string;
  email: string;
  role: UserRole;
  envPasswordKey: string;
  description: string;
}> = [
  {
    id: 'usr_alex_vance',
    name: 'Alex Vance',
    email: 'alex@orchestrix.io',
    role: 'DevOps / SRE',
    envPasswordKey: 'DEMO_SRE_PASSWORD',
    description: 'Lead Site Reliability Engineer — Full scheduling & recovery privileges',
  },
  {
    id: 'usr_admin_cluster',
    name: 'DevOps Admin',
    email: 'admin@orchestrix.io',
    role: 'Admin',
    envPasswordKey: 'DEMO_ADMIN_PASSWORD',
    description: 'Cluster Administrator — Superuser root control & node management',
  },
  {
    id: 'usr_elena_viewer',
    name: 'Elena Rostova',
    email: 'viewer@orchestrix.io',
    role: 'Viewer',
    envPasswordKey: 'DEMO_VIEWER_PASSWORD',
    description: 'Observability Analyst — Read-only access to metrics and workloads',
  },
];

// Seed demo users ONLY when NODE_ENV === 'development'
export function initAuthStore() {
  loadUsersStore();

  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  let modified = false;
  for (const u of DEV_DEMO_DEFINITIONS) {
    const normalizedEmail = u.email.toLowerCase();
    if (usersByEmail.has(normalizedEmail) || usersById.has(u.id)) {
      continue;
    }

    const rawPassword = process.env[u.envPasswordKey] || randomBytes(16).toString('hex');
    const salt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword(rawPassword, salt);
    const now = new Date().toISOString();

    const stored: StoredUser = {
      id: u.id,
      name: u.name,
      email: normalizedEmail,
      role: u.role,
      passwordHash,
      salt,
      createdAt: now,
      lastLoginAt: now,
    };

    usersByEmail.set(normalizedEmail, stored);
    usersById.set(u.id, stored);
    modified = true;
  }

  if (modified) {
    saveUsersStore();
  }
}

initAuthStore();

export function authenticateUser(
  email: string,
  password: string
): { user: User; token: string } | null {
  const stored = usersByEmail.get(email.toLowerCase().trim());
  if (!stored || !stored.passwordHash || !stored.salt) return null;

  const isValid = verifyPassword(password, stored.salt, stored.passwordHash);
  if (!isValid) return null;

  stored.lastLoginAt = new Date().toISOString();
  const token = `otx_${randomBytes(24).toString('hex')}`;
  sessions.set(token, stored.id);
  saveUsersStore();

  return { user: toPublicUser(stored), token };
}

// Development-only demo login without hardcoded passwords
export function authenticateDemoUser(
  email: string
): { user: User; token: string } | null {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  const normalizedEmail = email.toLowerCase().trim();
  const isDemoAccount = DEV_DEMO_DEFINITIONS.some(
    (d) => d.email.toLowerCase() === normalizedEmail
  );
  if (!isDemoAccount) return null;

  const stored = usersByEmail.get(normalizedEmail);
  if (!stored) return null;

  stored.lastLoginAt = new Date().toISOString();
  const token = `otx_${randomBytes(24).toString('hex')}`;
  sessions.set(token, stored.id);
  saveUsersStore();

  return { user: toPublicUser(stored), token };
}

// Always registers new users with the least-privilege 'Viewer' role.
export function registerUser(
  name: string,
  email: string,
  password: string
): { user: User; token: string } {
  const normalizedEmail = email.toLowerCase().trim();
  if (usersByEmail.has(normalizedEmail)) {
    throw new Error('An account with this email address already exists.');
  }

  const salt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const id = `usr_${randomBytes(6).toString('hex')}`;
  const now = new Date().toISOString();

  const newUser: StoredUser = {
    id,
    name: name.trim() || 'Cluster Operator',
    email: normalizedEmail,
    role: 'Viewer',
    passwordHash,
    salt,
    createdAt: now,
    lastLoginAt: now,
  };

  usersByEmail.set(normalizedEmail, newUser);
  usersById.set(id, newUser);
  const token = `otx_${randomBytes(24).toString('hex')}`;
  sessions.set(token, id);
  saveUsersStore();

  return { user: toPublicUser(newUser), token };
}

export async function getUserByToken(token: string): Promise<User | null> {
  if (!token) return null;
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken) return null;

  // 1. Try local opaque session token store
  if (cleanToken.startsWith('otx_')) {
    const userId = sessions.get(cleanToken);
    if (!userId) return null;
    const stored = usersById.get(userId);
    return stored ? toPublicUser(stored) : null;
  }

  // 2. Cryptographically verify Firebase ID Token via firebase-admin
  const decoded = await verifyFirebaseIdToken(cleanToken);
  if (!decoded || !decoded.uid) {
    return null;
  }

  const uid = decoded.uid;
  const email = (decoded.email || `${uid}@firebase.auth`).toLowerCase();
  const now = new Date().toISOString();

  // Resolve authoritative server-side role (Firestore -> Server Store -> Verified Custom Claim -> Default 'Viewer')
  // NEVER derive roles from email strings.
  const firestoreDoc = await getFirestoreUserDoc(uid);
  const localStored = usersById.get(uid) || (decoded.email ? usersByEmail.get(email) : undefined);

  let resolvedRole: UserRole = 'Viewer';
  if (firestoreDoc && isValidRole(firestoreDoc.role)) {
    resolvedRole = firestoreDoc.role;
  } else if (localStored && isValidRole(localStored.role)) {
    resolvedRole = localStored.role;
  } else if (isValidRole((decoded as Record<string, unknown>).role)) {
    resolvedRole = (decoded as Record<string, unknown>).role as UserRole;
  }

  const resolvedUser: StoredUser = {
    id: uid,
    name:
      localStored?.name ||
      firestoreDoc?.displayName ||
      decoded.name ||
      decoded.email?.split('@')[0] ||
      'Firebase Operator',
    email,
    role: resolvedRole,
    avatarUrl: decoded.picture || firestoreDoc?.photoURL || localStored?.avatarUrl,
    createdAt: localStored?.createdAt || firestoreDoc?.createdAt || now,
    lastLoginAt: now,
    passwordHash: localStored?.passwordHash,
    salt: localStored?.salt,
    isFirebaseUser: true,
  };

  usersById.set(uid, resolvedUser);
  usersByEmail.set(email, resolvedUser);
  saveUsersStore();

  // Ensure Firestore has a server-side record with resolved role if doc did not exist
  if (!firestoreDoc) {
    void syncFirestoreUserDoc(uid, {
      uid,
      email,
      displayName: resolvedUser.name,
      role: resolvedRole,
      photoURL: resolvedUser.avatarUrl,
      createdAt: resolvedUser.createdAt,
      lastLoginAt: now,
    });
  }

  return toPublicUser(resolvedUser);
}

export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<User | null> {
  if (!isValidRole(newRole)) {
    throw new Error(`Invalid role '${newRole}'.`);
  }

  let stored = usersById.get(userId);

  if (!stored) {
    const firestoreDoc = await getFirestoreUserDoc(userId);
    if (!firestoreDoc) {
      return null;
    }
    const now = new Date().toISOString();
    stored = {
      id: userId,
      name: firestoreDoc.displayName || 'Firebase Operator',
      email: (firestoreDoc.email || `${userId}@firebase.auth`).toLowerCase(),
      role: newRole,
      avatarUrl: firestoreDoc.photoURL,
      createdAt: firestoreDoc.createdAt || now,
      lastLoginAt: firestoreDoc.lastLoginAt || now,
      isFirebaseUser: true,
    };
  } else {
    stored.role = newRole;
  }

  usersById.set(stored.id, stored);
  usersByEmail.set(stored.email.toLowerCase(), stored);
  saveUsersStore();

  // Persist role server-side in Firestore and Firebase custom claims
  await syncFirestoreUserDoc(stored.id, { role: newRole });
  if (stored.isFirebaseUser) {
    await setFirebaseCustomRoleClaim(stored.id, newRole);
  }

  return toPublicUser(stored);
}

export function listUsers(): User[] {
  return Array.from(usersById.values()).map(toPublicUser);
}

export function invalidateToken(token: string): boolean {
  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  return sessions.delete(cleanToken);
}

export function getDemoAccounts(): DemoAccountSummary[] {
  if (process.env.NODE_ENV !== 'development') {
    return [];
  }

  return DEV_DEMO_DEFINITIONS.filter((d) =>
    usersByEmail.has(d.email.toLowerCase())
  ).map(({ id, name, email, role, description }) => ({
    id,
    name,
    email,
    role,
    description,
  }));
}
