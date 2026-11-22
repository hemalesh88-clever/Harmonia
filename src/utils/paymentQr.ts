import { db, doc, getDoc, setDoc } from '../lib/firebase';

export const DEFAULT_PAYMENT_QR_URL = '/assets/images/harmonia_payment_qr.svg';

export interface PaymentQrConfig {
  qrUrl: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
}

export async function fetchActivePaymentQr(): Promise<string> {
  try {
    const docRef = doc(db, 'config', 'payment_qr');
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data()?.qrUrl) {
      return snap.data().qrUrl;
    }
  } catch (err) {
    console.warn('[HARMONIA] Fallback to default payment QR:', err);
  }
  return DEFAULT_PAYMENT_QR_URL;
}

export async function updateActivePaymentQr(
  newQrUrl: string,
  coordinatorName: string
): Promise<void> {
  const docRef = doc(db, 'config', 'payment_qr');
  await setDoc(docRef, {
    qrUrl: newQrUrl,
    updatedAt: new Date().toISOString(),
    updatedBy: coordinatorName,
    version: Date.now(),
  });
}
