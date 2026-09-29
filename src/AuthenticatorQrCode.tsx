import { QRCodeSVG } from "qrcode.react";

export default function AuthenticatorQrCode({ uri }: { uri: string }) {
  return (
    <div className="two-factor-qr" aria-label="Authenticator setup QR code">
      <QRCodeSVG
        value={uri}
        size={228}
        level="M"
        marginSize={4}
        title="Scan this code with your authenticator app"
      />
    </div>
  );
}
