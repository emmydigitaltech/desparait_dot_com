"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

export default function ImageGallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [i, setI] = useState(0);

  if (!images.length) {
    return <div className="aspect-square rounded-lg border border-[#D5D9D9] bg-white" />;
  }

  return (
    <div>
      <div className="flex aspect-square items-center justify-center rounded-lg border border-[#D5D9D9] bg-white p-2">
        <img src={images[i]} alt={alt} className="max-h-full max-w-full object-contain" />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2">
          {images.map((src, idx) => (
            <button
              key={src}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Show photo ${idx + 1}`}
              className={`h-14 w-14 overflow-hidden rounded border bg-white p-0.5 ${
                idx === i
                  ? "border-[#E77600] shadow-[0_0_0_2px_rgba(228,121,17,0.3)]"
                  : "border-[#D5D9D9]"
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
