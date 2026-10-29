const CROP_IMAGE_ADJUSTMENT = "Neos\\Media\\Domain\\Model\\Adjustment\\CropImageAdjustment";

const DEFAULT_OFFSET = { x: 0, y: 0 };

export function createThumbnail(image, width, height) {
    const uri = getPreviewUri(image);
    const previewDimensions = getPreviewDimensions(image);
    const originalDimensions = image?.originalDimensions;
    const hasDimensions = [
        previewDimensions.width,
        previewDimensions.height,
        originalDimensions?.width,
        originalDimensions?.height,
    ].every((value) => Number.isFinite(value) && value > 0);

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
