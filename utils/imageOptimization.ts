/**
 * Optimizes an image by resizing it to a maximum dimension and converting it to WebP format.
 * This helps in reducing the file size significantly before storing it in a database like Firestore.
 * 
 * @param base64Str - The original image as a base64 string or data URL
 * @param maxDimension - The maximum width or height of the optimized image (default: 1200)
 * @param quality - The quality of the exported WebP image, from 0 to 1 (default: 0.8)
 * @returns A promise that resolves to the optimized image as a WebP data URL
 */
export const optimizeImage = (
  base64Str: string,
  maxDimension: number = 1200,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If it's not a data URL or not an image, resolve as is
    if (!base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.src = base64Str;

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions if they exceed maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw and resize image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to WebP
      // Use image/webp for browsers that support it, fallback is usually handled by the browser (to image/png)
      const optimizedBase64 = canvas.toDataURL('image/webp', quality);
      
      resolve(optimizedBase64);
    };

    img.onerror = (err) => {
      reject(new Error('Failed to load image for optimization'));
    };
  });
};
