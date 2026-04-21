// imgbb API integration
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY || "055cd9c4de924aa8352f4d26a33e1719";
const IMGBB_API_URL = "https://api.imgbb.com/1/upload";

export async function uploadImageToImgbb(file) {
  if (!file) {
    throw new Error("No file provided");
  }

  // Validate file is an image
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  // Validate file size (5MB limit for imgbb free tier)
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  if (file.size > MAX_SIZE) {
    throw new Error("Image size must be less than 5MB");
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("key", IMGBB_API_KEY);

  try {
    const response = await fetch(IMGBB_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Upload failed");
    }

    const data = await response.json();
    
    if (data.success) {
      return {
        url: data.data.url,
        deleteUrl: data.data.delete_url,
        filename: data.data.filename,
      };
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    throw new Error(error.message || "Failed to upload image to imgbb");
  }
}
