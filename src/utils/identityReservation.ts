import { db, doc, getDoc, setDoc } from '../lib/firebase';
import { normalizeEmail, normalizeMobile } from './hackathonLogic';

export interface ParticipantIdentity {
  name: string;
  email: string;
  mobile: string;
  role: string;
}

export interface UniquenessCheckResult {
  valid: boolean;
  conflictType?: 'email' | 'mobile';
  conflictingValue?: string;
  conflictingRole?: string;
  errorMessage?: string;
}

/**
 * Check if any participant identity in the current registration already exists
 * in the Firestore `identities` collection or existing registrations list.
 */
export async function checkGlobalIdentityUniqueness(
  participants: ParticipantIdentity[],
  currentRegistrationId?: string
): Promise<UniquenessCheckResult> {
  for (const p of participants) {
    const normEmail = normalizeEmail(p.email);
    const normMobile = normalizeMobile(p.mobile);

    // 1. Check Email in identities collection
    const emailDocRef = doc(db, 'identities', `email_${normEmail}`);
    try {
      const emailSnap = await getDoc(emailDocRef);
      if (emailSnap.exists()) {
        const data = emailSnap.data();
        if (!currentRegistrationId || data.registrationId !== currentRegistrationId) {
          return {
            valid: false,
            conflictType: 'email',
            conflictingValue: p.email,
            conflictingRole: p.role,
            errorMessage: 'This email is already registered. Please use a different email address.',
          };
        }
      }
    } catch (err) {
      console.warn('[HARMONIA] Email identity check notice:', err);
    }

    // 2. Check Mobile in identities collection
    const mobileDocRef = doc(db, 'identities', `mobile_${normMobile}`);
    try {
      const mobileSnap = await getDoc(mobileDocRef);
      if (mobileSnap.exists()) {
        const data = mobileSnap.data();
        if (!currentRegistrationId || data.registrationId !== currentRegistrationId) {
          return {
            valid: false,
            conflictType: 'mobile',
            conflictingValue: p.mobile,
            conflictingRole: p.role,
            errorMessage: 'This mobile number is already registered. Please use a different mobile number.',
          };
        }
      }
    } catch (err) {
      console.warn('[HARMONIA] Mobile identity check notice:', err);
    }
  }

  return { valid: true };
}

/**
 * Reserve participant identities in Firestore identities collection.
 */
export async function reserveParticipantIdentities(
  participants: ParticipantIdentity[],
  registrationId: string,
  teamName: string
): Promise<void> {
  const timestamp = new Date().toISOString();

  for (const p of participants) {
    const normEmail = normalizeEmail(p.email);
    const normMobile = normalizeMobile(p.mobile);

    const emailDocRef = doc(db, 'identities', `email_${normEmail}`);
    await setDoc(emailDocRef, {
      type: 'email',
      value: normEmail,
      registrationId,
      teamName,
      role: p.role,
      name: p.name,
      createdAt: timestamp,
    });

    const mobileDocRef = doc(db, 'identities', `mobile_${normMobile}`);
    await setDoc(mobileDocRef, {
      type: 'mobile',
      value: normMobile,
      registrationId,
      teamName,
      role: p.role,
      name: p.name,
      createdAt: timestamp,
    });
  }
}
