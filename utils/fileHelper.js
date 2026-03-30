import fs from "fs";
import path from "path";

export const deleteFileFromDisk = (imageUrl) => {
  if (!imageUrl) return;

  try {
    // Wyciągamy nazwę pliku (np. z "http://localhost:5000/uploads/image_123.jpg" zrobi "image_123.jpg")
    const fileName = imageUrl.split("/").pop();
    const localFilePath = path.join(process.cwd(), "uploads", fileName);

    if (fs.existsSync(localFilePath)) {
      fs.unlink(localFilePath, (err) => {
        if (err) console.error("Błąd fizycznego usuwania pliku:", err);
        else console.log("Plik usunięty z dysku:", fileName);
      });
    }
  } catch (error) {
    console.error("Błąd w helperze deleteFileFromDisk:", error);
  }
};
