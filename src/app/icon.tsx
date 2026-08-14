import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0147FF",
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            background: "white",
            clipPath:
              "polygon(50% 0%, 62% 40%, 100% 50%, 62% 60%, 50% 100%, 38% 60%, 0% 50%, 38% 40%)",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
