"use client";

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
}

/**
 * Uploads a file to Cloudinary via our secure server-side API.
 * This function is concurrency-safe and can be used with Promise.all().
 */
export async function uploadToCloudinary(
  file: File,
): Promise<CloudinaryUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/cloudinary/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `Failed to upload image: ${errorData.error || "Unknown error"}`,
    );
  }

  const data = await response.json();
  return {
    public_id: data.public_id,
    secure_url: data.secure_url,
  };
}

/**
 * Deletes an image from Cloudinary via our secure server-side API.
 * This function is concurrency-safe and can be used with Promise.all().
 */
export async function deleteImageFromCloudinary(
  publicId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("/api/cloudinary/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ publicId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || "Delete failed",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export function getOptimizedImageUrl(
  url: string,
  width: number,
  height: number,
): string {
  // If not a cloudinary url, return as is
  if (!url || !url.includes("cloudinary.com")) return url;

  // Split url at /upload/
  const parts = url.split("/upload/");
  if (parts.length !== 2) return url;

  // Inject transformations
  return `${parts[0]}/upload/w_${width},h_${height},c_thumb,g_face/${parts[1]}`;
}
