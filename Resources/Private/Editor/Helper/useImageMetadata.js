import { useEffect, useState } from "react";
import backend from "@neos-project/neos-ui-backend-connector";
import { completeImageDimensions, hasImageDimensions } from "./Thumbnail";

export function useImageMetadata(imageIdentity) {
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!imageIdentity) {
            return;
        }

        let cancelled = false;
        let preview;
        const { loadImageMetadata } = backend.get().endpoints;
        loadImageMetadata(imageIdentity)
            .then(async (image) => {
                if (
                    cancelled ||
                    (hasImageDimensions(image.previewDimensions) && hasImageDimensions(image.originalDimensions))
                ) {
                    return image;
                }

                const dimensions = await new Promise((resolve, reject) => {
                    preview = new Image();
                    preview.onload = () => resolve({ width: preview.naturalWidth, height: preview.naturalHeight });
                    preview.onerror = () => reject(new Error("Cannot load image preview dimensions."));
                    preview.src = image.previewImageResourceUri;
                });
                return completeImageDimensions(image, dimensions);
            })
            .then(
                (image) => {
                    if (!cancelled) {
                        setResult({ identity: imageIdentity, image });
                    }
                },
                (error) => {
                    if (!cancelled) {
                        setResult({ identity: imageIdentity, error });
                    }
                },
            );

        return () => {
            cancelled = true;
            if (preview) {
                preview.onload = null;
                preview.onerror = null;
            }
        };
    }, [imageIdentity]);

    if (!imageIdentity || result?.identity !== imageIdentity) {
        return null;
    }
    if (result.error) {
        throw result.error;
    }
    return result.image;
}
