const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? '';

// Max dimension for product images — enough to look sharp on a phone, not wasteful
const MAX_SIZE = 600;

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

/**
 * Upload an image to Cloudinary using an unsigned upload preset.
 * Device-side compression (quality 0.5) handles size reduction before upload.
 */
export async function uploadImage(
  imageUri: string,
  folder = 'products',
): Promise<CloudinaryUploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.');
  }

  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudinary upload failed: ${text}`);
  }

  return response.json() as Promise<CloudinaryUploadResult>;
}

/**
 * Returns a Cloudinary URL with background removed + optimised delivery:
 * - e_background_removal: AI bg removal (requires add-on)
 * - f_auto: serve WebP/AVIF where supported
 * - q_auto: Cloudinary picks the best quality/size tradeoff
 * - w_600,h_600,c_limit: never deliver larger than needed
 */
export function withBackgroundRemoved(secureUrl: string): string {
  return secureUrl.replace(
    '/upload/',
    `/upload/e_background_removal,f_auto,q_auto,w_${MAX_SIZE},h_${MAX_SIZE},c_limit/`,
  );
}
