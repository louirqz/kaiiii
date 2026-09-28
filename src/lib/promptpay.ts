import QRCode from 'qrcode';

/**
 * Calculates CRC16-CCITT checksum for EMVCo QR Code string
 */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatTag(id: string, value: string): string {
  const length = value.length.toString().padStart(2, '0');
  return `${id}${length}${value}`;
}

/**
 * Formats PromptPay Target (Mobile Number or National ID / Tax ID)
 */
export function formatPromptPayTarget(target: string): { type: 'mobile' | 'national_id'; formatted: string } {
  const cleaned = target.replace(/[^0-9]/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // 0891234567 -> 0066891234567
    return {
      type: 'mobile',
      formatted: `0066${cleaned.substring(1)}`.padStart(13, '0'),
    };
  }
  // 13 digits (National ID / Tax ID)
  return {
    type: 'national_id',
    formatted: cleaned.padStart(13, '0'),
  };
}

/**
 * Generates official EMVCo PromptPay QR Code Payload string
 */
export function generatePromptPayPayload(target: string, amount?: number): string {
  const { type, formatted } = formatPromptPayTarget(target);

  // Subtag 00: Application ID PromptPay
  const aidTag = formatTag('00', 'A000000677010111');
  // Subtag 01 (Mobile) or 02 (National ID)
  const targetTag = formatTag(type === 'mobile' ? '01' : '02', formatted);
  const merchantAccountInfo = formatTag('29', aidTag + targetTag);

  // Payload format indicator
  let payload = formatTag('00', '01');
  // Point of Initiation Method: 11 = Static, 12 = Dynamic (with specified amount)
  payload += formatTag('01', amount !== undefined && amount > 0 ? '12' : '11');
  payload += merchantAccountInfo;
  payload += formatTag('53', '764'); // THB currency code

  if (amount !== undefined && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatTag('54', formattedAmount);
  }

  payload += formatTag('58', 'TH'); // Country code
  payload += '6304'; // CRC tag and length

  const checksum = crc16(payload);
  return payload + checksum;
}

/**
 * Generates Data URL (PNG image) from PromptPay payload
 */
export async function generatePromptPayQRCodeDataURL(target: string, amount?: number): Promise<string> {
  const payload = generatePromptPayPayload(target, amount);
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#1e293b',
      light: '#ffffff',
    },
  });
}
