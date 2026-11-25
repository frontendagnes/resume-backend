//imageController.js

import cloudinary from "../config/cloudinary.js";
import { randomUUID } from "crypto";

import { deleteFileFromDisk } from "../utils/fileHelper.js";
import * as imageService from "../services/imageService.js";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"];

// ============================================================
// GENEROWANIE PODPISU CLOUDINARY
// ============================================================

// ============================================================
// GENEROWANIE PODPISU CLOUDINARY
// ============================================================

export const generateUploadSignature = async (req, res) => {
  try {
    const userId = String(req.userId);

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(500).json({
        message: "Brak konfiguracji Cloudinary na serwerze.",
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // --------------------------------------------------------
    // FOLDER UŻYTKOWNIKA
    // --------------------------------------------------------

    const assetFolder = `cv-maker/${userId}/gallery`;

    // --------------------------------------------------------
    // UNIKALNY PUBLIC ID ZDJĘCIA
    // --------------------------------------------------------

    const publicId = `${assetFolder}/${randomUUID()}`;

    // --------------------------------------------------------
    // PARAMETRY PODPISU
    // --------------------------------------------------------

    const paramsToSign = {
      timestamp,
      public_id: publicId,
      asset_folder: assetFolder,
      overwrite: false,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET,
    );

    // --------------------------------------------------------
    // ODPOWIEDŹ DLA FRONTENDU
    // --------------------------------------------------------

    return res.status(200).json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      publicId,
      assetFolder,
      signature,
    });
  } catch (error) {
    console.error("Generate Upload Signature Error:", error);

    return res.status(500).json({
      message: "Nie udało się przygotować przesyłania zdjęcia.",
    });
  }
};
// ============================================================
// DODAWANIE ZDJĘCIA PO UPLOADZIE DO CLOUDINARY
// ============================================================

export const uploadImage = async (req, res) => {
  let uploadedPublicId = null;
  try {
    const userId = String(req.userId);
    const { public_id: publicId } = req.body;

    if (!publicId || typeof publicId !== "string") {
      return res.status(400).json({
        message: "Brak prawidłowego identyfikatora zdjęcia.",
      });
    }

    // Zdjęcie musi należeć do katalogu zalogowanego użytkownika.
    const expectedPrefix = `cv-maker/${userId}/gallery/`;

    if (!publicId.startsWith(expectedPrefix)) {
      return res.status(403).json({
        message: "Brak uprawnień do zapisania tego zdjęcia.",
      });
    }

    // Pobieramy rzeczywisty zasób z Cloudinary.
    const resource = await cloudinary.api.resource(publicId, {
      resource_type: "image",
    });

    if (
      resource.public_id !== publicId ||
      !resource.secure_url ||
      resource.resource_type !== "image"
    ) {
      return res.status(400).json({
        message: "Nieprawidłowy zasób zdjęcia w Cloudinary.",
      });
    }

    const format = String(resource.format || "").toLowerCase();

    if (!ALLOWED_FORMATS.includes(format)) {
      return res.status(400).json({
        message: "Niedozwolony format zdjęcia.",
      });
    }

    if (
      !Number.isFinite(resource.bytes) ||
      resource.bytes <= 0 ||
      resource.bytes > MAX_IMAGE_SIZE
    ) {
      return res.status(400).json({
        message: "Zdjęcie przekracza dozwolony rozmiar 2 MB.",
      });
    }
    uploadedPublicId = resource.public_id;
    // Zapisujemy URL i public_id zweryfikowane przez Cloudinary.
    const result = await imageService.addImage(
      userId,
      resource.secure_url,
      resource.public_id,
    );

    return res.status(200).json({
      message: "Zdjęcie zapisane!",
      imageId: result.insertId,
      url: resource.secure_url,
    });
    uploadedPublicId = null;
  } catch (error) {
    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId, {
          resource_type: "image",
          invalidate: true,
        });
      } catch (cleanupError) {
        console.error(
          "Nie udało się usunąć osieroconego zdjęcia z Cloudinary:",
          cleanupError,
        );
      }
    }

    if (error?.http_code === 404) {
      return res.status(404).json({
        message: "Nie znaleziono zdjęcia w Cloudinary.",
      });
    }

    console.error("Upload Image Error:", error);

    return res.status(500).json({
      message: "Błąd zapisywania zdjęcia.",
    });
  }
};

// ============================================================
// POBIERANIE ZDJĘĆ UŻYTKOWNIKA
// ============================================================

export const getUserImages = async (req, res) => {
  try {
    const rows = await imageService.getImageUserId(req.userId);

    return res.status(200).json(rows);
  } catch (error) {
    console.error("Get User Images Error:", error);

    return res.status(500).json({
      message: "Błąd pobierania zdjęć.",
    });
  }
};

// ============================================================
// SPRAWDZANIE POWIĄZAŃ ZDJĘCIA PRZED USUNIĘCIEM
// ============================================================

export const getImageUsage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.userId;

    const usage = await imageService.getImageUsage(imageId, userId);

    if (!usage) {
      return res.status(404).json({
        message: "Nie znaleziono zdjęcia lub brak uprawnień.",
      });
    }

    return res.status(200).json(usage);
  } catch (error) {
    console.error("Get Image Usage Error:", error);

    return res.status(500).json({
      message: "Błąd sprawdzania powiązań zdjęcia.",
    });
  }
};

// ============================================================
// USUWANIE ZDJĘCIA
// ============================================================

export const deleteImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const userId = req.userId;

    // Najpierw usuwamy rekord z MySQL.
    const result = await imageService.deleteImageFromDb(imageId, userId);

    if (!result) {
      return res.status(404).json({
        message: "Nie znaleziono zdjęcia lub brak uprawnień.",
      });
    }

    // Usuwamy właściwy zasób z Cloudinary.
    if (result.cloudinaryPublicId) {
      try {
        const cloudinaryResult = await cloudinary.uploader.destroy(
          result.cloudinaryPublicId,
          {
            resource_type: "image",
            invalidate: true,
          },
        );

        if (
          cloudinaryResult.result !== "ok" &&
          cloudinaryResult.result !== "not found"
        ) {
          console.error(
            "Nieoczekiwany wynik usuwania z Cloudinary:",
            cloudinaryResult,
          );
        }
      } catch (cloudinaryError) {
        console.error(
          "Zdjęcie usunięto z MySQL, ale nie udało się usunąć go z Cloudinary:",
          cloudinaryError,
        );
      }
    } else {
      // Starsze zdjęcia zapisane lokalnie.
      try {
        await deleteFileFromDisk(result.imagePath);
      } catch (fileError) {
        console.error(
          "Zdjęcie usunięto z bazy, ale nie udało się usunąć pliku lokalnego:",
          fileError,
        );
      }
    }

    return res.status(200).json({
      message: "Zdjęcie zostało usunięte.",
      wasDefault: result.wasDefault,
      wasAvatar: result.wasAvatar,
      affectedCVs: result.affectedCVs,
    });
  } catch (error) {
    console.error("Delete Image Error:", error);

    return res.status(500).json({
      message: "Błąd usuwania zdjęcia.",
    });
  }
};