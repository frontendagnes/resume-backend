import path from "path";
import fs from "fs/promises";

// ============================================================
// FIZYCZNE USUWANIE ZDJĘCIA Z DYSKU
// ============================================================

export const deleteFileFromDisk = async (imageUrl) => {
  if (!imageUrl) return;

  try {
    // Wyciągamy nazwę pliku z adresu URL.
    const parsedUrl = new URL(imageUrl);
    const fileName = path.basename(decodeURIComponent(parsedUrl.pathname));

    if (!fileName || fileName === "." || fileName === "..") {
      throw new Error("Nieprawidłowa nazwa pliku.");
    }

    // Budujemy ścieżkę wewnątrz katalogu uploads.
    const uploadsDirectory = path.resolve(process.cwd(), "uploads");
    const localFilePath = path.resolve(uploadsDirectory, fileName);

    // Zabezpieczenie przed wyjściem poza katalog uploads.
    if (path.dirname(localFilePath) !== uploadsDirectory) {
      throw new Error("Niedozwolona ścieżka pliku.");
    }

    // Usuwamy plik i czekamy na zakończenie operacji.
    await fs.unlink(localFilePath);

    console.log("Plik usunięty z dysku:", fileName);
  } catch (error) {
    // Brak pliku oznacza, że nie ma już czego usuwać.
    if (error.code === "ENOENT") {
      return;
    }

    console.error("Błąd fizycznego usuwania pliku:", error);

    throw error;
  }
};

// import fs from "fs";
// import path from "path";

// export const deleteFileFromDisk = (imageUrl) => {
//   if (!imageUrl) return;

//   try {
//     // Wyciągamy nazwę pliku (np. z "http://localhost:5000/uploads/image_123.jpg" zrobi "image_123.jpg")
//     const fileName = imageUrl.split("/").pop();
//     const localFilePath = path.join(process.cwd(), "uploads", fileName);

//     if (fs.existsSync(localFilePath)) {
//       fs.unlink(localFilePath, (err) => {
//         if (err) console.error("Błąd fizycznego usuwania pliku:", err);
//         else console.log("Plik usunięty z dysku:", fileName);
//       });
//     }
//   } catch (error) {
//     console.error("Błąd w helperze deleteFileFromDisk:", error);
//   }
// };
