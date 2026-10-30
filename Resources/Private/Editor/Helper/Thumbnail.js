const CROP_IMAGE_ADJUSTMENT = "Neos\\Media\\Domain\\Model\\Adjustment\\CropImageAdjustment";

const DEFAULT_OFFSET = { x: 0, y: 0 };

export function hasImageDimensions(dimensions) {
    return [dimensions?.width, dimensions?.height].every((value) => Number.isFinite(value) && value > 0);
}

export function completeImageDimensions(image, dimensions) {
    if (!hasImageDimensions(dimensions)) {
        throw new Error("Cannot determine image preview dimensions.");
    }
    const previewDimensions = hasImageDimensions(image.previewDimensions) ? image.previewDimensions : dimensions;
    return {
        ...image,
        previewDimensions,
        originalDimensions: hasImageDimensions(image.originalDimensions) ? image.originalDimensions : previewDimensions,
    };
}

export function getThumbnailCustomProperties(thumbnail, maxWidth = Infinity, maxHeight = Infinity) {
    const scale = thumbnail.hasDimensions
        ? Math.min(
              thumbnail.isSvg && Number.isFinite(maxWidth) && Number.isFinite(maxHeight) ? Infinity : 1,
              maxWidth / thumbnail.cropDimensions.width,
              maxHeight / thumbnail.cropDimensions.height,
          )
        : 1;
    const size = (value) => (thumbnail.hasDimensions ? `${parseFloat(value) * scale}px` : value);
    return {
        "--crop-area-width": size(thumbnail.styles.cropArea.width),
        "--crop-area-height": size(thumbnail.styles.cropArea.height),
        "--thumbnail-width": size(thumbnail.styles.thumbnail.width),
        "--thumbnail-height": size(thumbnail.styles.thumbnail.height),
        "--thumbnail-left": size(thumbnail.styles.thumbnail.left),
        "--thumbnail-top": size(thumbnail.styles.thumbnail.top),
    };
}

export function createThumbnail(image, width, height) {
    const uri = getPreviewUri(image);
    const previewDimensions = getPreviewDimensions(image);
    const hasDimensions = hasImageDimensions(previewDimensions) && hasImageDimensions(image?.originalDimensions);

    if (!hasDimensions) {
        const dimensions = { width: "calc(100vw - 100px)", height: "auto" };
        return {
            uri,
            scalingFactor: 1,
            hasDimensions: false,
            dimensions: previewDimensions,
            cropDimensions: previewDimensions,
            styles: {
                thumbnail: { ...dimensions, left: "0px", top: "0px" },
                cropArea: dimensions,
            },
        };
    }

    const scalingFactor = getScalingFactor(image, width, height);
    const dimensions = scaleDimensions(previewDimensions, scalingFactor);
    const cropDimensions = scaleDimensions(
        getPreviewCropAdjustment(image) ?? getPreviewDimensions(image),
        scalingFactor,
    );
    const styles = getStyles(image, scalingFactor);

    return {
        uri,
        isSvg: /(?:\.svg(?:[?#]|$)|^data:image\/svg\+xml[;,])/i.test(uri ?? ""),
        scalingFactor,
        hasDimensions: true,
        dimensions,
        cropDimensions,
        styles,
    };
}

// Multiplies all numeric values of an object by the given factor
function scaleValues(object, factor) {
    return Object.fromEntries(
        Object.entries(object).map(([key, value]) => [key, typeof value === "number" ? value * factor : value]),
    );
}

function getPreviewUri(image) {
    return image?.previewImageResourceUri;
}

function getPreviewScalingFactor(image) {
    return image?.previewDimensions?.width / image?.originalDimensions?.width;
}

function getPreviewDimensions(image) {
    return {
        width: image?.previewDimensions?.width,
        height: image?.previewDimensions?.height,
    };
}

function getCropAdjustment(image) {
    return image?.object?.adjustments?.[CROP_IMAGE_ADJUSTMENT] ?? null;
}

function getPreviewCropAdjustment(image) {
    const crop = getCropAdjustment(image);
    return crop ? scaleValues(crop, getPreviewScalingFactor(image)) : null;
}

function getScalingFactor(image, targetWidth, targetHeight) {
    const { width, height } = getPreviewCropAdjustment(image) ?? getPreviewDimensions(image);
    return Math.min(targetWidth / width, targetHeight / height);
}

function scaleDimensions({ width, height }, scalingFactor) {
    return {
        width: width * scalingFactor,
        height: height * scalingFactor,
    };
}

function getStyles(image, scalingFactor) {
    const dimensions = scaleDimensions(getPreviewDimensions(image), scalingFactor);
    const cropDimensions = scaleDimensions(
        getPreviewCropAdjustment(image) ?? getPreviewDimensions(image),
        scalingFactor,
    );
    const { x, y } = getPreviewCropAdjustment(image) ?? DEFAULT_OFFSET;

    return {
        thumbnail: {
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            left: `-${x * scalingFactor}px`,
            top: `-${y * scalingFactor}px`,
        },
        cropArea: {
            width: `${cropDimensions.width}px`,
            height: `${cropDimensions.height}px`,
        },
    };
}
