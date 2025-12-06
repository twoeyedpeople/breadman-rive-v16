import { useQRCode } from "next-qrcode";

type QRCodeProps = { data: string; width?: number };
export default function QRCode({ data, width }: QRCodeProps) {
  const { Image } = useQRCode();

  return (
    <Image
      text={data}
      options={{
        type: "image/jpeg",
        quality: 1,
        errorCorrectionLevel: "M",
        margin: 3,
        scale: 4,
        width: !!width ? width : 200,
        color: {
          dark: "#000",
          light: "#FFFFFF",
        },
      }}
    />
  );
}
