import 'server-only';
import QRCode from 'qrcode';

// QR codes stay dark on white in both themes: phone cameras read them most reliably that way.
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#16181dff', light: '#ffffffff' },
  });
}
